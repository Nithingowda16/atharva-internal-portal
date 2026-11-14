import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { postToCentralLedger } from '@/lib/accountingLedger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'IMPORT_DATA')) {
    return NextResponse.json(
      { error: 'Forbidden: View-only accounts cannot import financial data.' },
      { status: 403 }
    );
  }

  try {
    const { slug } = params;
    const account = await prisma.bankAccount.findUnique({
      where: { accountSlug: slug },
    });

    if (!account || account.isDeleted) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const body = await req.json();
    const { records, sourceFileName, worksheetName } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided for import' }, { status: 400 });
    }

    // Existing active entries in DB for duplicate checking
    const existingEntries = await prisma.bankAccountEntry.findMany({
      where: { accountId: account.id, isDeleted: false },
    });

    // Filter genuinely missing records and eliminate duplicates
    const validatedRecords: any[] = [];
    const skippedRecords: any[] = [];

    for (const r of records) {
      if (!r.particulars || r.amount === undefined) {
        skippedRecords.push({ record: r, reason: 'Missing particulars or amount' });
        continue;
      }

      const numAmount = Number(r.amount);
      const cleanPeriod = (r.periodCode || '').trim().toLowerCase();
      const cleanPart = (r.particulars || '').trim().toLowerCase();

      // Check if an identical record already exists in DB
      const isDuplicate = existingEntries.some((existing) => {
        const exPeriod = (existing.periodCode || '').trim().toLowerCase();
        const exPart = (existing.particulars || '').trim().toLowerCase();
        const exAmt = existing.amount;
        const exRow = existing.rowIndex;

        // Exact match on row or (period + particulars + amount)
        if (r.rowIndex && exRow && r.rowIndex === exRow && Math.abs(exAmt - numAmount) < 0.01) {
          return true;
        }
        return exPeriod === cleanPeriod && exPart === cleanPart && Math.abs(exAmt - numAmount) < 0.01;
      });

      if (isDuplicate) {
        skippedRecords.push({ record: r, reason: 'Exact duplicate already exists in database' });
        continue;
      }

      validatedRecords.push({
        accountId: account.id,
        periodCode: r.periodCode || '2026',
        entryDate: r.entryDate || new Date().toISOString().split('T')[0],
        section: r.section || 'GENERAL',
        category: r.category || account.accountName,
        particulars: String(r.particulars).trim(),
        sourceReference: r.sourceReference ? String(r.sourceReference).trim() : null,
        amount: numAmount,
        rawAmount: String(r.amount),
        formulaString: r.formulaString ? String(r.formulaString).trim() : null,
        paidAmount: r.paidAmount !== undefined && r.paidAmount !== null ? Number(r.paidAmount) : null,
        receivedAmount: r.receivedAmount !== undefined && r.receivedAmount !== null ? Number(r.receivedAmount) : null,
        netAmount: r.netAmount !== undefined && r.netAmount !== null ? Number(r.netAmount) : null,
        invoicedAmount: r.invoicedAmount !== undefined && r.invoicedAmount !== null ? Number(r.invoicedAmount) : null,
        invoiceDate: r.invoiceDate || null,
        invoiceNo: r.invoiceNo || null,
        comments: r.comments ? String(r.comments).trim() : null,
        remarks: r.remarks ? String(r.remarks).trim() : `Imported from ${sourceFileName || 'Excel'} [Sheet: ${worksheetName || slug}]`,
        rowIndex: r.rowIndex ? Number(r.rowIndex) : null,
        meta: JSON.stringify({
          sourceFileName: sourceFileName || 'Excel Import',
          worksheetName: worksheetName || slug,
          importedAt: new Date().toISOString(),
          importedBy: user.email,
          paymentStatus: r.paymentStatus || (Number(r.paidAmount) > 0 ? 'PAID' : Number(r.receivedAmount) > 0 ? 'RECEIVED' : 'PENDING'),
        }),
      });
    }

    if (validatedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new missing records to import. All records already exist.',
        importedCount: 0,
        skippedCount: skippedRecords.length,
        skippedRecords,
      });
    }

    // Execute atomic batch insert in Prisma transaction
    const insertedEntries = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const data of validatedRecords) {
        const entry = await tx.bankAccountEntry.create({ data });

        // Version 1 snapshot
        await tx.bankAccountEntryVersion.create({
          data: {
            entryId: entry.id,
            versionNumber: 1,
            snapshotData: JSON.stringify(entry),
            changeReason: `Batch imported from ${sourceFileName || 'Excel'} (${worksheetName || slug})`,
            createdById: user.id,
            createdByEmail: user.email,
          },
        });

        results.push(entry);
      }
      return results;
    });

    // Central Ledger postings for entries marked PAID or RECEIVED
    for (const entry of insertedEntries) {
      const meta = entry.meta ? JSON.parse(entry.meta) : {};
      const pStatus = meta.paymentStatus || 'PENDING';

      if (pStatus === 'PAID' || pStatus === 'RECEIVED') {
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
            paymentMode: 'BANK_TRANSFER',
            bankTxnReference: entry.sourceReference || undefined,
            remarks: entry.remarks || undefined,
            user: { id: user.id, email: user.email },
          });
        } catch (ledgerErr) {
          console.error(`Ledger posting failed for imported entry ${entry.id}:`, ledgerErr);
        }
      }
    }

    // Audit Log
    await logAudit({
      userEmail: user.email,
      action: 'IMPORT',
      module: 'BANK_ACCOUNTS',
      entityType: 'BankAccountEntry',
      entityId: account.id,
      newState: JSON.stringify({ count: insertedEntries.length, accountSlug: slug }),
      reason: `Batch imported ${insertedEntries.length} missing records into ${account.accountName} from ${sourceFileName || 'Excel'}`,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedEntries.length} missing records.`,
      importedCount: insertedEntries.length,
      skippedCount: skippedRecords.length,
      entries: insertedEntries,
    });
  } catch (err: any) {
    console.error('Error during batch excel import:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to import excel records' },
      { status: 500 }
    );
  }
}

