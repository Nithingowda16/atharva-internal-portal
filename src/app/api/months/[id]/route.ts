import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

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

