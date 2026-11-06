import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const selectedPeriod = searchParams.get('period') || 'ALL'; // or "2026-08", "2026-09"

  // Fetch all non-deleted periods
  const periods = await prisma.financialPeriod.findMany({
    where: { isDeleted: false },
    orderBy: { startDate: 'asc' },
  });

  const periodWhere = selectedPeriod !== 'ALL' ? { period: { monthCode: selectedPeriod } } : {};

  // Fetch all records
  const records = await prisma.vehicleMonthlyRecord.findMany({
    where: {
      isDeleted: false,
      ...periodWhere,
    },
    include: {
      vehicle: true,
      period: true,
      billingLines: { where: { isDeleted: false } },
      adjustments: { where: { isDeleted: false } },
    },
    orderBy: [{ period: { startDate: 'asc' } }, { sectionIndex: 'asc' }],
  });

  // Calculate KPIs
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalPaid = 0;
  let vehiclesOnHoldCount = 0;
  let pendingSettlementCount = 0;
  let refErrorsCount = 0;

  const vehicleSet = new Set<string>();

  for (const r of records) {
    totalGross += r.grossBilling;
    totalDeductions += r.totalDeductions;
    totalNet += r.netPayable;
    totalPaid += r.amountPaid;

    if (r.vehicle.registrationNumber) {
      vehicleSet.add(r.vehicle.registrationNumber);
    }

    if (r.paymentStatus === 'HOLD') {
      vehiclesOnHoldCount++;
    }

    if (r.paymentStatus === 'Draft' || r.paymentStatus === 'WF' || r.paymentStatus === 'No Account' || r.paymentStatus === 'Partially Paid') {
      pendingSettlementCount++;
    }

    if (r.hasRefErrors) {
      refErrorsCount += r.refErrorCount;
    }
  }

  const outstandingBalance = totalNet - totalPaid;

  // Monthly Revenue Chart Data
  const monthlyTrends = periods.map((p) => ({
    monthCode: p.monthCode,
    periodName: p.periodName,
    grossBilling: p.grossBilling,
    totalDeductions: p.totalDeductions,
    netPayable: p.netPayable,
    totalPaid: p.totalPaid,
    outstanding: p.netPayable - p.totalPaid,
    status: p.status,
  }));

  // Company Billing Summary
  const companyMap = new Map<string, { totalAmount: number; tripCount: number }>();
  for (const r of records) {
    for (const bl of r.billingLines) {
      if (bl.billingAmount > 0) {
        const cName = bl.companyName || 'General';
        const cur = companyMap.get(cName) || { totalAmount: 0, tripCount: 0 };
        cur.totalAmount += bl.billingAmount;
        cur.tripCount += bl.kmOrTrips || 1;
        companyMap.set(cName, cur);
      }
    }
  }

  const companySummary = Array.from(companyMap.entries())
    .map(([name, data]) => ({
      name,
      totalBilling: Math.round(data.totalAmount * 100) / 100,
      tripCount: Math.round(data.tripCount),
    }))
    .sort((a, b) => b.totalBilling - a.totalBilling);

  // Deduction Category Breakdown
  const deductionMap = new Map<string, number>();
  for (const r of records) {
    for (const adj of r.adjustments) {
      if (adj.amount < 0 || adj.adjustmentType === 'DEDUCTION') {
        const cat = adj.category || 'Other Deductions';
        const cur = deductionMap.get(cat) || 0;
        deductionMap.set(cat, cur + Math.abs(adj.amount));
      }
    }
  }

  const deductionBreakdown = Array.from(deductionMap.entries())
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Status Breakdown
  const statusCounts: Record<string, number> = {};
  for (const r of records) {
    statusCounts[r.paymentStatus] = (statusCounts[r.paymentStatus] || 0) + 1;
  }

  // Recent Audit Logs
  const recentLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    kpis: {
      totalGross: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      activeVehiclesCount: vehicleSet.size,
      vehiclesOnHoldCount,
      pendingSettlementCount,
      totalVehicleRecords: records.length,
      refErrorsCount,
    },
    periods,
    monthlyTrends,
    companySummary,
    deductionBreakdown,
    statusCounts,
    recentLogs,
    selectedPeriod,
  });
}

