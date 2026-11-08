import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sheet = searchParams.get('sheet');
  const onlyRef = searchParams.get('onlyRef') === 'true';
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '100');

  const where: any = {};
  if (sheet && sheet !== 'ALL') where.worksheetName = sheet;
  if (onlyRef) where.isRefError = true;
  if (search) {
    where.OR = [
      { cellAddress: { contains: search.toUpperCase() } },
      { rawValue: { contains: search } },
      { formulaString: { contains: search } },
    ];
  }

  const [totalCount, refErrorCount, cells, archives] = await Promise.all([
    prisma.sourceWorkbookCell.count({ where }),
    prisma.sourceWorkbookCell.count({ where: { isRefError: true } }),
    prisma.sourceWorkbookCell.findMany({
      where,
      orderBy: [{ worksheetName: 'asc' }, { rowIndex: 'asc' }, { columnIndex: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sourceFileArchive.findMany({
      orderBy: { uploadTimestamp: 'asc' },
    }),
  ]);

  return NextResponse.json({
    totalCount,
    refErrorCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    cells,
    archives,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: View-only accounts cannot import Excel files.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: 'Direct import must use authorized administrative workflow.' }, { status: 400 });
}

