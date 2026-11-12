import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export interface PostLedgerOptions {
  sourceModule: 'SUPPORTING_ACCOUNT' | 'TDS' | 'FUEL_COMMISSION' | 'FLEET' | 'DIRECT_BANK';
  sourceAccountSlug?: string;
  sourceRecordId?: string;
  transactionDate?: string;
  financialMonth?: string;
  financialYear?: string;
  categoryName?: string;
  categoryId?: string;
  companyOrParty?: string;
  description: string;
  amount: number;
  transactionType: 'EXPENSE' | 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT' | 'TRANSFER' | 'INCOME' | 'DEDUCTION';
  paymentStatus: 'PAID' | 'RECEIVED' | 'PENDING' | 'NON_CASH';
  paymentMode?: string;
  bankTxnReference?: string;
  remarks?: string;
  user: { id?: string; email: string };
}

/**
 * Posts or updates a transaction in the central financial ledger and synchronizes with Main Bank Balance.
 */
export async function postToCentralLedger(opts: PostLedgerOptions) {
  const absAmount = Math.abs(opts.amount);
  const dateStr = opts.transactionDate || new Date().toISOString().slice(0, 10);
  const monthStr = opts.financialMonth || 'Nov-26';
  const yearStr = opts.financialYear || '2026-27';

  // Check if a ledger entry already exists for this source record
  let existingEntry = null;
  if (opts.sourceRecordId) {
    existingEntry = await prisma.financialLedgerEntry.findFirst({
      where: { sourceRecordId: opts.sourceRecordId, isReversed: false },
    });
  }

  // Determine debit vs credit
  // Outgoing paid cash: Bank credited (cash decreases)
  // Incoming received cash: Bank debited (cash increases)
  let debitAmount = 0;
  let creditAmount = 0;
  let netAmount = 0;

  if (opts.paymentStatus === 'RECEIVED') {
    debitAmount = absAmount;
    netAmount = absAmount;
  } else if (opts.paymentStatus === 'PAID') {
    creditAmount = absAmount;
    netAmount = -absAmount;
  } else {
    // Pending / non-cash
    if (opts.transactionType === 'INCOME' || opts.transactionType === 'RECEIPT') {
      debitAmount = absAmount;
      netAmount = absAmount;
    } else {
      creditAmount = absAmount;
      netAmount = -absAmount;
    }
  }

  const isPostedToBank = opts.paymentStatus === 'PAID' || opts.paymentStatus === 'RECEIVED';

  // Calculate cash difference to adjust Main Bank Balance
  let cashAdjustment = 0;
  if (existingEntry && existingEntry.isPostedToBank) {
    // Revert old bank impact
    const oldCashImpact = existingEntry.paymentStatus === 'RECEIVED' ? existingEntry.debitAmount : -existingEntry.creditAmount;
    cashAdjustment -= oldCashImpact;
  }
  if (isPostedToBank) {
    const newCashImpact = opts.paymentStatus === 'RECEIVED' ? absAmount : -absAmount;
    cashAdjustment += newCashImpact;
  }

  let ledgerEntry;
  if (existingEntry) {
    ledgerEntry = await prisma.financialLedgerEntry.update({
      where: { id: existingEntry.id },
      data: {
        transactionDate: dateStr,
        financialMonth: monthStr,
        financialYear: yearStr,
        categoryName: opts.categoryName || existingEntry.categoryName,
        companyOrParty: opts.companyOrParty !== undefined ? opts.companyOrParty : existingEntry.companyOrParty,
        description: opts.description || existingEntry.description,
        debitAmount,
        creditAmount,
        netAmount,
        transactionType: opts.transactionType,
        paymentStatus: opts.paymentStatus,
        paymentMode: opts.paymentMode || existingEntry.paymentMode,
        bankTxnReference: opts.bankTxnReference !== undefined ? opts.bankTxnReference : existingEntry.bankTxnReference,
        isPostedToBank,
        postedAt: isPostedToBank ? (existingEntry.postedAt || new Date()) : null,
        remarks: opts.remarks !== undefined ? opts.remarks : existingEntry.remarks,
      },
    });
  } else {
    const countToday = await prisma.financialLedgerEntry.count();
    const txnId = `TXN-${dateStr.replace(/-/g, '')}-${String(countToday + 1).padStart(4, '0')}`;

    ledgerEntry = await prisma.financialLedgerEntry.create({
      data: {
        transactionId: txnId,
        transactionDate: dateStr,
        financialMonth: monthStr,
        financialYear: yearStr,
        sourceModule: opts.sourceModule,
        sourceAccountSlug: opts.sourceAccountSlug || null,
        sourceRecordId: opts.sourceRecordId || null,
        categoryId: opts.categoryId || null,
        categoryName: opts.categoryName || 'General',
        companyOrParty: opts.companyOrParty || null,
        description: opts.description,
        debitAmount,
        creditAmount,
        netAmount,
        transactionType: opts.transactionType,
        paymentStatus: opts.paymentStatus,
        paymentMode: opts.paymentMode || 'BANK_TRANSFER',
        bankTxnReference: opts.bankTxnReference || null,
        isPostedToBank,
        postedAt: isPostedToBank ? new Date() : null,
        remarks: opts.remarks || null,
        createdById: opts.user.id || null,
        createdByEmail: opts.user.email,
      },
    });
  }

  // Update Main Bank Balance if there is a net cash adjustment
  if (cashAdjustment !== 0) {
    const bbAcc = await prisma.bankAccount.findUnique({
      where: { accountSlug: 'bank-balance' },
    });
    if (bbAcc) {
      const mainPeriod = await prisma.bankAccountPeriod.findFirst({
        where: { accountId: bbAcc.id, status: { in: ['ACTIVE', 'RECONCILED'] } },
        orderBy: { createdAt: 'desc' },
      });
      if (mainPeriod) {
        await prisma.bankAccountPeriod.update({
          where: { id: mainPeriod.id },
          data: {
            netBalance: mainPeriod.netBalance + cashAdjustment,
            closingBalance: mainPeriod.closingBalance + cashAdjustment,
          },
        });
      }
    }
  }

  return ledgerEntry;
}

/**
 * Reverses a transaction in the central ledger and restores any deducted/credited bank balance.
 */
export async function reverseInCentralLedger(sourceRecordId: string, user: { id?: string; email: string }, reason: string) {
  const existing = await prisma.financialLedgerEntry.findFirst({
    where: { sourceRecordId, isReversed: false },
  });

  if (!existing) return null;

  // Revert bank balance if it was posted
  if (existing.isPostedToBank) {
    const oldCashImpact = existing.paymentStatus === 'RECEIVED' ? existing.debitAmount : -existing.creditAmount;
    const bbAcc = await prisma.bankAccount.findUnique({ where: { accountSlug: 'bank-balance' } });
    if (bbAcc) {
      const mainPeriod = await prisma.bankAccountPeriod.findFirst({
        where: { accountId: bbAcc.id },
        orderBy: { createdAt: 'desc' },
      });
      if (mainPeriod) {
        await prisma.bankAccountPeriod.update({
          where: { id: mainPeriod.id },
          data: {
            netBalance: mainPeriod.netBalance - oldCashImpact,
            closingBalance: mainPeriod.closingBalance - oldCashImpact,
          },
        });
      }
    }
  }

  const reversed = await prisma.financialLedgerEntry.update({
    where: { id: existing.id },
    data: {
      isReversed: true,
      reversalReason: reason,
      reversedAt: new Date(),
    },
  });

  return reversed;
}

