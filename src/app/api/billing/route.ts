import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { recalculateVehicleRecord, recalculatePeriodTotals } from '@/lib/calculationEngine';
import { createRecordSnapshot } from '@/lib/versioning';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/billing – List billing transactions with filtering
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get('periodId');
  const company = searchParams.get('company');
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

    if (company && company !== 'ALL') {
      where.companyName = company;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { record: { vehicle: { registrationNumber: { contains: search, mode: 'insensitive' } } } },
        { amountFormula: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [lines, allCompanies, periods] = await Promise.all([
      prisma.billingLine.findMany({
        where,
        include: {
          record: {
            include: {
              vehicle: true,
              period: true,
            },
          },
        },
        orderBy: [
          { record: { period: { startDate: 'desc' } } },
          { record: { sectionIndex: 'asc' } },
          { lineOrder: 'asc' },
        ],
      }),
      prisma.billingLine.findMany({
        where: { isDeleted: false, record: { isDeleted: false } },
        select: { companyName: true },
        distinct: ['companyName'],
        orderBy: { companyName: 'asc' },
      }),
      prisma.financialPeriod.findMany({
        where: { isDeleted: false },
        select: { id: true, periodName: true, monthCode: true, financialYear: true },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      lines,
      companies: allCompanies.map((c) => c.companyName).filter(Boolean),
      periods,
    });
  } catch (err: any) {
    console.error('Error fetching billing lines:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch billing lines' }, { status: 500 });
  }
}

// POST /api/billing – Create a new billing transaction row
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Super Admin authority required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      periodId,
      registrationNumber,
      companyName,
      kmOrTrips,
      applicableRate,
      billingAmount,
      amountFormula,
      sectionIndex,
    } = body;

    if (!periodId) return NextResponse.json({ error: 'Period is required' }, { status: 400 });
    if (!registrationNumber || !registrationNumber.trim()) {
      return NextResponse.json({ error: 'Vehicle registration number is required' }, { status: 400 });
    }
    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: 'Client company name is required' }, { status: 400 });
    }

    const cleanReg = registrationNumber.trim().toUpperCase();

    // Find or create vehicle master
    let vehicle = await prisma.vehicle.findFirst({
      where: { registrationNumber: { equals: cleanReg, mode: 'insensitive' }, isDeleted: false },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          registrationNumber: cleanReg,
          vehicleType: 'Vehicle - 4-Seater',
          status: 'ACTIVE',
        },
      });
    }

    // Find or create vehicle monthly record
    let targetRecord = await prisma.vehicleMonthlyRecord.findFirst({
      where: { periodId, vehicleId: vehicle.id, isDeleted: false },
    });

    if (!targetRecord) {
      const secIdx = sectionIndex ? parseInt(String(sectionIndex), 10) : null;
      let assignedSec = secIdx;
      if (!assignedSec) {
        const lastRec = await prisma.vehicleMonthlyRecord.findFirst({
          where: { periodId },
          orderBy: { sectionIndex: 'desc' },
          select: { sectionIndex: true },
        });
        assignedSec = (lastRec?.sectionIndex || 0) + 1;
      }

      targetRecord = await prisma.vehicleMonthlyRecord.create({
        data: {
          periodId,
          vehicleId: vehicle.id,
          sectionIndex: assignedSec,
          paymentStatus: 'Draft',
        },
      });
    }

    // Determine line order
    const lastLine = await prisma.billingLine.findFirst({
      where: { recordId: targetRecord.id },
      orderBy: { lineOrder: 'desc' },
      select: { lineOrder: true },
    });
    const nextLineOrder = (lastLine?.lineOrder || 0) + 1;

    const km = kmOrTrips !== null && kmOrTrips !== undefined && kmOrTrips !== '' ? parseFloat(kmOrTrips) : null;
    const rate = applicableRate !== null && applicableRate !== undefined && applicableRate !== '' ? parseFloat(applicableRate) : null;
    let amt = parseFloat(billingAmount);
    if (isNaN(amt)) {
      amt = km !== null && rate !== null ? km * rate : 0;
    }

    const newLine = await prisma.billingLine.create({
      data: {
        recordId: targetRecord.id,
        companyName: companyName.trim(),
        kmOrTrips: km,
        applicableRate: rate,
        billingAmount: amt,
        amountFormula: amountFormula?.trim() || (km && rate ? `${km} × ₹${rate}` : null),
        lineOrder: nextLineOrder,
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

    // Recalculate parent vehicle record and period totals
    await recalculateVehicleRecord(targetRecord.id);
    await recalculatePeriodTotals(targetRecord.periodId);

    // Snapshot & Audit
    await createRecordSnapshot(targetRecord.id, `Added billing line for ${companyName.trim()}`, user.email);
    await logAudit({
      userEmail: user.email,
      action: 'CREATE',
      module: 'BILLING',
      entityType: 'BillingLine',
      entityId: newLine.id,
      newState: {
        companyName: newLine.companyName,
        billingAmount: newLine.billingAmount,
        vehicle: cleanReg,
        periodId,
      },
      reason: `Added billing line for ${cleanReg} under ${companyName.trim()}`,
    });

    return NextResponse.json({
      success: true,
      line: newLine,
      message: 'Billing transaction row created and monthly statement recalculated',
    });
  } catch (err: any) {
    console.error('Error creating billing line:', err);
    return NextResponse.json({ error: err.message || 'Failed to create billing line' }, { status: 500 });
  }
}

// PATCH /api/billing – Edit a single billing line record
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Super Admin authority required to edit billing lines' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      id,
      companyName,
      kmOrTrips,
      applicableRate,
      billingAmount,
      amountFormula,
      sectionIndex,
      registrationNumber,
      periodId,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Billing line ID is required' }, { status: 400 });
    }

    const existingLine = await prisma.billingLine.findUnique({
      where: { id },
      include: {
        record: {
          include: {
            vehicle: true,
            period: true,
          },
        },
      },
    });

    if (!existingLine || existingLine.isDeleted) {
      return NextResponse.json({ error: 'Billing line not found or has been deleted' }, { status: 404 });
    }

    const oldRecord = existingLine.record;
    let targetRecordId = oldRecord.id;
    let oldPeriodIdToRecalc: string | null = null;

    // 1. If registrationNumber changed, find or create target vehicle
    let targetVehicleId = oldRecord.vehicleId;
    if (registrationNumber && registrationNumber.trim().toUpperCase() !== oldRecord.vehicle.registrationNumber) {
      const cleanReg = registrationNumber.trim().toUpperCase();
      let vehicle = await prisma.vehicle.findFirst({
        where: { registrationNumber: cleanReg, isDeleted: false },
      });
      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            registrationNumber: cleanReg,
            vehicleType: oldRecord.vehicle.vehicleType || 'Vehicle - 4-Seater',
            status: 'ACTIVE',
          },
        });
      }
      targetVehicleId = vehicle.id;
    }

    // 2. If periodId or vehicle changed, check if we need to move or update the record
    const targetPeriodId = periodId || oldRecord.periodId;
    const isPeriodChanged = targetPeriodId !== oldRecord.periodId;
    const isVehicleChanged = targetVehicleId !== oldRecord.vehicleId;

    if (isPeriodChanged || isVehicleChanged) {
      // Find if a monthly record already exists for this vehicle in target period
      let matchedRecord = await prisma.vehicleMonthlyRecord.findFirst({
        where: {
          periodId: targetPeriodId,
          vehicleId: targetVehicleId,
          isDeleted: false,
        },
      });

      if (matchedRecord) {
        targetRecordId = matchedRecord.id;
      } else {
        // Update current record's periodId / vehicleId
        await prisma.vehicleMonthlyRecord.update({
          where: { id: oldRecord.id },
          data: {
            periodId: targetPeriodId,
            vehicleId: targetVehicleId,
            sectionIndex: sectionIndex !== undefined ? parseInt(sectionIndex) || oldRecord.sectionIndex : oldRecord.sectionIndex,
          },
        });
        targetRecordId = oldRecord.id;
      }

      if (isPeriodChanged) {
        oldPeriodIdToRecalc = oldRecord.periodId;
      }
    } else if (sectionIndex !== undefined && parseInt(sectionIndex) !== oldRecord.sectionIndex) {
      // Update section index on the parent record
      await prisma.vehicleMonthlyRecord.update({
        where: { id: oldRecord.id },
        data: { sectionIndex: parseInt(sectionIndex) || oldRecord.sectionIndex },
      });
    }

    // 3. Update the billing line itself
    const finalKmOrTrips = kmOrTrips !== undefined && kmOrTrips !== null && kmOrTrips !== '' ? parseFloat(kmOrTrips) : null;
    const finalRate = applicableRate !== undefined && applicableRate !== null && applicableRate !== '' ? parseFloat(applicableRate) : null;
    let finalAmount = billingAmount !== undefined && billingAmount !== null && billingAmount !== '' ? parseFloat(billingAmount) : existingLine.billingAmount;

    // If billingAmount was not manually provided but KM & Rate are present
    if ((billingAmount === undefined || billingAmount === null || billingAmount === '') && finalKmOrTrips && finalRate) {
      finalAmount = Math.round(finalKmOrTrips * finalRate * 100) / 100;
    }

    const updatedLine = await prisma.billingLine.update({
      where: { id },
      data: {
        recordId: targetRecordId,
        companyName: companyName !== undefined ? companyName.trim() : existingLine.companyName,
        kmOrTrips: finalKmOrTrips,
        applicableRate: finalRate,
        billingAmount: finalAmount,
        amountFormula: amountFormula !== undefined ? amountFormula : existingLine.amountFormula,
      },
    });

    // 4. Recalculate parent vehicle record and period totals
    await recalculateVehicleRecord(targetRecordId);
    if (targetRecordId !== oldRecord.id) {
      await recalculateVehicleRecord(oldRecord.id);
    }
    if (oldPeriodIdToRecalc) {
      await recalculatePeriodTotals(oldPeriodIdToRecalc);
    }

    // 5. Version snapshot & audit log
    await createRecordSnapshot(targetRecordId, `Updated billing line for ${updatedLine.companyName}`, user.email);
    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'BILLING',
      entityType: 'BillingLine',
      entityId: id,
      previousState: {
        companyName: existingLine.companyName,
        billingAmount: existingLine.billingAmount,
        kmOrTrips: existingLine.kmOrTrips,
        rate: existingLine.applicableRate,
      },
      newState: {
        companyName: updatedLine.companyName,
        billingAmount: updatedLine.billingAmount,
        kmOrTrips: updatedLine.kmOrTrips,
        rate: updatedLine.applicableRate,
      },
      reason: 'Manual adjustment of billing transaction parameters',
    });

    return NextResponse.json({
      success: true,
      line: updatedLine,
      message: 'Billing line updated and financial calculations recalculated successfully',
    });
  } catch (err: any) {
    console.error('Error updating billing line:', err);
    return NextResponse.json({ error: err.message || 'Failed to update billing line' }, { status: 500 });
  }
}

// DELETE /api/billing – Delete single line or batch delete multiple selected lines
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkPermission(user, 'DELETE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Super Admin authority required to delete billing lines' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    const queryReason = searchParams.get('reason');

    let idsToDelete: string[] = [];
    let deleteReason = queryReason || 'User requested deletion';

    // Support both URL param (?id=...) and JSON body ({ ids: [...], reason: '...' })
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
      return NextResponse.json({ error: 'No billing line ID(s) provided for deletion' }, { status: 400 });
    }

    // Find all target lines to identify parent recordIds for recalculation
    const targetLines = await prisma.billingLine.findMany({
      where: {
        id: { in: idsToDelete },
        isDeleted: false,
      },
      include: {
        record: true,
      },
    });

    if (targetLines.length === 0) {
      return NextResponse.json({ error: 'No active billing lines found for the specified ID(s)' }, { status: 404 });
    }

    const uniqueRecordIds = Array.from(new Set(targetLines.map((l) => l.recordId)));

    // Soft-delete all selected billing lines
    await prisma.billingLine.updateMany({
      where: { id: { in: targetLines.map((l) => l.id) } },
      data: { isDeleted: true },
    });

    // Recalculate every affected vehicle record and period totals
    for (const recordId of uniqueRecordIds) {
      await recalculateVehicleRecord(recordId);
      await createRecordSnapshot(recordId, `Deleted ${targetLines.length} billing line(s)`, user.email);
    }

    // Audit log
    await logAudit({
      userEmail: user.email,
      action: 'DELETE',
      module: 'BILLING',
      entityType: 'BillingLine',
      entityId: idsToDelete.join(', '),
      previousState: { count: targetLines.length, items: targetLines.map((l) => ({ id: l.id, company: l.companyName, amt: l.billingAmount })) },
      reason: deleteReason,
    });

    return NextResponse.json({
      success: true,
      deletedCount: targetLines.length,
      message: `Successfully deleted ${targetLines.length} billing line(s) and recalculated statements`,
    });
  } catch (err: any) {
    console.error('Error deleting billing line(s):', err);
    return NextResponse.json({ error: err.message || 'Failed to delete billing line(s)' }, { status: 500 });
  }
}
