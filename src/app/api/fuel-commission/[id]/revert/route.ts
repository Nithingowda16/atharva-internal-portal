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
    const body = await req.json();
    const { versionId } = body;

    if (!versionId) return NextResponse.json({ error: 'versionId is required' }, { status: 400 });

    const targetVersion = await prisma.fuelCommissionVersion.findUnique({
      where: { id: versionId },
    });

    if (!targetVersion || targetVersion.recordId !== params.id) {
      return NextResponse.json({ error: 'Version snapshot not found' }, { status: 404 });
    }

    const currentRecord = await prisma.fuelCommissionRecord.findUnique({
      where: { id: params.id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!currentRecord) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const snapshot = JSON.parse(targetVersion.snapshotData);
    const nextVersion = (currentRecord.versions[0]?.versionNumber || 1) + 1;

    // Snapshot current state before reverting
    await prisma.fuelCommissionVersion.create({
      data: {
        recordId: currentRecord.id,
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(currentRecord),
        changeReason: `Reverted to version ${targetVersion.versionNumber}`,
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    const reverted = await prisma.fuelCommissionRecord.update({
      where: { id: params.id },
      data: {
        financialYear: snapshot.financialYear,
        financialMonth: snapshot.financialMonth,
        commissionDate: snapshot.commissionDate,
        siteName: snapshot.siteName,
        vehicleNumber: snapshot.vehicleNumber,
        category: snapshot.category,
        amount: snapshot.amount,
        accountingType: snapshot.accountingType,
        status: snapshot.status,
        description: snapshot.description,
        transactionReference: snapshot.transactionReference,
        remarks: snapshot.remarks,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'REVERT',
      module: 'BANK_ACCOUNTS',
      entityType: 'FuelCommissionRecord',
      entityId: reverted.id,
      previousState: currentRecord,
      newState: reverted,
      reason: `Reverted Fuel Commission entry to version #${targetVersion.versionNumber}`,
    });

    return NextResponse.json({ success: true, record: reverted });
  } catch (err: any) {
    console.error('Error reverting Fuel Commission entry:', err);
    return NextResponse.json({ error: 'Failed to revert record' }, { status: 500 });
  }
}

