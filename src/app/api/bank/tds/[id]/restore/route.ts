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

  if (user.role === 'VIEWER' || !checkPermission(user, 'RESTORE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot restore deleted records.' }, { status: 403 });
  }

  try {
    const { id } = params;
    const existing = await prisma.tdsRecord.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'TDS record not found.' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.tdsRecord.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      await tx.recycleBinItem.updateMany({
        where: {
          entityType: 'TdsRecord',
          entityId: id,
          restoreStatus: 'DELETED',
        },
        data: {
          restoreStatus: 'RESTORED',
        },
      });
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'RESTORE',
      module: 'BANK_ACCOUNTS',
      entityType: 'TdsRecord',
      entityId: id,
      reason: `Restored soft-deleted TDS record for ${existing.companyName}`,
    });

    return NextResponse.json({ success: true, message: 'TDS record restored successfully' });
  } catch (err: any) {
    console.error('Failed to restore TDS record:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

