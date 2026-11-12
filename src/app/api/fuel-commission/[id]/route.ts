import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const record = await prisma.fuelCommissionRecord.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    console.error('Error fetching Fuel Commission record:', err);
    return NextResponse.json({ error: 'Failed to retrieve record' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'EDIT_FINANCE');
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden: Super Admin privileges required to edit fuel commission entries.' },
      { status: 403 }
    );
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
    const {
      financialYear,
      financialMonth,
      commissionDate,
      siteName,
      vehicleNumber,
      category,
      amount,
      accountingType,
      status,
      description,
      transactionReference,
      remarks,
      changeReason,
    } = body;

    if (!changeReason || !changeReason.trim()) {
      return NextResponse.json(
        { error: 'A mandatory audit change reason is required to update historical records.' },
        { status: 400 }
      );
    }

    const numAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    const latestVersion = existing.versions[0]?.versionNumber || 1;
    const nextVersion = latestVersion + 1;

    // Snapshot existing before update
    await prisma.fuelCommissionVersion.create({
      data: {
        recordId: existing.id,
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(existing),
        changeReason: changeReason.trim(),
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    const updated = await prisma.fuelCommissionRecord.update({
      where: { id: params.id },
      data: {
        financialYear: financialYear || existing.financialYear,
        financialMonth: financialMonth || existing.financialMonth,
        commissionDate: commissionDate || existing.commissionDate,
        siteName: siteName ? siteName.trim() : existing.siteName,
        vehicleNumber: vehicleNumber !== undefined ? (vehicleNumber ? vehicleNumber.trim() : null) : existing.vehicleNumber,
        category: category || existing.category,
        amount: numAmount,
        accountingType: accountingType || existing.accountingType,
        status: status || existing.status,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        transactionReference: transactionReference !== undefined ? (transactionReference ? transactionReference.trim() : null) : existing.transactionReference,
        remarks: remarks !== undefined ? (remarks ? remarks.trim() : null) : existing.remarks,
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
      reason: `Updated Fuel Commission: ${changeReason.trim()}`,
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (err: any) {
    console.error('Error updating Fuel Commission entry:', err);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'DELETE_FINANCE');
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden: Super Admin privileges required to delete fuel commission entries.' },
      { status: 403 }
    );
  }

  try {
    const existing = await prisma.fuelCommissionRecord.findUnique({
      where: { id: params.id },
    });

    if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    // Soft delete
    const softDeleted = await prisma.fuelCommissionRecord.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    // Also register in portal RecycleBinItem if available
    try {
      await prisma.recycleBinItem.create({
        data: {
          entityType: 'FUEL_COMMISSION',
          entityId: existing.id,
          displayName: `Fuel Commission - ${existing.siteName} (₹${existing.amount})`,
          snapshotData: JSON.stringify(existing),
          deletedByEmail: user.email,
        },
      });
    } catch (e) {
      // RecycleBinItem optional logging
    }

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'DELETE',
      module: 'BANK_ACCOUNTS',
      entityType: 'FuelCommissionRecord',
      entityId: existing.id,
      previousState: existing,
      newState: softDeleted,
      reason: `Soft deleted Fuel Commission entry ${existing.id} (${existing.siteName} ₹${existing.amount})`,
    });

    return NextResponse.json({ success: true, message: 'Record moved to recycle bin.' });
  } catch (err: any) {
    console.error('Error soft-deleting Fuel Commission entry:', err);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}

