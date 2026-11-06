import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { recalculateVehicleRecord } from '@/lib/calculationEngine';
import { createRecordSnapshot } from '@/lib/versioning';
import { softDeleteRecord } from '@/lib/softDelete';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const record = await prisma.vehicleMonthlyRecord.findUnique({
    where: { id: params.id },
    include: {
      vehicle: true,
      period: true,
      billingLines: { where: { isDeleted: false }, orderBy: { lineOrder: 'asc' } },
      adjustments: { where: { isDeleted: false }, orderBy: { sourceRow: 'asc' } },
      payments: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } },
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: { createdBy: { select: { name: true, email: true } } },
      },
    },
  });

  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  return NextResponse.json({ record });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      paymentStatus,
      paymentDate,
      bankDetails,
      bankRemarks,
      remarks,
      changeReason,
      billingLines,
      adjustments,
    } = body;

    const prev = await prisma.vehicleMonthlyRecord.findUnique({
      where: { id: params.id },
      include: {
        billingLines: { where: { isDeleted: false } },
        adjustments: { where: { isDeleted: false } },
      },
    });
    if (!prev) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    // 1. Create a snapshot before applying changes
    await createRecordSnapshot(params.id, changeReason || 'Record updated', user.email);

    // 2. Update scalar fields
    await prisma.vehicleMonthlyRecord.update({
      where: { id: params.id },
      data: {
        paymentStatus: paymentStatus !== undefined ? paymentStatus : prev.paymentStatus,
        paymentDate: paymentDate !== undefined ? paymentDate : prev.paymentDate,
        bankDetails: bankDetails !== undefined ? bankDetails : prev.bankDetails,
        bankRemarks: bankRemarks !== undefined ? bankRemarks : prev.bankRemarks,
        remarks: remarks !== undefined ? remarks : prev.remarks,
      },
    });

    // 3. Update billing lines if provided
    if (Array.isArray(billingLines)) {
      // Collect valid existing IDs that remain in the client payload
      const activeBillingIds = billingLines
        .filter((bl) => bl.id && typeof bl.id === 'string' && bl.id.trim() !== '')
        .map((bl) => bl.id.trim());

      // Soft-delete any existing billing lines that were removed by the user in the UI
      await prisma.billingLine.updateMany({
        where: {
          recordId: params.id,
          id: { notIn: activeBillingIds },
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      // Update remaining or create new billing lines
      for (let i = 0; i < billingLines.length; i++) {
        const bl = billingLines[i];
        const km = bl.kmOrTrips !== null && bl.kmOrTrips !== undefined && bl.kmOrTrips !== '' ? parseFloat(bl.kmOrTrips) : null;
        const rate = bl.applicableRate !== null && bl.applicableRate !== undefined && bl.applicableRate !== '' ? parseFloat(bl.applicableRate) : null;
        const amt = km !== null && rate !== null ? km * rate : (parseFloat(bl.billingAmount) || 0);

        if (bl.id && typeof bl.id === 'string' && bl.id.trim() !== '') {
          await prisma.billingLine.update({
            where: { id: bl.id },
            data: {
              companyName: bl.companyName || '',
              kmOrTrips: km,
              applicableRate: rate,
              billingAmount: amt,
              lineOrder: i + 1,
              isDeleted: false,
            },
          });
        } else if (bl.companyName) {
          await prisma.billingLine.create({
            data: {
              recordId: params.id,
              companyName: bl.companyName,
              kmOrTrips: km,
              applicableRate: rate,
              billingAmount: amt,
              lineOrder: i + 1,
            },
          });
        }
      }
    }

    // 4. Update adjustments if provided
    if (Array.isArray(adjustments)) {
      // Collect valid existing IDs that remain in the client payload
      const activeAdjustmentIds = adjustments
        .filter((adj) => adj.id && typeof adj.id === 'string' && adj.id.trim() !== '')
        .map((adj) => adj.id.trim());

      // Soft-delete any existing adjustments that were deleted by the user in the UI
      await prisma.financialAdjustment.updateMany({
        where: {
          recordId: params.id,
          id: { notIn: activeAdjustmentIds },
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      // Update remaining or create new adjustments
      for (let i = 0; i < adjustments.length; i++) {
        const adj = adjustments[i];
        if (!adj.category || adj.category.trim() === '') continue;

        // Determine adjustmentType & signed amount:
        // DEDUCTION: amount is negative in DB (-Math.abs)
        // ADDITION: amount is positive in DB (+Math.abs)
        let isDeduction = true;
        if (adj.adjustmentType) {
          isDeduction = adj.adjustmentType === 'DEDUCTION';
        } else {
          const cat = (adj.category || '').toLowerCase();
          if (cat.includes('bonus') || cat.includes('incentive') || cat.includes('addition') || cat.includes('reimbursement')) {
            isDeduction = false;
          } else {
            isDeduction = true;
          }
        }

        const rawVal = Math.abs(parseFloat(adj.amount) || 0);
        const signedAmount = isDeduction ? -rawVal : rawVal;
        const finalType = isDeduction ? 'DEDUCTION' : 'ADDITION';

        if (adj.id && typeof adj.id === 'string' && adj.id.trim() !== '') {
          await prisma.financialAdjustment.update({
            where: { id: adj.id },
            data: {
              category: adj.category.trim(),
              amount: signedAmount,
              adjustmentType: finalType,
              notes: adj.notes || null,
              isDeleted: false,
            },
          });
        } else {
          await prisma.financialAdjustment.create({
            data: {
              recordId: params.id,
              category: adj.category.trim(),
              amount: signedAmount,
              adjustmentType: finalType,
              notes: adj.notes || null,
              sourceRow: i + 1,
            },
          });
        }
      }
    }

    // 5. Recalculate totals
    await recalculateVehicleRecord(params.id);

    // 6. Log audit
    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'MONTHLY_FINANCE',
      entityType: 'VehicleMonthlyRecord',
      entityId: params.id,
      previousState: { status: prev.paymentStatus, gross: prev.grossBilling, net: prev.netPayable },
      newState: { status: paymentStatus, reason: changeReason },
      reason: changeReason || 'Updated financial record',
    });

    const refreshed = await prisma.vehicleMonthlyRecord.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
        period: true,
        billingLines: { where: { isDeleted: false } },
        adjustments: { where: { isDeleted: false } },
        payments: { where: { isDeleted: false } },
      },
    });

    return NextResponse.json({ success: true, record: refreshed });
  } catch (err: any) {
    console.error('Update record error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'DELETE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete records.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const reason = searchParams.get('reason') || 'User deleted record';

  try {
    const binItem = await softDeleteRecord({
      entityType: 'VehicleMonthlyRecord',
      entityId: params.id,
      userEmail: user.email,
      reason,
    });

    return NextResponse.json({ success: true, message: 'Record moved to Recycle Bin', binItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete record' }, { status: 500 });
  }
}
