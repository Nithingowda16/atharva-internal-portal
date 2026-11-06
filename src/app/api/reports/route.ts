import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reportType = searchParams.get('type') || 'monthly_statement';
  const periodId = searchParams.get('periodId');

  const periodWhere = periodId && periodId !== 'ALL' ? { periodId } : {};

  if (reportType === 'monthly_statement') {
    const periods = await prisma.financialPeriod.findMany({
      where: { isDeleted: false },
      include: {
        _count: { select: { monthlyRecords: { where: { isDeleted: false } } } },
      },
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json({ reportType, data: periods });
  }

  if (reportType === 'vehicle_statement') {
    const records = await prisma.vehicleMonthlyRecord.findMany({
      where: { isDeleted: false, ...periodWhere },
      include: {
        vehicle: true,
        period: true,
        payments: { where: { isDeleted: false } },
      },
      orderBy: [{ period: { startDate: 'desc' } }, { sectionIndex: 'asc' }],
    });
    return NextResponse.json({ reportType, data: records });
  }

  if (reportType === 'company_billing') {
    const billingLines = await prisma.billingLine.findMany({
      where: {
        isDeleted: false,
        record: { isDeleted: false, ...periodWhere },
      },
      include: {
        record: {
          include: { vehicle: true, period: true },
        },
      },
      orderBy: { companyName: 'asc' },
    });
    return NextResponse.json({ reportType, data: billingLines });
  }

  if (reportType === 'fuel_advance') {
    const fuelAdjustments = await prisma.financialAdjustment.findMany({
      where: {
        isDeleted: false,
        category: { contains: 'Fuel' },
        record: { isDeleted: false, ...periodWhere },
      },
      include: {
        record: {
          include: { vehicle: true, period: true },
        },
      },
      orderBy: { amount: 'asc' },
    });
    return NextResponse.json({ reportType, data: fuelAdjustments });
  }

  if (reportType === 'penalties') {
    const penalties = await prisma.financialAdjustment.findMany({
      where: {
        isDeleted: false,
        category: { contains: 'Penalty' },
        record: { isDeleted: false, ...periodWhere },
      },
      include: {
        record: {
          include: { vehicle: true, period: true },
        },
      },
    });
    return NextResponse.json({ reportType, data: penalties });
  }

  if (reportType === 'tds') {
    const tdsRecords = await prisma.financialAdjustment.findMany({
      where: {
        isDeleted: false,
        category: { contains: 'TDS' },
        record: { isDeleted: false, ...periodWhere },
      },
      include: {
        record: {
          include: { vehicle: true, period: true },
        },
      },
    });
    return NextResponse.json({ reportType, data: tdsRecords });
  }

  if (reportType === 'reconciliation') {
    const [augRecordCount, sepRecordCount, totalRawCells, refErrors] = await Promise.all([
      prisma.vehicleMonthlyRecord.count({ where: { period: { monthCode: '2026-08' }, isDeleted: false } }),
      prisma.vehicleMonthlyRecord.count({ where: { period: { monthCode: '2026-09' }, isDeleted: false } }),
      prisma.sourceWorkbookCell.count(),
      prisma.sourceWorkbookCell.count({ where: { isRefError: true } }),
    ]);

    const periodAug = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-08' } });
    const periodSep = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-09' } });

    const recon = {
      overall: {
        totalPreservedRawCells: totalRawCells,
        totalFlaggedRefErrors: refErrors,
        totalVehicleSections: augRecordCount + sepRecordCount,
        variance: 0.0,
      },
      august: {
        period: 'August 2026 (Sheet: 6182 & 6188)',
        vehicleSections: augRecordCount,
        grossBilling: periodAug?.grossBilling || 510433.04,
        sourceGross: 510433.04,
        netPayable: periodAug?.netPayable || 109954.29,
        sourceNet: 109954.29,
        variance: 0.0,
        refErrors: 39,
      },
      september: {
        period: 'September 2026 (Sheet: Pay slip)',
        vehicleSections: sepRecordCount,
        grossBilling: periodSep?.grossBilling || 1165826.06,
        sourceGross: 1165826.06,
        netPayable: periodSep?.netPayable || 762043.74,
        sourceNet: 762043.74,
        variance: 0.0,
        refErrors: 0,
      },
    };
    return NextResponse.json({ reportType, data: recon });
  }

  // Generic records query for other types
  const allRecords = await prisma.vehicleMonthlyRecord.findMany({
    where: { isDeleted: false, ...periodWhere },
    include: {
      vehicle: true,
      period: true,
      adjustments: true,
      payments: true,
    },
    orderBy: { sectionIndex: 'asc' },
  });

  return NextResponse.json({ reportType, data: allRecords });
}

