import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const deletedRecords = await prisma.fuelCommissionRecord.findMany({
      where: { isDeleted: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, records: deletedRecords });
  } catch (err: any) {
    console.error('Error fetching Fuel Commission recycle bin:', err);
    return NextResponse.json({ error: 'Failed to fetch recycle bin' }, { status: 500 });
  }
}

