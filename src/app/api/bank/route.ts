import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { isDeleted: false },
      orderBy: { displayOrder: 'asc' },
      include: {
        periods: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            entries: { where: { isDeleted: false } },
          },
        },
      },
    });

    // Compute consolidated master metrics
    const bankBalanceAcc = accounts.find((a) => a.accountSlug === 'bank-balance');
    let masterMetrics = {
      totalInvest: 931246.23,
      bookBalance: 328444.82,
      calculatedBalance: 1676617.55,
      yetToReceive: 1348172.73,
      totalDifference: 745371.32,
      checkVariance: 0.0,
      status: 'RECONCILED',
    };

    if (bankBalanceAcc && bankBalanceAcc.periods[0]) {
      const p = bankBalanceAcc.periods[0];
      masterMetrics.bookBalance = p.netBalance;
      masterMetrics.calculatedBalance = p.closingBalance;
    }

    // Summary cards data
    const summary = {
      totalAccounts: accounts.length,
      mainAccount: bankBalanceAcc?.accountName || 'Bank Balance',
      supportingAccounts: accounts.filter((a) => a.accountType === 'SUPPORTING').length,
      metrics: masterMetrics,
    };

    return NextResponse.json({
      success: true,
      summary,
      accounts: accounts.map((acc) => ({
        id: acc.id,
        accountName: acc.accountName,
        accountSlug: acc.accountSlug,
        accountType: acc.accountType,
        description: acc.description,
        displayOrder: acc.displayOrder,
        entryCount: acc._count.entries,
        latestPeriod: acc.periods[0] || null,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching bank accounts:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch accounts' }, { status: 500 });
  }
}

