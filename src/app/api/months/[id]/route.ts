import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const period = await prisma.financialPeriod.findUnique({
    where: { id: params.id },
    include: {
      monthlyRecords: {
        where: { isDeleted: false },
        include: {
          vehicle: true,
          billingLines: { where: { isDeleted: false } },
          adjustments: { where: { isDeleted: false } },
        },
        orderBy: { sectionIndex: 'asc' },
      },
    },
  });

  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

  return NextResponse.json({ period });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status, reason } = await req.json();

  const prev = await prisma.financialPeriod.findUnique({ where: { id: params.id } });
  if (!prev) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

  const updated = await prisma.financialPeriod.update({
    where: { id: params.id },
    data: { status },
  });

  await logAudit({
    userEmail: user.email,
    action: status === 'Approved' ? 'APPROVE' : 'UPDATE',
    module: 'MONTHLY_FINANCE',
    entityType: 'FinancialPeriod',
    entityId: params.id,
    previousState: { status: prev.status },
    newState: { status: updated.status },
    reason: reason || `Updated month status to ${status}`,
  });

  return NextResponse.json({ success: true, period: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'DELETE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete months.' }, { status: 403 });
  }

  const period = await prisma.financialPeriod.findUnique({
    where: { id: params.id },
    include: { monthlyRecords: true },
  });

  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

  // Safety safeguard: Never allow deletion of the core reconciled historical periods
  if (period.monthCode === '2026-08' || period.monthCode === '2026-09') {
    return NextResponse.json(
      { error: 'Strict Immutability: August 2026 and September 2026 are baseline reconciled Excel periods and cannot be deleted.' },
      { status: 403 }
    );
  }

  // Delete child records for this period
  await prisma.financialAdjustment.deleteMany({
    where: { record: { periodId: params.id } },
  });
  await prisma.billingLine.deleteMany({
    where: { record: { periodId: params.id } },
  });
  await prisma.paymentTransaction.deleteMany({
    where: { record: { periodId: params.id } },
  });
  await prisma.recordVersion.deleteMany({
    where: { record: { periodId: params.id } },
  });
  await prisma.vehicleMonthlyRecord.deleteMany({
    where: { periodId: params.id },
  });
  await prisma.financialPeriod.delete({
    where: { id: params.id },
  });

  await logAudit({
    userEmail: user.email,
    action: 'DELETE',
    module: 'MONTHLY_FINANCE',
    entityType: 'FinancialPeriod',
    entityId: params.id,
    previousState: { monthCode: period.monthCode, periodName: period.periodName },
    newState: null,
    reason: `Deleted financial period ${period.periodName} (${period.monthCode})`,
  });

  return NextResponse.json({ success: true, message: `Month ${period.periodName} deleted successfully.` });
}
