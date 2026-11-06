import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { softDeleteRecord } from '@/lib/softDelete';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const type = searchParams.get('type');

  const where: any = { isDeleted: false };
  if (type && type !== 'ALL') where.vehicleType = type;
  if (search) {
    where.OR = [
      { registrationNumber: { contains: search } },
      { ownerName: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      monthlyRecords: {
        where: { isDeleted: false },
        include: { period: true },
        orderBy: { period: { startDate: 'desc' } },
      },
    },
    orderBy: { registrationNumber: 'asc' },
  });

  const vehiclesWithStats = vehicles.map((v) => {
    let totalBilling = 0;
    let totalDeductions = 0;
    let totalPaid = 0;
    let outstanding = 0;

    for (const mr of v.monthlyRecords) {
      totalBilling += mr.grossBilling;
      totalDeductions += mr.totalDeductions;
      totalPaid += mr.amountPaid;
      outstanding += (mr.netPayable - mr.amountPaid);
    }

    return {
      id: v.id,
      registrationNumber: v.registrationNumber,
      vehicleType: v.vehicleType,
      isActive: v.isActive,
      ownerName: v.ownerName,
      contactNumber: v.contactNumber,
      bankAccountMasked: v.bankAccountMasked,
      bankName: v.bankName,
      notes: v.notes,
      totalBilling: Math.round(totalBilling * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      outstandingBalance: Math.round(outstanding * 100) / 100,
      monthsCount: v.monthlyRecords.length,
      history: v.monthlyRecords.map((m) => ({
        id: m.id,
        periodName: m.period.periodName,
        monthCode: m.period.monthCode,
        grossBilling: m.grossBilling,
        totalDeductions: m.totalDeductions,
        netPayable: m.netPayable,
        amountPaid: m.amountPaid,
        status: m.paymentStatus,
        paymentDate: m.paymentDate,
        hasRefErrors: m.hasRefErrors,
      })),
    };
  });

  return NextResponse.json({ vehicles: vehiclesWithStats });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { registrationNumber, vehicleType, ownerName, contactNumber, bankAccountMasked, bankName, notes } = await req.json();

    if (!registrationNumber) {
      return NextResponse.json({ error: 'Registration number is required' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: registrationNumber.trim(),
        vehicleType: vehicleType || 'Vehicle - 4-Seater',
        ownerName: ownerName || null,
        contactNumber: contactNumber || null,
        bankAccountMasked: bankAccountMasked || null,
        bankName: bankName || null,
        notes: notes || null,
        isActive: true,
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'CREATE',
      module: 'VEHICLES',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      newState: { registrationNumber: vehicle.registrationNumber },
      reason: 'Added new vehicle to master directory',
    });

    return NextResponse.json({ success: true, vehicle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create vehicle' }, { status: 500 });
  }
}

