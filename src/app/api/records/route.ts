import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { recalculateVehicleRecord, recalculatePeriodTotals } from '@/lib/calculationEngine';
import { createRecordSnapshot } from '@/lib/versioning';
import { softDeleteRecord } from '@/lib/softDelete';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get('periodId');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const hasRefErrors = searchParams.get('hasRefErrors');

  const where: any = { isDeleted: false };
  if (periodId && periodId !== 'ALL') where.periodId = periodId;
  if (status && status !== 'ALL') where.paymentStatus = status;
  if (hasRefErrors === 'true') where.hasRefErrors = true;

  if (search) {
    where.OR = [
      { vehicle: { registrationNumber: { contains: search } } },
      { remarks: { contains: search } },
      { bankDetails: { contains: search } },
    ];
  }

  const records = await prisma.vehicleMonthlyRecord.findMany({
    where,
    include: {
      vehicle: {
        include: {
          assignments: {
            where: { isCurrent: true },
            include: { driver: true },
          },
        },
      },
      period: true,
      billingLines: { where: { isDeleted: false }, orderBy: { lineOrder: 'asc' } },
      adjustments: { where: { isDeleted: false }, orderBy: { sourceRow: 'asc' } },
      payments: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } },
      _count: { select: { versions: true } },
    },
    orderBy: [{ period: { startDate: 'desc' } }, { sectionIndex: 'asc' }],
  });

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { periodId, registrationNumber, vehicleType, billingLines, adjustments, remarks } = body;

    if (!periodId || !registrationNumber) {
      return NextResponse.json({ error: 'Period and registration number are required' }, { status: 400 });
    }

    // Find or create vehicle master
    let vehicle = await prisma.vehicle.findFirst({
      where: { registrationNumber: registrationNumber.trim().toUpperCase() },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          registrationNumber: registrationNumber.trim().toUpperCase(),
          vehicleType: vehicleType || 'Vehicle - 4-Seater',
          isActive: true,
        },
      });
    }

    // Get max section index for this period
    const lastRec = await prisma.vehicleMonthlyRecord.findFirst({
      where: { periodId },
      orderBy: { sectionIndex: 'desc' },
    });
    const nextSection = (lastRec?.sectionIndex || 0) + 1;

    const record = await prisma.vehicleMonthlyRecord.create({
      data: {
        periodId,
        vehicleId: vehicle.id,
        sectionIndex: nextSection,
        calcHeader: `Payment Calculation - Sec ${nextSection}`,
        paymentStatus: 'Draft',
        remarks: remarks || null,
      },
    });

    if (Array.isArray(billingLines)) {
      for (let i = 0; i < billingLines.length; i++) {
        const bl = billingLines[i];
        if (bl.companyName) {
          const km = parseFloat(bl.kmOrTrips) || 0;
          const rate = parseFloat(bl.applicableRate) || 0;
          await prisma.billingLine.create({
            data: {
              recordId: record.id,
              companyName: bl.companyName,
              kmOrTrips: km,
              applicableRate: rate,
              billingAmount: km * rate,
              lineOrder: i + 1,
            },
          });
        }
      }
    }

    if (Array.isArray(adjustments)) {
      for (let i = 0; i < adjustments.length; i++) {
        const adj = adjustments[i];
        if (adj.category && adj.category.trim() !== '') {
          const isDeduction = adj.adjustmentType ? adj.adjustmentType === 'DEDUCTION' : true;
          const rawAmt = Math.abs(parseFloat(adj.amount) || 0);
          const amt = isDeduction ? -rawAmt : rawAmt;
          await prisma.financialAdjustment.create({
            data: {
              recordId: record.id,
              category: adj.category.trim(),
              adjustmentType: isDeduction ? 'DEDUCTION' : 'ADDITION',
              amount: amt,
              notes: adj.notes || null,
              sourceRow: i + 1,
            },
          });
        }
      }
    }

    await recalculateVehicleRecord(record.id);
    await createRecordSnapshot(record.id, 'Record created', user.email);

    await logAudit({
      userEmail: user.email,
      action: 'CREATE',
      module: 'MONTHLY_FINANCE',
      entityType: 'VehicleMonthlyRecord',
      entityId: record.id,
      newState: { registrationNumber: vehicle.registrationNumber, section: nextSection },
      reason: 'Added new vehicle record to monthly finance',
    });

    const refreshed = await prisma.vehicleMonthlyRecord.findUnique({
      where: { id: record.id },
      include: {
        vehicle: {
        include: {
          assignments: {
            where: { isCurrent: true },
            include: { driver: true },
          },
        },
      },
        period: true,
        billingLines: { where: { isDeleted: false } },
        adjustments: { where: { isDeleted: false } },
        payments: { where: { isDeleted: false } },
      },
    });

    return NextResponse.json({ success: true, record: refreshed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create record' }, { status: 500 });
  }
}

// DELETE /api/records – Single or bulk soft delete vehicle monthly records
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'DELETE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete records.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    const queryReason = searchParams.get('reason');

    let idsToDelete: string[] = [];
    let deleteReason = queryReason || 'Super admin deletion';

    if (queryId) {
      idsToDelete = [queryId];
    } else {
      try {
        const body = await req.json();
        if (Array.isArray(body.ids)) {
          idsToDelete = body.ids;
        } else if (body.id) {
          idsToDelete = [body.id];
        }
        if (body.reason) deleteReason = body.reason;
      } catch (e) {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'No record ID(s) provided for deletion' }, { status: 400 });
    }

    const records = await prisma.vehicleMonthlyRecord.findMany({
      where: { id: { in: idsToDelete }, isDeleted: false },
      select: { id: true, periodId: true, vehicle: { select: { registrationNumber: true } } },
    });

    if (records.length === 0) {
      return NextResponse.json({ error: 'No active records found for deletion' }, { status: 404 });
    }

    const uniquePeriodIds = Array.from(new Set(records.map((r) => r.periodId)));

    for (const r of records) {
      await softDeleteRecord({
        entityType: 'VehicleMonthlyRecord',
        entityId: r.id,
        userEmail: user.email,
        reason: deleteReason,
      });
    }

    for (const periodId of uniquePeriodIds) {
      await recalculatePeriodTotals(periodId);
    }

    return NextResponse.json({
      success: true,
      deletedCount: records.length,
      message: `Successfully moved ${records.length} record(s) to Recycle Bin and updated period totals`,
    });
  } catch (err: any) {
    console.error('Delete records error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete records' }, { status: 500 });
  }
}

