import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const account = await prisma.bankAccount.findUnique({
      where: { accountSlug: params.slug },
      include: {
        periods: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, periods: account.periods });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'CREATE_MONTH')) {
    return NextResponse.json(
      { error: 'Forbidden: View-only accounts cannot create or modify accounting periods.' },
      { status: 403 }
    );
  }

  try {
    const account = await prisma.bankAccount.findUnique({
      where: { accountSlug: params.slug },
      include: { periods: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const body = await req.json();
    const { periodCode, periodLabel, openingBalance, remarks, carryForward } = body;

    if (!periodCode || !periodLabel) {
      return NextResponse.json({ error: 'periodCode and periodLabel are required' }, { status: 400 });
    }

    let calculatedOpening = Number(openingBalance) || 0;
    if (carryForward && account.periods[0]) {
      calculatedOpening = account.periods[0].closingBalance;
    }

    const newPeriod = await prisma.bankAccountPeriod.upsert({
      where: {
        accountId_periodCode: {
          accountId: account.id,
          periodCode,
        },
      },
      update: {
        periodLabel,
        openingBalance: calculatedOpening,
        remarks: remarks || null,
      },
      create: {
        accountId: account.id,
        periodCode,
        periodLabel,
        openingBalance: calculatedOpening,
        closingBalance: calculatedOpening,
        netBalance: calculatedOpening,
        status: 'ACTIVE',
        remarks: remarks || null,
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'CREATE_MONTH',
      module: 'BANK_ACCOUNTS',
      entityType: 'BankAccountPeriod',
      entityId: newPeriod.id,
      newState: JSON.stringify(newPeriod),
      reason: `Created future financial period ${periodLabel} for ${account.accountName} with opening balance ₹${calculatedOpening.toFixed(2)}`,
    });

    return NextResponse.json({ success: true, period: newPeriod });
  } catch (err: any) {
    console.error('Error creating bank period:', err);
    return NextResponse.json({ error: err.message || 'Failed to create period' }, { status: 500 });
  }
}

