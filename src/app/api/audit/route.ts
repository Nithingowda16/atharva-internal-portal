import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduleFilter = searchParams.get('module');
  const actionFilter = searchParams.get('action');
  const userFilter = searchParams.get('user');

  const where: any = {};
  if (moduleFilter && moduleFilter !== 'ALL') where.module = moduleFilter;
  if (actionFilter && actionFilter !== 'ALL') where.action = actionFilter;
  if (userFilter) where.userEmail = { contains: userFilter };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ logs });
}

