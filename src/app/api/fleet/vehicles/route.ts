import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { validateRegistrationNumber } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const driverId = searchParams.get('driverId');

  const where: any = { isDeleted: false };
  if (status && status !== 'ALL') where.status = status;
  if (category && category !== 'ALL') where.category = category;

  if (driverId) {
    where.assignments = {
      some: {
        driverId,
        isCurrent: true,
      },
    };
  }

  if (search) {
    where.OR = [
      { registrationNumber: { contains: search, mode: 'insensitive' } },
      { carName: { contains: search, mode: 'insensitive' } },
      { make: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        assignments: {
          where: { isCurrent: true },
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
        },
        monthlyRecords: {
          where: { isDeleted: false },
          select: {
            grossBilling: true,
            totalDeductions: true,
            netPayable: true,
            amountPaid: true,
            adjustments: {
              where: { isDeleted: false },
              select: { category: true, amount: true },
            },
          },
        },
      },
      orderBy: { registrationNumber: 'asc' },
    });

    const formatted = vehicles.map((v) => {
      const currentAssignment = v.assignments[0] || null;
      const currentDriver = currentAssignment?.driver || null;

      let totalGross = 0;
      let totalDeductions = 0;
      let totalPaid = 0;
      let totalNet = 0;
      let totalTds = 0;

      for (const mr of v.monthlyRecords) {
        totalGross += mr.grossBilling;
        totalDeductions += mr.totalDeductions;
        totalPaid += mr.amountPaid;
        totalNet += mr.netPayable;

        const adjustments = (mr as any).adjustments || [];
        const tdsAdj = adjustments.find((a: any) => (a.category || '').toLowerCase().includes('tds'));
        if (tdsAdj) {
          totalTds += Math.abs(tdsAdj.amount || 0);
        } else if (mr.grossBilling > 0) {
          totalTds += Math.round(mr.grossBilling * 0.01 * 100) / 100;
        }
      }

      return {
        id: v.id,
        registrationNumber: v.registrationNumber,
        carName: v.carName || `${v.make || ''} ${v.model || ''}`.trim() || v.registrationNumber,
        make: v.make || '',
        model: v.model || '',
        category: v.category || 'SEDAN',
        vehicleType: v.vehicleType,
        seatingCapacity: v.seatingCapacity || 4,
        fuelType: v.fuelType || 'DIESEL',
        status: v.status || 'ACTIVE',
        ownerName: v.ownerName || '',
        contactNumber: v.contactNumber || '',
        bankAccountMasked: v.bankAccountMasked || '',
        bankName: v.bankName || '',
        ifscCode: v.ifscCode || '',
        notes: v.notes || '',
        remarks: v.remarks || '',
        currentDriver: currentDriver
          ? {
              id: currentDriver.id,
              name: currentDriver.name,
              phone: currentDriver.phone,
              panMasked: currentDriver.panMasked,
              dlMasked: currentDriver.dlMasked,
              licenceExpiry: currentDriver.licenceExpiry,
              status: currentDriver.status,
              assignedSince: currentAssignment.startDate,
            }
          : null,
        financials: {
          totalGross: Math.round(totalGross * 100) / 100,
          totalTds: Math.round(totalTds * 100) / 100,
          totalDeductions: Math.round(totalDeductions * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          outstandingBalance: Math.round((totalNet - totalPaid) * 100) / 100,
          monthsCount: v.monthlyRecords.length,
        },
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      };
    });

    return NextResponse.json({ vehicles: formatted });
  } catch (err: any) {
    console.error('Error fetching fleet vehicles:', err);
    return NextResponse.json({ error: 'Failed to fetch fleet vehicles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'MANAGE_FLEET')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot register fleet vehicles.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      registrationNumber,
      carName,
      make,
      model,
      category = 'SEDAN',
      vehicleType = 'Vehicle - 4-Seater',
      seatingCapacity = 4,
      fuelType = 'DIESEL',
      status = 'ACTIVE',
      ownerName,
      contactNumber,
      bankName,
      bankAccountMasked,
      ifscCode,
      notes,
      remarks,
      initialDriverId,
    } = body;

    // Validate registration
    const validation = validateRegistrationNumber(registrationNumber);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }
    const cleanReg = validation.formatted;

    // Check duplicate
    const existing = await prisma.vehicle.findFirst({
      where: {
        registrationNumber: { equals: cleanReg, mode: 'insensitive' },
        isDeleted: false,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Vehicle with registration number ${cleanReg} already exists in active fleet.` },
        { status: 409 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: cleanReg,
        carName: carName?.trim() || `${make || ''} ${model || ''}`.trim() || cleanReg,
        make: make?.trim() || null,
        model: model?.trim() || null,
        category,
        vehicleType,
        seatingCapacity: Number(seatingCapacity) || 4,
        fuelType,
        status,
        isActive: status === 'ACTIVE',
        ownerName: ownerName?.trim() || null,
        contactNumber: contactNumber?.trim() || null,
        bankName: bankName?.trim() || null,
        bankAccountMasked: bankAccountMasked?.trim() || null,
        ifscCode: ifscCode?.trim() || null,
        notes: notes?.trim() || null,
        remarks: remarks?.trim() || null,
      },
    });

    // If initial driver assigned
    if (initialDriverId) {
      // Close any active assignment for that driver
      await prisma.vehicleDriverAssignment.updateMany({
        where: { driverId: initialDriverId, isCurrent: true },
        data: { isCurrent: false, endDate: new Date() },
      });

      await prisma.vehicleDriverAssignment.create({
        data: {
          vehicleId: vehicle.id,
          driverId: initialDriverId,
          startDate: new Date(),
          isCurrent: true,
          assignedBy: user.email,
          notes: 'Assigned during vehicle registration',
        },
      });
    }

    await logAudit({
      userEmail: user.email,
      action: 'CREATE',
      module: 'FLEET_MANAGEMENT',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      newState: { registrationNumber: cleanReg, carName, status, initialDriverId },
      reason: 'Vehicle created in Fleet Master',
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating vehicle:', err);
    return NextResponse.json({ error: err.message || 'Failed to create vehicle' }, { status: 500 });
  }
}

