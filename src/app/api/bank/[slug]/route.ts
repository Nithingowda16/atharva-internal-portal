import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { postToCentralLedger, reverseInCentralLedger } from '@/lib/accountingLedger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = params;
    const account = await prisma.bankAccount.findUnique({
      where: { accountSlug: slug },
      include: {
        periods: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account || account.isDeleted) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const section = searchParams.get('section');
    const periodCode = searchParams.get('periodCode');

    const where: any = {
      accountId: account.id,
      isDeleted: false,
    };

    if (section && section !== 'ALL') {
      where.section = section;
    }
    if (periodCode && periodCode !== 'ALL') {
      where.periodCode = periodCode;
    }
    if (search) {
      where.OR = [
        { particulars: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { sourceReference: { contains: search, mode: 'insensitive' } },
        { comments: { contains: search, mode: 'insensitive' } },
        { invoiceNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const entries = await prisma.bankAccountEntry.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: [{ rowIndex: 'asc' }, { createdAt: 'asc' }],
    });

    // Compute live calculations
    let totalIncome = 0;
    let totalExpense = 0;
    let netBalance = 0;

    for (const e of entries) {
      if (e.receivedAmount && e.receivedAmount > 0) totalIncome += e.receivedAmount;
      if (e.paidAmount && e.paidAmount > 0) totalExpense += e.paidAmount;
      if (e.amount > 0 && !e.receivedAmount && !e.paidAmount) totalIncome += e.amount;
      if (e.amount < 0 && !e.paidAmount) totalExpense += Math.abs(e.amount);
      netBalance += e.netAmount !== null && e.netAmount !== undefined ? e.netAmount : e.amount;
    }

    return NextResponse.json({
      success: true,
      account,
      metrics: {
        totalEntries: entries.length,
        totalIncome,
        totalExpense,
        netBalance,
      },
      entries,
      periods: account.periods,
    });
  } catch (err: any) {
    console.error('Error fetching account details:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch account' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json(
      { error: 'Forbidden: View-only accounts cannot create financial entries.' },
      { status: 403 }
    );
  }

  try {
    const { slug } = params;
    const account = await prisma.bankAccount.findUnique({ where: { accountSlug: slug } });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const body = await req.json();
    const {
      periodCode,
      entryDate,
      section,
      category,
      particulars,
      sourceReference,
      amount,
      formulaString,
      paidAmount,
      receivedAmount,
      netAmount,
      invoicedAmount,
      invoiceDate,
      invoiceNo,
      comments,
      remarks,
    } = body;

    if (!particulars || amount === undefined) {
      return NextResponse.json({ error: 'particulars and amount are required' }, { status: 400 });
    }

    const entry = await prisma.bankAccountEntry.create({
      data: {
        accountId: account.id,
        periodCode: periodCode || '2026',
        entryDate: entryDate || new Date().toISOString().split('T')[0],
        section: section || 'GENERAL',
        category: category || 'General',
        particulars: particulars.trim(),
        sourceReference: sourceReference?.trim() || null,
        amount: Number(amount) || 0,
        rawAmount: String(amount),
        formulaString: formulaString || null,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : null,
        receivedAmount: receivedAmount !== undefined ? Number(receivedAmount) : null,
        netAmount: netAmount !== undefined ? Number(netAmount) : null,
        invoicedAmount: invoicedAmount !== undefined ? Number(invoicedAmount) : null,
        invoiceDate: invoiceDate || null,
        invoiceNo: invoiceNo || null,
        comments: comments?.trim() || null,
        remarks: remarks?.trim() || null,
        meta: body.meta
          ? typeof body.meta === 'string'
            ? body.meta
            : JSON.stringify(body.meta)
          : JSON.stringify({
              transactionId: body.transactionId || `TXN-${Date.now()}`,
              financialYear: body.financialYear || '2026-27',
              financialMonth: body.financialMonth || 'Nov-26',
              debitCredit: body.debitCredit || (Number(amount) < 0 ? 'DEBIT' : 'CREDIT'),
              paymentStatus: body.paymentStatus || 'PAID',
              paymentMode: body.paymentMode || 'BANK_TRANSFER',
              bankTxnReference: body.bankTxnReference || null,
            }),
      },
    });

    // Create initial version snapshot
    await prisma.bankAccountEntryVersion.create({
      data: {
        entryId: entry.id,
        versionNumber: 1,
        snapshotData: JSON.stringify(entry),
        changeReason: body.changeReason || `Initial entry created in ${account.accountName}`,
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'CREATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'BankAccountEntry',
      entityId: entry.id,
      newState: JSON.stringify(entry),
      reason: `Added new entry to ${account.accountName}: ${entry.particulars} (₹${entry.amount})`,
    });

    // Centralized Ledger Posting & Bank Balance Synchronization
    const pStatus = body.paymentStatus || (Number(entry.paidAmount) > 0 ? 'PAID' : Number(entry.receivedAmount) > 0 ? 'RECEIVED' : 'PENDING');
    try {
      await postToCentralLedger({
        sourceModule: 'SUPPORTING_ACCOUNT',
        sourceAccountSlug: slug,
        sourceRecordId: entry.id,
        transactionDate: entry.entryDate || undefined,
        financialMonth: entry.periodCode || 'Nov-26',
        financialYear: '2026-27',
        categoryName: entry.category || 'General',
        companyOrParty: entry.sourceReference || undefined,
        description: `${account.accountName}: ${entry.particulars}`,
        amount: entry.amount,
        transactionType: Number(entry.amount) < 0 || pStatus === 'PAID' ? 'EXPENSE' : 'INCOME',
        paymentStatus: pStatus,
        paymentMode: body.paymentMode || 'BANK_TRANSFER',
        bankTxnReference: body.bankTxnReference || entry.sourceReference || undefined,
        remarks: entry.remarks || undefined,
        user: { id: user.id, email: user.email },
      });
    } catch (ledgerErr) {
      console.error('Failed to post supporting account entry to central ledger:', ledgerErr);
    }

    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    console.error('Error creating bank entry:', err);
    return NextResponse.json({ error: err.message || 'Failed to create entry' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json(
      { error: 'Forbidden: View-only accounts cannot modify financial entries.' },
      { status: 403 }
    );
  }

  try {
    const { slug } = params;
    const account = await prisma.bankAccount.findUnique({ where: { accountSlug: slug } });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const body = await req.json();
    const { id, ...dataToUpdate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const existing = await prisma.bankAccountEntry.findUnique({ where: { id } });
    if (!existing || existing.accountId !== account.id) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (dataToUpdate.amount !== undefined) {
      dataToUpdate.amount = Number(dataToUpdate.amount);
      dataToUpdate.rawAmount = String(dataToUpdate.amount);
    }
    if (dataToUpdate.paidAmount !== undefined) dataToUpdate.paidAmount = Number(dataToUpdate.paidAmount);
    if (dataToUpdate.receivedAmount !== undefined) dataToUpdate.receivedAmount = Number(dataToUpdate.receivedAmount);
    if (dataToUpdate.netAmount !== undefined) dataToUpdate.netAmount = Number(dataToUpdate.netAmount);

    if (body.meta) {
      dataToUpdate.meta = typeof body.meta === 'string' ? body.meta : JSON.stringify(body.meta);
    }

    const updated = await prisma.bankAccountEntry.update({
      where: { id },
      data: dataToUpdate,
    });

    // Create version snapshot for audit & revert history
    const vCount = await prisma.bankAccountEntryVersion.count({ where: { entryId: id } });
    await prisma.bankAccountEntryVersion.create({
      data: {
        entryId: id,
        versionNumber: vCount + 1,
        snapshotData: JSON.stringify(existing),
        changeReason: body.changeReason || `Updated entry ${updated.particulars} (Amount: ₹${updated.amount})`,
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'BankAccountEntry',
      entityId: id,
      previousState: JSON.stringify(existing),
      newState: JSON.stringify(updated),
      reason: `Updated entry ${updated.particulars} in ${account.accountName}`,
    });

    // Centralized Ledger Update & Bank Balance Synchronization
    const pStatus = body.paymentStatus || (Number(updated.paidAmount) > 0 ? 'PAID' : Number(updated.receivedAmount) > 0 ? 'RECEIVED' : 'PENDING');
    try {
      await postToCentralLedger({
        sourceModule: 'SUPPORTING_ACCOUNT',
        sourceAccountSlug: slug,
        sourceRecordId: updated.id,
        transactionDate: updated.entryDate || undefined,
        financialMonth: updated.periodCode || 'Nov-26',
        financialYear: '2026-27',
        categoryName: updated.category || 'General',
        companyOrParty: updated.sourceReference || undefined,
        description: `${account.accountName}: ${updated.particulars}`,
        amount: updated.amount,
        transactionType: Number(updated.amount) < 0 || pStatus === 'PAID' ? 'EXPENSE' : 'INCOME',
        paymentStatus: pStatus,
        paymentMode: body.paymentMode || 'BANK_TRANSFER',
        bankTxnReference: body.bankTxnReference || updated.sourceReference || undefined,
        remarks: updated.remarks || undefined,
        user: { id: user.id, email: user.email },
      });
    } catch (ledgerErr) {
      console.error('Failed to sync updated entry with central ledger:', ledgerErr);
    }

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: any) {
    console.error('Error updating bank entry:', err);
    return NextResponse.json({ error: err.message || 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'DELETE_FINANCE')) {
    return NextResponse.json(
      { error: 'Forbidden: View-only accounts cannot delete financial entries.' },
      { status: 403 }
    );
  }

  try {
    const { slug } = params;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const existing = await prisma.bankAccountEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Soft delete
    const updated = await prisma.bankAccountEntry.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    // Add to Recycle Bin
    await prisma.recycleBinItem.create({
      data: {
        entityType: 'BankAccountEntry',
        entityId: id,
        displayName: `${existing.particulars} (₹${existing.amount})`,
        deletedByEmail: user.email,
        snapshotData: JSON.stringify(existing),
        restoreStatus: 'DELETED',
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'DELETE',
      module: 'BANK_ACCOUNTS',
      entityType: 'BankAccountEntry',
      entityId: id,
      previousState: JSON.stringify(existing),
      newState: JSON.stringify(updated),
      reason: `Soft-deleted entry ${existing.particulars} from bank account`,
    });

    // Reverse in Central Ledger & Restore any deducted/credited bank cash
    try {
      await reverseInCentralLedger(id, { id: user.id, email: user.email }, `Entry deleted from ${slug}`);
    } catch (e) {
      console.error('Error reversing in central ledger:', e);
    }

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: any) {
    console.error('Error deleting bank entry:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete entry' }, { status: 500 });
  }
}

