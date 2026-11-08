import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { softDeleteRecord } from '@/lib/softDelete';
import { validateRegistrationNumber } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        assignments: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
                panMasked: true,
                dlMasked: true,
                licenceExpiry: true,
                status: true,
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
        monthlyRecords: {
          where: { isDeleted: false },
          include: {
            period: true,
            billingLines: { where: { isDeleted: false } },
            adjustments: { where: { isDeleted: false } },
            payments: { where: { isDeleted: false } },
          },
          orderBy: { period: { startDate: 'desc' } },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Aggregate linked companies
    const companyTotals: Record<string, { totalAmount: number; tripCount: number }> = {};
    for (const mr of vehicle.monthlyRecords) {
      for (const bl of mr.billingLines) {
        if (bl.companyName && bl.billingAmount > 0) {
          if (!companyTotals[bl.companyName]) {
            companyTotals[bl.companyName] = { totalAmount: 0, tripCount: 0 };
          }
          companyTotals[bl.companyName].totalAmount += bl.billingAmount;
          companyTotals[bl.companyName].tripCount += bl.kmOrTrips || 1;
        }
      }
    }

    const linkedCompanies = Object.entries(companyTotals)
      .map(([name, data]) => ({
        companyName: name,
        totalBilling: Math.round(data.totalAmount * 100) / 100,
        tripCount: Math.round(data.tripCount),
      }))
      .sort((a, b) => b.totalBilling - a.totalBilling);

    // Current driver
    const currentAssignment = vehicle.assignments.find((a) => a.isCurrent) || null;

    // Monthly financial history
    const financialHistory = vehicle.monthlyRecords.map((mr) => ({
      recordId: mr.id,
      periodName: mr.period.periodName,
      monthCode: mr.period.monthCode,
      grossBilling: mr.grossBilling,
      totalDeductions: mr.totalDeductions,
      netPayable: mr.netPayable,
      amountPaid: mr.amountPaid,
      outstanding: Math.round((mr.netPayable - mr.amountPaid) * 100) / 100,
      paymentStatus: mr.paymentStatus,
      paymentDate: mr.paymentDate,
      hasRefErrors: mr.hasRefErrors,
      deductionsCount: mr.adjustments.length,
      linesCount: mr.billingLines.length,
    }));

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        carName: vehicle.carName || `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || vehicle.registrationNumber,
        make: vehicle.make || '',
        model: vehicle.model || '',
        category: vehicle.category || 'SEDAN',
        vehicleType: vehicle.vehicleType,
        seatingCapacity: vehicle.seatingCapacity || 4,
        fuelType: vehicle.fuelType || 'DIESEL',
        status: vehicle.status || 'ACTIVE',
        ownerName: vehicle.ownerName || '',
        contactNumber: vehicle.contactNumber || '',
        bankAccountMasked: vehicle.bankAccountMasked || '',
        bankName: vehicle.bankName || '',
        notes: vehicle.notes || '',
        remarks: vehicle.remarks || '',
        isDeleted: vehicle.isDeleted,
        createdAt: vehicle.createdAt,
        updatedAt: vehicle.updatedAt,
        currentDriver: currentAssignment ? currentAssignment.driver : null,
        currentAssignment: currentAssignment
          ? {
              id: currentAssignment.id,
              startDate: currentAssignment.startDate,
              notes: currentAssignment.notes,
              assignedBy: currentAssignment.assignedBy,
            }
          : null,
        assignmentHistory: vehicle.assignments.map((a) => ({
          id: a.id,
          driverId: a.driver.id,
          driverName: a.driver.name,
          driverPhone: a.driver.phone,
          startDate: a.startDate,
          endDate: a.endDate,
          isCurrent: a.isCurrent,
          assignedBy: a.assignedBy,
          notes: a.notes,
        })),
        linkedCompanies,
        financialHistory,
      },
    });
  } catch (err: any) {
    console.error('Error fetching vehicle profile:', err);
    return NextResponse.json({ error: 'Failed to fetch vehicle profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const existing = await prisma.vehicle.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    const {
      registrationNumber,
      carName,
      make,
      model,
      category,
      vehicleType,
      seatingCapacity,
      fuelType,
      status,
      ownerName,
      contactNumber,
      notes,
      remarks,
    } = body;

    let cleanReg = existing.registrationNumber;
    if (registrationNumber && registrationNumber !== existing.registrationNumber) {
      const validation = validateRegistrationNumber(registrationNumber);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.message }, { status: 400 });
      }
      cleanReg = validation.formatted;

      // Duplicate check
      const dup = await prisma.vehicle.findFirst({
        where: {
          id: { not: params.id },
          registrationNumber: { equals: cleanReg, mode: 'insensitive' },
          isDeleted: false,
        },
      });
      if (dup) {
        return NextResponse.json(
          { error: `Vehicle with registration number ${cleanReg} already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        registrationNumber: cleanReg,
        carName: carName !== undefined ? carName : existing.carName,
        make: make !== undefined ? make : existing.make,
        model: model !== undefined ? model : existing.model,
        category: category !== undefined ? category : existing.category,
        vehicleType: vehicleType !== undefined ? vehicleType : existing.vehicleType,
        seatingCapacity: seatingCapacity !== undefined ? Number(seatingCapacity) : existing.seatingCapacity,
        fuelType: fuelType !== undefined ? fuelType : existing.fuelType,
        status: status !== undefined ? status : existing.status,
        isActive: status ? status === 'ACTIVE' : existing.isActive,
        ownerName: ownerName !== undefined ? ownerName : existing.ownerName,
        contactNumber: contactNumber !== undefined ? contactNumber : existing.contactNumber,
        notes: notes !== undefined ? notes : existing.notes,
        remarks: remarks !== undefined ? remarks : existing.remarks,
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'FLEET_MANAGEMENT',
      entityType: 'Vehicle',
      entityId: updated.id,
      previousState: existing,
      newState: updated,
      reason: 'Vehicle updated via Fleet Management',
    });

    return NextResponse.json({ vehicle: updated });
  } catch (err: any) {
    console.error('Error updating vehicle:', err);
    return NextResponse.json({ error: err.message || 'Failed to update vehicle' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const item = await softDeleteRecord({
      entityType: 'Vehicle',
      entityId: params.id,
      userEmail: user.email,
      reason: 'Vehicle soft-deleted from Fleet Management',
    });

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    console.error('Error soft-deleting vehicle:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete vehicle' }, { status: 500 });
  }
}

