import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = params;
    const record = await prisma.tdsRecord.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!record) return NextResponse.json({ error: 'TDS record not found' }, { status: 404 });

    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot edit TDS records.' }, { status: 403 });
  }

  try {
    const { id } = params;
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
      changeReason,
    } = body;

    if (!changeReason || changeReason.trim() === '') {
      return NextResponse.json({ error: 'A mandatory reason for modification must be provided for audit compliance.' }, { status: 400 });
    }

    const existing = await prisma.tdsRecord.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!existing) return NextResponse.json({ error: 'TDS record not found' }, { status: 404 });

    const nextVersionNumber = (existing.versions[0]?.versionNumber || 1) + 1;
    const numAmount = amount !== undefined ? Number(amount) : existing.amount;

    const updated = await prisma.$transaction(async (tx) => {
      // Create version snapshot of current state before applying updates
      await tx.tdsVersion.create({
        data: {
          tdsRecordId: existing.id,
          versionNumber: nextVersionNumber,
          snapshotData: JSON.stringify(existing),
          changeReason: changeReason.trim(),
          createdById: user.id,
          createdByEmail: user.email,
        },
      });

      return await tx.tdsRecord.update({
        where: { id },
        data: {
          financialYear: financialYear || existing.financialYear,
          financialMonth: financialMonth || existing.financialMonth,
          companyName: companyName || existing.companyName,
          tdsCategory: tdsCategory || existing.tdsCategory,
          amount: numAmount,
          transactionDate: transactionDate || existing.transactionDate,
          tdsReferenceNo: tdsReferenceNo !== undefined ? tdsReferenceNo : existing.tdsReferenceNo,
          invoiceReference: invoiceReference !== undefined ? invoiceReference : existing.invoiceReference,
          accountingType: accountingType || existing.accountingType,
          status: status || existing.status,
          remarks: remarks !== undefined ? remarks : existing.remarks,
          updatedAt: new Date(),
        },
        include: {
          versions: { orderBy: { versionNumber: 'desc' } },
        },
      });
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'UPDATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'TdsRecord',
      entityId: id,
      previousState: existing,
      newState: updated,
      reason: changeReason.trim(),
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (err: any) {
    console.error('Failed to update TDS record:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'DELETE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot delete TDS records.' }, { status: 403 });
  }

  try {
    const { id } = params;
    const existing = await prisma.tdsRecord.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'TDS record not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.tdsRecord.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      await tx.recycleBinItem.create({
        data: {
          entityType: 'TdsRecord',
          entityId: existing.id,
          displayName: `TDS: ${existing.companyName} (${existing.financialMonth}) - ₹${existing.amount}`,
          deletedByEmail: user.email,
          snapshotData: JSON.stringify(existing),
          restoreStatus: 'DELETED',
        },
      });
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'DELETE',
      module: 'BANK_ACCOUNTS',
      entityType: 'TdsRecord',
      entityId: id,
      previousState: existing,
      reason: `Soft-deleted TDS record for ${existing.companyName}`,
    });

    return NextResponse.json({ success: true, message: 'TDS record moved to Recycle Bin' });
  } catch (err: any) {
    console.error('Failed to delete TDS record:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

