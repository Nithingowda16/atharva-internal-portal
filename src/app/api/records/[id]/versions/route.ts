import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { revertRecordToVersion } from '@/lib/versioning';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const versions = await prisma.recordVersion.findMany({
    where: { recordId: params.id },
    orderBy: { versionNumber: 'desc' },
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
    },
  });

  return NextResponse.json({ versions });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'REVERT_VERSIONS')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to revert record versions.' }, { status: 403 });
  }

  try {
    const { targetVersion } = await req.json();

    if (!targetVersion) {
      return NextResponse.json({ error: 'targetVersion is required' }, { status: 400 });
    }

    await revertRecordToVersion(params.id, parseInt(targetVersion), user.email);

    const refreshed = await prisma.vehicleMonthlyRecord.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
        period: true,
        billingLines: { where: { isDeleted: false } },
        adjustments: { where: { isDeleted: false } },
        payments: { where: { isDeleted: false } },
      },
    });

    return NextResponse.json({ success: true, message: `Successfully reverted to version ${targetVersion}`, record: refreshed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to revert version' }, { status: 500 });
  }
}

