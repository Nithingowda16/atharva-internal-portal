import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'EDIT_FINANCE');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
  }

  try {
    const existing = await prisma.fuelCommissionRecord.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const body = await req.json();
    const { receiptAmount, bankReference, receiptDate } = body;

    const numReceipt = parseFloat(receiptAmount);
    if (isNaN(numReceipt) || numReceipt <= 0) {
      return NextResponse.json({ error: 'A valid positive receipt amount is required.' }, { status: 400 });
    }

    const newReceived = (existing.receivedAmount || 0) + numReceipt;
    const newPending = Math.max(0, existing.amount - newReceived);
    const newStatus = newPending <= 0.01 ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    const latestVersion = existing.versions[0]?.versionNumber || 1;
    const nextVersion = latestVersion + 1;

    // Snapshot before updating receipt
    await prisma.fuelCommissionVersion.create({
      data: {
        recordId: existing.id,
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(existing),
        changeReason: `Recorded bank receipt of ₹${numReceipt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Ref: ${bankReference || 'Bank Deposit'})`,
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    const updated = await prisma.fuelCommissionRecord.update({
      where: { id: params.id },
      data: {
        receivedAmount: newReceived,
        pendingAmount: newPending,
        status: newStatus,
        bankReference: bankReference ? bankReference.trim() : existing.bankReference,
        commissionDate: receiptDate || existing.commissionDate,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'UPDATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'FuelCommissionRecord',
      entityId: updated.id,
      previousState: existing,
      newState: updated,
      reason: `Recorded bank deposit receipt for ${updated.siteName}: ₹${numReceipt} (Pending: ₹${newPending})`,
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (err: any) {
    console.error('Error recording Fuel Commission receipt:', err);
    return NextResponse.json({ error: 'Failed to record receipt' }, { status: 500 });
  }
}

