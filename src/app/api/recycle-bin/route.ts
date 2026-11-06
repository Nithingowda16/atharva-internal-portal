import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { restoreRecord, permanentPurgeRecord } from '@/lib/softDelete';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.recycleBinItem.findMany({
    where: { restoreStatus: 'DELETED' },
    orderBy: { deletedAt: 'desc' },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'RESTORE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to restore records.' }, { status: 403 });
  }

  try {
    const { itemId, action } = await req.json();

    if (!itemId) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

    if (action === 'RESTORE') {
      await restoreRecord(itemId, user.email);
      return NextResponse.json({ success: true, message: 'Record restored successfully' });
    } else if (action === 'PURGE') {
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Only Super Admin can permanently purge records.' }, { status: 403 });
      }
      await permanentPurgeRecord(itemId, user.email);
      return NextResponse.json({ success: true, message: 'Record permanently purged' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}

