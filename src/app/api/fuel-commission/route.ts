import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const financialYear = searchParams.get('financialYear');
    const financialMonth = searchParams.get('financialMonth');
    const siteName = searchParams.get('siteName');
    const category = searchParams.get('category');
    const accountingType = searchParams.get('accountingType');
    const status = searchParams.get('status');

    const where: any = { isDeleted: false };

    if (financialYear && financialYear !== 'ALL') where.financialYear = financialYear;
    if (financialMonth && financialMonth !== 'ALL') where.financialMonth = financialMonth;
    if (siteName && siteName !== 'ALL') where.siteName = siteName;
    if (category && category !== 'ALL') where.category = category;
    if (accountingType && accountingType !== 'ALL') where.accountingType = accountingType;
    if (status && status !== 'ALL') where.status = status;

    if (search) {
      where.OR = [
        { siteName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { transactionReference: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }

    const records = await prisma.fuelCommissionRecord.findMany({
      where,
      orderBy: [{ commissionDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { versions: true },
        },
      },
    });

    // All active records for calculating overall metrics and filter lists
    const allActive = await prisma.fuelCommissionRecord.findMany({
      where: { isDeleted: false },
      orderBy: { commissionDate: 'asc' },
    });

    let totalCommission = 0;
    let oldCommission = 0;
    let monthlyTotal = 0;
    let adjustmentTotal = 0;
    let commissionEarned = 0;
    let commissionReceived = 0;
    let commissionPending = 0;

    const siteMap: Record<string, { siteName: string; amount: number; count: number; received: number; pending: number }> = {};
    const monthMap: Record<string, { month: string; amount: number; count: number }> = {};
    const yearMap: Record<string, { year: string; amount: number; count: number }> = {};

    const availableCompanies = new Set<string>();
    const availableCategories = new Set<string>();
    const availableYears = new Set<string>();
    const availableMonths = new Set<string>();

    for (const r of allActive) {
      totalCommission += r.amount;

      if (r.category === 'OPENING') {
        oldCommission += r.amount;
        commissionEarned += r.amount;
      } else if (r.category === 'ADJUSTMENT') {
        adjustmentTotal += r.amount;
      } else {
        monthlyTotal += r.amount;
        commissionEarned += r.amount;
      }

      commissionReceived += r.receivedAmount;
      commissionPending += (r.amount > 0 ? (r.amount - r.receivedAmount) : 0);

      // Aggregations
      availableCompanies.add(r.siteName);
      availableCategories.add(r.category);
      availableYears.add(r.financialYear);
      availableMonths.add(r.financialMonth);

      if (!siteMap[r.siteName]) {
        siteMap[r.siteName] = { siteName: r.siteName, amount: 0, count: 0, received: 0, pending: 0 };
      }
      siteMap[r.siteName].amount += r.amount;
      siteMap[r.siteName].count += 1;
      siteMap[r.siteName].received += r.receivedAmount;
      siteMap[r.siteName].pending += (r.amount > 0 ? (r.amount - r.receivedAmount) : 0);

      if (!monthMap[r.financialMonth]) {
        monthMap[r.financialMonth] = { month: r.financialMonth, amount: 0, count: 0 };
      }
      monthMap[r.financialMonth].amount += r.amount;
      monthMap[r.financialMonth].count += 1;

      if (!yearMap[r.financialYear]) {
        yearMap[r.financialYear] = { year: r.financialYear, amount: 0, count: 0 };
      }
      yearMap[r.financialYear].amount += r.amount;
      yearMap[r.financialYear].count += 1;
    }

    // Filtered selection totals for currently applied filters
    const filteredTotal = records.reduce((sum, r) => sum + r.amount, 0);

    const siteSummary = Object.values(siteMap).map((s) => ({
      ...s,
      percentage: totalCommission > 0 ? (s.amount / totalCommission) * 100 : 0,
    }));

    return NextResponse.json({
      success: true,
      records,
      metrics: {
        totalCommission,
        oldCommission,
        monthlyTotal,
        adjustmentTotal,
        commissionEarned,
        commissionReceived,
        commissionPending,
        totalEntries: allActive.length,
        filteredTotal,
        filteredCount: records.length,
        siteSummary,
        monthlySummary: Object.values(monthMap),
        yearSummary: Object.values(yearMap),
      },
      filterOptions: {
        sites: Array.from(availableCompanies).sort(),
        categories: Array.from(availableCategories).sort(),
        years: Array.from(availableYears).sort().reverse(),
        months: Array.from(availableMonths),
      },
    });
  } catch (err: any) {
    console.error('Error fetching Fuel Commission:', err);
    return NextResponse.json({ error: 'Failed to load fuel commission records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'EDIT_FINANCE');
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden: Super Admin privileges required to add fuel commission entries.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      financialYear,
      financialMonth,
      commissionDate,
      siteName,
      vehicleNumber,
      category = 'MONTHLY',
      amount,
      accountingType = 'EARNED',
      status = 'PENDING',
      description,
      transactionReference,
      remarks,
    } = body;

    if (!siteName || amount === undefined || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Site name and valid amount are required.' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);

    const newRecord = await prisma.fuelCommissionRecord.create({
      data: {
        financialYear: financialYear || '2026-27',
        financialMonth: financialMonth || 'Nov-26',
        commissionDate: commissionDate || new Date().toISOString().slice(0, 10),
        siteName: siteName.trim(),
        vehicleNumber: vehicleNumber ? vehicleNumber.trim() : null,
        category,
        amount: numAmount,
        accountingType,
        status,
        receivedAmount: status === 'RECEIVED' ? numAmount : 0,
        pendingAmount: status === 'RECEIVED' ? 0 : numAmount,
        description: description ? description.trim() : null,
        transactionReference: transactionReference ? transactionReference.trim() : null,
        remarks: remarks ? remarks.trim() : null,
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    // Create version snapshot #1
    await prisma.fuelCommissionVersion.create({
      data: {
        recordId: newRecord.id,
        versionNumber: 1,
        snapshotData: JSON.stringify(newRecord),
        changeReason: 'New Fuel Commission entry created via portal',
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'CREATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'FuelCommissionRecord',
      entityId: newRecord.id,
      previousState: null,
      newState: newRecord,
      reason: `Created Fuel Commission entry for ${newRecord.siteName} (₹${newRecord.amount})`,
    });

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating Fuel Commission entry:', err);
    return NextResponse.json({ error: 'Failed to create fuel commission entry' }, { status: 500 });
  }
}

