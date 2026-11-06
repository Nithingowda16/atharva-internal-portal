import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { createNewMonthFromTemplate } from '@/lib/monthCloner';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const periods = await prisma.financialPeriod.findMany({
    where: { isDeleted: false },
    include: {
      _count: {
        select: { monthlyRecords: { where: { isDeleted: false } } },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json({ periods });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'CREATE_MONTH')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create a new month.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { monthCode, periodName, financialYear, startDate, endDate, templatePeriodId, copyRecurringCharges } = body;

    if (!monthCode || !periodName || !templatePeriodId) {
      return NextResponse.json({ error: 'Missing required fields for new month creation' }, { status: 400 });
    }

    const newPeriod = await createNewMonthFromTemplate({
      monthCode,
      periodName,
      financialYear: financialYear || '2026-27',
      startDate: startDate || `${monthCode}-01`,
      endDate: endDate || `${monthCode}-28`,
      templatePeriodId,
      copyRecurringCharges: copyRecurringCharges !== false,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true, period: newPeriod });
  } catch (err: any) {
    console.error('Create month error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create month' }, { status: 500 });
  }
}

