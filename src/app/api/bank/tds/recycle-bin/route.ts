import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const deletedRecords = await prisma.tdsRecord.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });

    return NextResponse.json({ success: true, records: deletedRecords });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

