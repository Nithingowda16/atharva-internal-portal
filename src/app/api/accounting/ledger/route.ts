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
    const sourceAccountSlug = searchParams.get('sourceAccountSlug');
    const paymentStatus = searchParams.get('paymentStatus');
    const categoryName = searchParams.get('categoryName');

    const where: any = {};
    if (financialYear && financialYear !== 'ALL') where.financialYear = financialYear;
    if (financialMonth && financialMonth !== 'ALL') where.financialMonth = financialMonth;
    if (sourceAccountSlug && sourceAccountSlug !== 'ALL') where.sourceAccountSlug = sourceAccountSlug;
    if (paymentStatus && paymentStatus !== 'ALL') where.paymentStatus = paymentStatus;
    if (categoryName && categoryName !== 'ALL') where.categoryName = categoryName;

    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { companyOrParty: { contains: search, mode: 'insensitive' } },
        { categoryName: { contains: search, mode: 'insensitive' } },
        { bankTxnReference: { contains: search, mode: 'insensitive' } },
      ];
    }

    const entries = await prisma.financialLedgerEntry.findMany({
      where,
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        category: true,
      },
    });

    // Compute live metrics across all ledger entries
    const allLedger = await prisma.financialLedgerEntry.findMany({
      where: { isReversed: false },
    });

    let totalDebits = 0;
    let totalCredits = 0;
    let totalPaidOut = 0;
    let totalReceivedIn = 0;
    let totalPending = 0;

    for (const e of allLedger) {
      totalDebits += e.debitAmount;
      totalCredits += e.creditAmount;
      if (e.paymentStatus === 'PAID') totalPaidOut += e.creditAmount || e.netAmount;
      if (e.paymentStatus === 'RECEIVED') totalReceivedIn += e.debitAmount || e.netAmount;
      if (e.paymentStatus === 'PENDING') totalPending += Math.abs(e.netAmount);
    }

    return NextResponse.json({
      success: true,
      entries,
      metrics: {
        totalEntries: allLedger.length,
        filteredEntries: entries.length,
        totalDebits,
        totalCredits,
        totalPaidOut,
        totalReceivedIn,
        totalPending,
      },
    });
  } catch (err: any) {
    console.error('Error fetching financial ledger:', err);
    return NextResponse.json({ error: 'Failed to fetch ledger entries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'EDIT_FINANCE');
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden: Super Admin privileges required to post financial transactions.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      transactionDate,
      financialMonth,
      financialYear,
      sourceModule = 'SUPPORTING_ACCOUNT',
      sourceAccountSlug = 'general',
      sourceRecordId,
      categoryId,
      categoryName,
      companyOrParty,
      description,
      amount,
      classification = 'DEBIT', // 'DEBIT' or 'CREDIT'
      transactionType = 'EXPENSE',
      paymentStatus = 'PAID', // 'PAID', 'RECEIVED', 'PENDING', 'NON_CASH'
      paymentMode = 'BANK_TRANSFER',
      bankTxnReference,
      remarks,
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      return NextResponse.json({ error: 'Valid non-zero amount is required' }, { status: 400 });
    }

    const absAmount = Math.abs(numAmount);
    const dateStr = transactionDate || new Date().toISOString().slice(0, 10);
    const monthStr = financialMonth || 'Nov-26';
    const yearStr = financialYear || '2026-27';

    // Unique transaction ID
    const countToday = await prisma.financialLedgerEntry.count();
    const txnId = `TXN-${dateStr.replace(/-/g, '')}-${String(countToday + 1).padStart(4, '0')}`;

    // Determine debit vs credit
    // In standard accounting:
    // When money is PAID (Cash outflow from Bank): Bank is CREDITED. Expense/Liability is DEBITED.
    // When money is RECEIVED (Cash inflow to Bank): Bank is DEBITED. Income/Receivable is CREDITED.
    let debitAmount = 0;
    let creditAmount = 0;
    let netAmount = 0;

    if (paymentStatus === 'RECEIVED') {
      debitAmount = absAmount; // Bank debited (cash increased)
      creditAmount = 0;
      netAmount = absAmount;
    } else if (paymentStatus === 'PAID') {
      debitAmount = 0;
      creditAmount = absAmount; // Bank credited (cash decreased)
      netAmount = -absAmount;
    } else {
      // Pending or non-cash
      if (classification === 'DEBIT') {
        debitAmount = absAmount;
        netAmount = absAmount;
      } else {
        creditAmount = absAmount;
        netAmount = -absAmount;
      }
    }

    const isPostedToBank = paymentStatus === 'PAID' || paymentStatus === 'RECEIVED';

    const entry = await prisma.financialLedgerEntry.create({
      data: {
        transactionId: txnId,
        transactionDate: dateStr,
        financialMonth: monthStr,
        financialYear: yearStr,
        sourceModule,
        sourceAccountSlug,
        sourceRecordId: sourceRecordId || null,
        categoryId: categoryId || null,
        categoryName: categoryName || 'General',
        companyOrParty: companyOrParty ? companyOrParty.trim() : null,
        description: description ? description.trim() : `${categoryName || 'Transaction'} - ${companyOrParty || ''}`,
        debitAmount,
        creditAmount,
        netAmount,
        transactionType,
        paymentStatus,
        paymentMode,
        bankTxnReference: bankTxnReference ? bankTxnReference.trim() : null,
        isPostedToBank,
        postedAt: isPostedToBank ? new Date() : null,
        remarks: remarks ? remarks.trim() : null,
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    // Automatic Main Bank Balance synchronization for confirmed cash movements
    if (isPostedToBank) {
      const bbAcc = await prisma.bankAccount.findUnique({
        where: { accountSlug: 'bank-balance' },
      });

      if (bbAcc) {
        // Fetch or create the active consolidated period
        let mainPeriod = await prisma.bankAccountPeriod.findFirst({
          where: { accountId: bbAcc.id, status: { in: ['ACTIVE', 'RECONCILED'] } },
          orderBy: { createdAt: 'desc' },
        });

        if (mainPeriod) {
          const cashImpact = paymentStatus === 'RECEIVED' ? absAmount : -absAmount;
          await prisma.bankAccountPeriod.update({
            where: { id: mainPeriod.id },
            data: {
              netBalance: mainPeriod.netBalance + cashImpact,
              closingBalance: mainPeriod.closingBalance + cashImpact,
            },
          });
        }
      }
    }

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'CREATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'FinancialLedgerEntry',
      entityId: entry.id,
      previousState: null,
      newState: entry,
      reason: `Posted ${paymentStatus} transaction: ${entry.description} (₹${absAmount}, Bank Impact: ${isPostedToBank ? 'YES' : 'NO'})`,
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: any) {
    console.error('Error posting to ledger:', err);
    return NextResponse.json({ error: 'Failed to post transaction' }, { status: 500 });
  }
}

