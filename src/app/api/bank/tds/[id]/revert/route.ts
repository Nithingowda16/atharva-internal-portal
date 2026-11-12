import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'REVERT_VERSIONS')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot revert record versions.' }, { status: 403 });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { versionNumber } = body;

    if (!versionNumber) {
      return NextResponse.json({ error: 'versionNumber is required to revert.' }, { status: 400 });
    }

    const targetVersion = await prisma.tdsVersion.findFirst({
      where: {
        tdsRecordId: id,
        versionNumber: Number(versionNumber),
      },
    });

    if (!targetVersion) {
      return NextResponse.json({ error: `Version ${versionNumber} not found.` }, { status: 404 });
    }

    const currentRecord = await prisma.tdsRecord.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!currentRecord) return NextResponse.json({ error: 'TDS record not found.' }, { status: 404 });

    const snapshot = JSON.parse(targetVersion.snapshotData);
    const nextVersionNumber = (currentRecord.versions[0]?.versionNumber || 1) + 1;

    const reverted = await prisma.$transaction(async (tx) => {
      // Record new version snapshot documenting the reversion
      await tx.tdsVersion.create({
        data: {
          tdsRecordId: id,
          versionNumber: nextVersionNumber,
          snapshotData: JSON.stringify(currentRecord),
          changeReason: `Reverted to version ${versionNumber} (originally saved on ${targetVersion.createdAt.toISOString()})`,
          createdById: user.id,
          createdByEmail: user.email,
        },
      });

      return await tx.tdsRecord.update({
        where: { id },
        data: {
          financialYear: snapshot.financialYear,
          financialMonth: snapshot.financialMonth,
          companyName: snapshot.companyName,
          tdsCategory: snapshot.tdsCategory,
          amount: Number(snapshot.amount),
          transactionDate: snapshot.transactionDate,
          tdsReferenceNo: snapshot.tdsReferenceNo,
          invoiceReference: snapshot.invoiceReference,
          accountingType: snapshot.accountingType,
          status: snapshot.status,
          remarks: snapshot.remarks,
          updatedAt: new Date(),
        },
      });
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'REVERT',
      module: 'BANK_ACCOUNTS',
      entityType: 'TdsRecord',
      entityId: id,
      previousState: currentRecord,
      newState: reverted,
      reason: `Reverted TDS record to version ${versionNumber}`,
    });

    return NextResponse.json({ success: true, record: reverted });
  } catch (err: any) {
    console.error('Failed to revert TDS record:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

