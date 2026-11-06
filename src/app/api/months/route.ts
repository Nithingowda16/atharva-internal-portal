import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { createNewMonthFromTemplate } from '@/lib/monthCloner';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const {
      monthCode,
      periodName,
      financialYear,
      startDate,
      endDate,
      templatePeriodId,
      copyRecurringCharges,
      creationMode,
    } = body;

    if (!monthCode || !periodName) {
      return NextResponse.json({ error: 'Missing required fields: monthCode and periodName are mandatory.' }, { status: 400 });
    }

    // Check if month already exists
    const existing = await prisma.financialPeriod.findUnique({
      where: { monthCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Financial Month ${periodName} (${monthCode}) already exists. Never overwriting existing historical months.` },
        { status: 400 }
      );
    }

    const isBlank =
      creationMode === 'BLANK' ||
      !templatePeriodId ||
      templatePeriodId === 'BLANK' ||
      templatePeriodId === 'NONE';

    let newPeriod;

    if (isBlank) {
      // 1. Create fresh clean FinancialPeriod with ZERO copied records
      newPeriod = await prisma.financialPeriod.create({
        data: {
          monthCode,
          periodName,
          financialYear: financialYear || '2026-27',
          startDate: startDate || `${monthCode}-01`,
          endDate: endDate || `${monthCode}-28`,
          status: 'Draft',
          templateSourceId: null,
          grossBilling: 0,
          totalDeductions: 0,
          netPayable: 0,
          totalPaid: 0,
        },
      });

      // 2. Audit log
      await logAudit({
        userEmail: user.email,
        action: 'CREATE',
        module: 'MONTHLY_FINANCE',
        entityType: 'FinancialPeriod',
        entityId: newPeriod.id,
        previousState: null,
        newState: { monthCode, periodName, mode: 'BLANK', initialRecords: 0 },
        reason: 'Created clean blank financial month with zero copied records',
      });
    } else {
      // Create from selected template
      newPeriod = await createNewMonthFromTemplate({
        monthCode,
        periodName,
        financialYear: financialYear || '2026-27',
        startDate: startDate || `${monthCode}-01`,
        endDate: endDate || `${monthCode}-28`,
        templatePeriodId,
        copyRecurringCharges: copyRecurringCharges !== false,
        userEmail: user.email,
      });
    }

    return NextResponse.json({ success: true, period: newPeriod });
  } catch (err: any) {
    console.error('Create month error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create month' }, { status: 500 });
  }
}
