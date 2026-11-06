import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { recalculateVehicleRecord } from '@/lib/calculationEngine';
import { createRecordSnapshot } from '@/lib/versioning';
import { softDeleteRecord } from '@/lib/softDelete';
import { logAudit } from '@/lib/audit';

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
      include: { billingLines: true, adjustments: true },
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
      for (const bl of billingLines) {
        if (bl.id) {
          const km = bl.kmOrTrips !== null && bl.kmOrTrips !== undefined ? parseFloat(bl.kmOrTrips) : null;
          const rate = bl.applicableRate !== null && bl.applicableRate !== undefined ? parseFloat(bl.applicableRate) : null;
          const amt = km !== null && rate !== null ? km * rate : (parseFloat(bl.billingAmount) || 0);

          await prisma.billingLine.update({
            where: { id: bl.id },
            data: {
              companyName: bl.companyName,
              kmOrTrips: km,
              applicableRate: rate,
              billingAmount: amt,
            },
          });
        } else if (bl.companyName) {
          // New billing line
          const km = parseFloat(bl.kmOrTrips) || 0;
          const rate = parseFloat(bl.applicableRate) || 0;
          await prisma.billingLine.create({
            data: {
              recordId: params.id,
              companyName: bl.companyName,
              kmOrTrips: km,
              applicableRate: rate,
              billingAmount: km * rate,
            },
          });
        }
      }
    }

    // 4. Update adjustments if provided
    if (Array.isArray(adjustments)) {
      for (const adj of adjustments) {
        if (adj.id) {
          const amt = parseFloat(adj.amount) || 0;
          await prisma.financialAdjustment.update({
            where: { id: adj.id },
            data: {
              category: adj.category,
              amount: amt,
              adjustmentType: amt < 0 ? 'DEDUCTION' : 'ADDITION',
              notes: adj.notes,
            },
          });
        } else if (adj.category) {
          // New adjustment
          const amt = parseFloat(adj.amount) || 0;
          await prisma.financialAdjustment.create({
            data: {
              recordId: params.id,
              category: adj.category,
              amount: amt,
              adjustmentType: amt < 0 ? 'DEDUCTION' : 'ADDITION',
              notes: adj.notes,
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

