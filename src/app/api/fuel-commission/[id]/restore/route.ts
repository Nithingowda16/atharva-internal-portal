import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'RESTORE_FINANCE');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
  }

  try {
    const existing = await prisma.fuelCommissionRecord.findUnique({
      where: { id: params.id },
    });

    if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const restored = await prisma.fuelCommissionRecord.update({
      where: { id: params.id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'RESTORE',
      module: 'BANK_ACCOUNTS',
      entityType: 'FuelCommissionRecord',
      entityId: restored.id,
      previousState: existing,
      newState: restored,
      reason: `Restored Fuel Commission entry ${restored.id} from recycle bin`,
    });

    return NextResponse.json({ success: true, record: restored });
  } catch (err: any) {
    console.error('Error restoring Fuel Commission entry:', err);
    return NextResponse.json({ error: 'Failed to restore record' }, { status: 500 });
  }
}

