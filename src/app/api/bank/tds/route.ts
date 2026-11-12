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
    const companyName = searchParams.get('companyName');
    const tdsCategory = searchParams.get('tdsCategory');
    const accountingType = searchParams.get('accountingType');
    const status = searchParams.get('status');

    const where: any = { isDeleted: false };

    if (financialYear && financialYear !== 'ALL') where.financialYear = financialYear;
    if (financialMonth && financialMonth !== 'ALL') where.financialMonth = financialMonth;
    if (companyName && companyName !== 'ALL') where.companyName = companyName;
    if (tdsCategory && tdsCategory !== 'ALL') where.tdsCategory = tdsCategory;
    if (accountingType && accountingType !== 'ALL') where.accountingType = accountingType;
    if (status && status !== 'ALL') where.status = status;

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { tdsReferenceNo: { contains: search, mode: 'insensitive' } },
        { invoiceReference: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
        { tdsCategory: { contains: search, mode: 'insensitive' } },
      ];
    }

    const records = await prisma.tdsRecord.findMany({
      where,
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { versions: true },
        },
      },
    });

    // All active records for calculating overall metrics
    const allActive = await prisma.tdsRecord.findMany({
      where: { isDeleted: false },
      orderBy: { transactionDate: 'asc' },
    });

    let totalAmount = 0;
    let receivableAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    const companyMap: Record<string, { amount: number; count: number }> = {};
    const monthlyMap: Record<string, { amount: number; count: number }> = {};
    const yearMap: Record<string, { amount: number; count: number }> = {};
    const companiesSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const yearsSet = new Set<string>();
    const monthsSet = new Set<string>();

    for (const r of allActive) {
      totalAmount += r.amount;
      if (r.accountingType === 'RECEIVABLE') receivableAmount += r.amount;
      if (r.accountingType === 'PAID_GOVERNMENT') paidAmount += r.amount;
      if (r.status === 'PENDING') pendingAmount += r.amount;

      // Grouping
      companiesSet.add(r.companyName);
      categoriesSet.add(r.tdsCategory);
      yearsSet.add(r.financialYear);
      monthsSet.add(r.financialMonth);

      if (!companyMap[r.companyName]) companyMap[r.companyName] = { amount: 0, count: 0 };
      companyMap[r.companyName].amount += r.amount;
      companyMap[r.companyName].count += 1;

      if (!monthlyMap[r.financialMonth]) monthlyMap[r.financialMonth] = { amount: 0, count: 0 };
      monthlyMap[r.financialMonth].amount += r.amount;
      monthlyMap[r.financialMonth].count += 1;

      if (!yearMap[r.financialYear]) yearMap[r.financialYear] = { amount: 0, count: 0 };
      yearMap[r.financialYear].amount += r.amount;
      yearMap[r.financialYear].count += 1;
    }

    const companySummary = Object.entries(companyMap).map(([company, data]) => ({
      companyName: company,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }));

    const monthlySummary = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      amount: data.amount,
      count: data.count,
    }));

    const yearSummary = Object.entries(yearMap).map(([year, data]) => ({
      year,
      amount: data.amount,
      count: data.count,
    }));

    return NextResponse.json({
      success: true,
      records,
      metrics: {
        totalAmount,
        totalEntries: allActive.length,
        receivableAmount,
        paidAmount,
        pendingAmount,
        filteredCount: records.length,
        filteredAmount: records.reduce((s, r) => s + r.amount, 0),
        companySummary,
        monthlySummary,
        yearSummary,
      },
      filters: {
        companies: Array.from(companiesSet),
        categories: Array.from(categoriesSet),
        years: Array.from(yearsSet),
        months: Array.from(monthsSet),
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch TDS records:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch TDS records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot create TDS records.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      financialYear,
      financialMonth,
      companyName,
      tdsCategory,
      amount,
      transactionDate,
      tdsReferenceNo,
      invoiceReference,
      accountingType,
      status,
      remarks,
    } = body;

    if (!financialYear || !financialMonth || !companyName || !tdsCategory || amount === undefined || !transactionDate) {
      return NextResponse.json(
        { error: 'Mandatory fields missing: financialYear, financialMonth, companyName, tdsCategory, amount, and transactionDate are required.' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount: must be a positive number.' }, { status: 400 });
    }

    const created = await prisma.tdsRecord.create({
      data: {
        financialYear,
        financialMonth,
        companyName,
        tdsCategory,
        amount: numAmount,
        transactionDate,
        tdsReferenceNo: tdsReferenceNo || null,
        invoiceReference: invoiceReference || null,
        accountingType: accountingType || 'RECEIVABLE',
        status: status || 'CONFIRMED',
        remarks: remarks || null,
        createdById: user.id,
        createdByEmail: user.email,
        versions: {
          create: {
            versionNumber: 1,
            snapshotData: JSON.stringify({
              financialYear,
              financialMonth,
              companyName,
              tdsCategory,
              amount: numAmount,
              transactionDate,
              tdsReferenceNo,
              invoiceReference,
              accountingType,
              status,
              remarks,
            }),
            changeReason: 'Initial entry creation',
            createdById: user.id,
            createdByEmail: user.email,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'CREATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'TdsRecord',
      entityId: created.id,
      newState: created,
      reason: `Created TDS entry for ${companyName} (${financialMonth}): ₹${numAmount}`,
    });

    return NextResponse.json({ success: true, record: created });
  } catch (err: any) {
    console.error('Failed to create TDS record:', err);
    return NextResponse.json({ error: err.message || 'Failed to create TDS record' }, { status: 500 });
  }
}

