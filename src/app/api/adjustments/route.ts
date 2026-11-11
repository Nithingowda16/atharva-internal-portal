import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { recalculateVehicleRecord, recalculatePeriodTotals } from '@/lib/calculationEngine';
import { createRecordSnapshot } from '@/lib/versioning';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/adjustments – List financial adjustments with filtering & metadata
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get('periodId');
  const category = searchParams.get('category');
  const adjustmentType = searchParams.get('type');
  const vehicleId = searchParams.get('vehicleId');
  const search = searchParams.get('search')?.trim() || '';

  try {
    const where: any = {
      isDeleted: false,
      record: {
        isDeleted: false,
      },
    };

    if (periodId && periodId !== 'ALL') {
      where.record.periodId = periodId;
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (adjustmentType && adjustmentType !== 'ALL') {
      where.adjustmentType = adjustmentType;
    }

    if (vehicleId && vehicleId !== 'ALL') {
      where.record.vehicleId = vehicleId;
    }

    if (search) {
      where.OR = [
        { category: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { formulaString: { contains: search, mode: 'insensitive' } },
        { record: { vehicle: { registrationNumber: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [adjustments, distinctCategories, periods, vehicles] = await Promise.all([
      prisma.financialAdjustment.findMany({
        where,
        include: {
          record: {
            include: {
              vehicle: {
                include: {
                  assignments: {
                    where: { isCurrent: true },
                    include: { driver: true },
                    take: 1,
                  },
                },
              },
              period: true,
            },
          },
        },
        orderBy: [
          { record: { period: { startDate: 'desc' } } },
          { record: { sectionIndex: 'asc' } },
          { id: 'asc' },
        ],
      }),
      prisma.financialAdjustment.findMany({
        where: { isDeleted: false, record: { isDeleted: false } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      prisma.financialPeriod.findMany({
        where: { isDeleted: false },
        select: { id: true, periodName: true, monthCode: true, financialYear: true },
        orderBy: { startDate: 'desc' },
      }),
      prisma.vehicle.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          registrationNumber: true,
          vehicleType: true,
          ownerName: true,
          assignments: {
            where: { isCurrent: true },
            select: { driver: { select: { id: true, name: true, phone: true } } },
            take: 1,
          },
        },
        orderBy: { registrationNumber: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      adjustments,
      categories: distinctCategories.map((c) => c.category).filter(Boolean),
      periods,
      vehicles,
    });
  } catch (err: any) {
    console.error('Error fetching adjustments:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch adjustments' }, { status: 500 });
  }
}

// POST /api/adjustments – Add a new adjustment or deduction
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Super Admin authority required to add adjustments' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      recordId,
      periodId,
      vehicleId,
      registrationNumber,
      category,
      adjustmentType = 'DEDUCTION',
      amount,
      notes,
      formulaString,
    } = body;

    if (!category || !category.trim()) {
      return NextResponse.json({ error: 'Adjustment category is required' }, { status: 400 });
    }

    const parsedAmount = Math.abs(parseFloat(amount) || 0);
    if (parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    const isDeduction = adjustmentType === 'DEDUCTION';
    const signedAmount = isDeduction ? -parsedAmount : parsedAmount;

    let targetRecord: any = null;

    // 1. Target record resolution
    if (recordId) {
      targetRecord = await prisma.vehicleMonthlyRecord.findUnique({
        where: { id: recordId },
        include: { vehicle: true, period: true },
      });
    } else if (periodId && vehicleId) {
      targetRecord = await prisma.vehicleMonthlyRecord.findFirst({
        where: {
          periodId,
          vehicleId,
          isDeleted: false,
        },
        include: { vehicle: true, period: true },
      });

      // If not existing for this vehicle in this period, create or assign section
      if (!targetRecord) {
        const lastSection = await prisma.vehicleMonthlyRecord.findFirst({
          where: { periodId },
          orderBy: { sectionIndex: 'desc' },
          select: { sectionIndex: true },
        });
        const nextSection = (lastSection?.sectionIndex || 0) + 1;

        targetRecord = await prisma.vehicleMonthlyRecord.create({
          data: {
            periodId,
            vehicleId,
            sectionIndex: nextSection,
            paymentStatus: 'Draft',
          },
          include: { vehicle: true, period: true },
        });
      }
    } else if (periodId && registrationNumber) {
      const cleanReg = registrationNumber.trim().toUpperCase();
      let veh = await prisma.vehicle.findFirst({
        where: {
          registrationNumber: { equals: cleanReg, mode: 'insensitive' },
          isDeleted: false,
        },
      });

      if (!veh) {
        veh = await prisma.vehicle.create({
          data: {
            registrationNumber: cleanReg,
            vehicleType: 'Vehicle - 4-Seater',
            status: 'ACTIVE',
          },
        });
      }

      targetRecord = await prisma.vehicleMonthlyRecord.findFirst({
        where: {
          periodId,
          vehicleId: veh.id,
          isDeleted: false,
        },
        include: { vehicle: true, period: true },
      });

      if (!targetRecord) {
        const lastSection = await prisma.vehicleMonthlyRecord.findFirst({
          where: { periodId },
          orderBy: { sectionIndex: 'desc' },
          select: { sectionIndex: true },
        });
        const nextSection = (lastSection?.sectionIndex || 0) + 1;

        targetRecord = await prisma.vehicleMonthlyRecord.create({
          data: {
            periodId,
            vehicleId: veh.id,
            sectionIndex: nextSection,
            paymentStatus: 'Draft',
          },
          include: { vehicle: true, period: true },
        });
      }
    }

    if (!targetRecord) {
      return NextResponse.json(
        { error: 'Could not resolve or create target monthly vehicle record for this adjustment.' },
        { status: 400 }
      );
    }

    // 2. Snapshot parent record before mutation
    await createRecordSnapshot(
      targetRecord.id,
      `Added adjustment: ${category} (₹${parsedAmount})`,
      user.email
    );

    // 3. Create the adjustment
    const newAdjustment = await prisma.financialAdjustment.create({
      data: {
        recordId: targetRecord.id,
        category: category.trim(),
        adjustmentType: isDeduction ? 'DEDUCTION' : 'ADDITION',
        amount: signedAmount,
        notes: notes?.trim() || null,
        formulaString: formulaString?.trim() || null,
      },
      include: {
        record: {
          include: {
            vehicle: true,
            period: true,
          },
        },
      },
    });

    // 4. Recalculate record deductions, net payable, and period totals
    await recalculateVehicleRecord(targetRecord.id);
    await recalculatePeriodTotals(targetRecord.periodId);

    // 5. Audit log
    await logAudit({
      userEmail: user.email,
      action: 'CREATE',
      module: 'ADJUSTMENTS',
      entityType: 'FinancialAdjustment',
      entityId: newAdjustment.id,
      newState: {
        id: newAdjustment.id,
        category: newAdjustment.category,
        adjustmentType: newAdjustment.adjustmentType,
        amount: newAdjustment.amount,
        vehicle: targetRecord.vehicle.registrationNumber,
        period: targetRecord.period.periodName,
        notes: newAdjustment.notes,
      },
      reason: `Added ${isDeduction ? 'deduction' : 'addition'} for ${targetRecord.vehicle.registrationNumber}: ${category.trim()}`,
    });

    return NextResponse.json({
      success: true,
      adjustment: newAdjustment,
      message: `Adjustment "${category.trim()}" successfully recorded and monthly totals recalculated.`,
    });
  } catch (err: any) {
    console.error('Error creating adjustment:', err);
    return NextResponse.json({ error: err.message || 'Failed to create adjustment' }, { status: 500 });
  }
}

// PATCH /api/adjustments – Edit an existing adjustment
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Super Admin authority required to edit adjustments' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, category, adjustmentType = 'DEDUCTION', amount, notes, formulaString } = body;

    if (!id) {
      return NextResponse.json({ error: 'Adjustment ID is required' }, { status: 400 });
    }

    const existing = await prisma.financialAdjustment.findUnique({
      where: { id },
      include: {
        record: {
          include: { vehicle: true, period: true },
        },
      },
    });

    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: 'Adjustment not found or has been deleted' }, { status: 404 });
    }

    const parsedAmount = Math.abs(parseFloat(amount) || 0);
    if (parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    const isDeduction = adjustmentType === 'DEDUCTION';
    const signedAmount = isDeduction ? -parsedAmount : parsedAmount;

    // Snapshot before edit
    await createRecordSnapshot(
      existing.recordId,
      `Edited adjustment: ${existing.category} -> ${category || existing.category}`,
      user.email
    );

    const updated = await prisma.financialAdjustment.update({
      where: { id },
      data: {
        category: category !== undefined ? category.trim() : existing.category,
        adjustmentType: isDeduction ? 'DEDUCTION' : 'ADDITION',
        amount: signedAmount,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
        formulaString: formulaString !== undefined ? formulaString?.trim() || null : existing.formulaString,
      },
      include: {
        record: {
          include: { vehicle: true, period: true },
        },
      },
    });

    // Recalculate
    await recalculateVehicleRecord(existing.recordId);
    await recalculatePeriodTotals(existing.record.periodId);

    // Audit log
    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'ADJUSTMENTS',
      entityType: 'FinancialAdjustment',
      entityId: id,
      previousState: {
        category: existing.category,
        adjustmentType: existing.adjustmentType,
        amount: existing.amount,
        notes: existing.notes,
      },
      newState: {
        category: updated.category,
        adjustmentType: updated.adjustmentType,
        amount: updated.amount,
        notes: updated.notes,
      },
      reason: `Updated adjustment parameters for ${existing.record.vehicle.registrationNumber}`,
    });

    return NextResponse.json({
      success: true,
      adjustment: updated,
      message: 'Adjustment updated and financial totals recalculated successfully.',
    });
  } catch (err: any) {
    console.error('Error updating adjustment:', err);
    return NextResponse.json({ error: err.message || 'Failed to update adjustment' }, { status: 500 });
  }
}

// DELETE /api/adjustments – Delete single adjustment or batch delete selected adjustments
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkPermission(user, 'DELETE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Super Admin authority required to delete adjustments' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    const queryReason = searchParams.get('reason');

    let idsToDelete: string[] = [];
    let deleteReason = queryReason || 'Adjustment deleted by Super Admin';

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
        if (body.reason) {
          deleteReason = body.reason;
        }
      } catch (e) {
        // Body was empty or not json
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'No adjustment ID(s) provided for deletion' }, { status: 400 });
    }

    const targetAdjustments = await prisma.financialAdjustment.findMany({
      where: {
        id: { in: idsToDelete },
        isDeleted: false,
      },
      include: {
        record: true,
      },
    });

    if (targetAdjustments.length === 0) {
      return NextResponse.json({ error: 'No active adjustments found for the specified ID(s)' }, { status: 404 });
    }

    const uniqueRecordIds = Array.from(new Set(targetAdjustments.map((a) => a.recordId)));
    const uniquePeriodIds = Array.from(new Set(targetAdjustments.map((a) => a.record.periodId)));

    // Soft delete
    await prisma.financialAdjustment.updateMany({
      where: { id: { in: targetAdjustments.map((a) => a.id) } },
      data: { isDeleted: true },
    });

    // Recalculate parent records and periods
    for (const recordId of uniqueRecordIds) {
      await recalculateVehicleRecord(recordId);
      await createRecordSnapshot(recordId, `Deleted ${targetAdjustments.length} adjustment(s)`, user.email);
    }

    for (const periodId of uniquePeriodIds) {
      await recalculatePeriodTotals(periodId);
    }

    // Audit log
    await logAudit({
      userEmail: user.email,
      action: 'DELETE',
      module: 'ADJUSTMENTS',
      entityType: 'FinancialAdjustment',
      entityId: idsToDelete.join(', '),
      previousState: {
        count: targetAdjustments.length,
        items: targetAdjustments.map((a) => ({ id: a.id, category: a.category, amount: a.amount })),
      },
      reason: deleteReason,
    });

    return NextResponse.json({
      success: true,
      deletedCount: targetAdjustments.length,
      message: `Successfully deleted ${targetAdjustments.length} adjustment(s) and recalculated statements.`,
    });
  } catch (err: any) {
    console.error('Error deleting adjustment(s):', err);
    return NextResponse.json({ error: err.message || 'Failed to delete adjustment(s)' }, { status: 500 });
  }
}

