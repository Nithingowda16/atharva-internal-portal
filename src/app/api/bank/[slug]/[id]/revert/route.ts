import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { postToCentralLedger } from '@/lib/accountingLedger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'REVERT_VERSIONS')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot revert record versions.' }, { status: 403 });
  }

  try {
    const { slug, id } = params;
    const body = await req.json();
    const { versionNumber } = body;

    if (!versionNumber) {
      return NextResponse.json({ error: 'versionNumber is required to revert.' }, { status: 400 });
    }

    const targetVersion = await prisma.bankAccountEntryVersion.findFirst({
      where: {
        entryId: id,
        versionNumber: Number(versionNumber),
      },
    });

    if (!targetVersion) {
      return NextResponse.json({ error: `Version ${versionNumber} not found.` }, { status: 404 });
    }

    const currentRecord = await prisma.bankAccountEntry.findUnique({
      where: { id },
      include: {
        account: true,
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!currentRecord) {
      return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
    }

    const snapshot = JSON.parse(targetVersion.snapshotData);
    const nextVersionNumber = (currentRecord.versions[0]?.versionNumber || 1) + 1;

    const reverted = await prisma.$transaction(async (tx) => {
      // Record new version snapshot documenting the reversion
      await tx.bankAccountEntryVersion.create({
        data: {
          entryId: id,
          versionNumber: nextVersionNumber,
          snapshotData: JSON.stringify(currentRecord),
          changeReason: `Reverted to version ${versionNumber} (originally saved on ${targetVersion.createdAt.toISOString()})`,
          createdById: user.id,
          createdByEmail: user.email,
        },
      });

      // Restore fields from snapshotData
      return await tx.bankAccountEntry.update({
        where: { id },
        data: {
          periodCode: snapshot.periodCode,
          entryDate: snapshot.entryDate,
          section: snapshot.section,
          category: snapshot.category,
          particulars: snapshot.particulars,
          sourceReference: snapshot.sourceReference,
          amount: snapshot.amount,
          rawAmount: snapshot.rawAmount,
          formulaString: snapshot.formulaString,
          paidAmount: snapshot.paidAmount,
          receivedAmount: snapshot.receivedAmount,
          netAmount: snapshot.netAmount,
          invoicedAmount: snapshot.invoicedAmount,
          invoiceDate: snapshot.invoiceDate,
          invoiceNo: snapshot.invoiceNo,
          comments: snapshot.comments,
          remarks: `Reverted to version ${versionNumber}`,
          meta: snapshot.meta,
          isDeleted: false,
        },
      });
    });

    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'BankAccountEntry',
      entityId: id,
      previousState: JSON.stringify(currentRecord),
      newState: JSON.stringify(reverted),
      reason: `Reverted entry "${reverted.particulars}" to version ${versionNumber} in ${currentRecord.account.accountName}`,
    });

    // Sync to Central Ledger
    try {
      const pStatus = Number(reverted.paidAmount) > 0 ? 'PAID' : Number(reverted.receivedAmount) > 0 ? 'RECEIVED' : 'PENDING';
      await postToCentralLedger({
        sourceModule: 'SUPPORTING_ACCOUNT',
        sourceAccountSlug: slug,
        sourceRecordId: reverted.id,
        transactionDate: reverted.entryDate || undefined,
        financialMonth: reverted.periodCode || 'Nov-26',
        financialYear: '2026-27',
        categoryName: reverted.category || 'General',
        companyOrParty: reverted.sourceReference || undefined,
        description: `${currentRecord.account.accountName}: ${reverted.particulars}`,
        amount: reverted.amount,
        transactionType: Number(reverted.amount) < 0 || pStatus === 'PAID' ? 'EXPENSE' : 'INCOME',
        paymentStatus: pStatus,
        paymentMode: 'BANK_TRANSFER',
        remarks: reverted.remarks || undefined,
        user: { id: user.id, email: user.email },
      });
    } catch (e) {
      console.error('Error syncing reverted entry to central ledger:', e);
    }

    return NextResponse.json({ success: true, entry: reverted });
  } catch (err: any) {
    console.error('Error reverting bank entry version:', err);
    return NextResponse.json({ error: err.message || 'Failed to revert version' }, { status: 500 });
  }
}

