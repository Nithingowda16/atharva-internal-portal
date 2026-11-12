import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'EXPORT_DATA');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden: Super Admin privileges required to export.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const financialYear = searchParams.get('financialYear');
    const financialMonth = searchParams.get('financialMonth');
    const siteName = searchParams.get('siteName');

    const where: any = { isDeleted: false };
    if (financialYear && financialYear !== 'ALL') where.financialYear = financialYear;
    if (financialMonth && financialMonth !== 'ALL') where.financialMonth = financialMonth;
    if (siteName && siteName !== 'ALL') where.siteName = siteName;

    const records = await prisma.fuelCommissionRecord.findMany({
      where,
      orderBy: [{ commissionDate: 'asc' }],
    });

    const headers = [
      'Financial Year',
      'Month',
      'Date',
      'Site / Company',
      'Vehicle Number',
      'Category',
      'Amount (INR)',
      'Received (INR)',
      'Pending (INR)',
      'Status',
      'Description',
      'Reference',
      'Bank Ref',
      'Remarks',
    ];

    const csvRows = [headers.join(',')];

    for (const r of records) {
      const row = [
        `"${r.financialYear}"`,
        `"${r.financialMonth}"`,
        `"${r.commissionDate}"`,
        `"${r.siteName}"`,
        `"${r.vehicleNumber || ''}"`,
        `"${r.category}"`,
        r.amount.toFixed(2),
        r.receivedAmount.toFixed(2),
        r.pendingAmount.toFixed(2),
        `"${r.status}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${(r.transactionReference || '').replace(/"/g, '""')}"`,
        `"${(r.bankReference || '').replace(/"/g, '""')}"`,
        `"${(r.remarks || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Fuel_Commission_Statement_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('Error exporting Fuel Commission CSV:', err);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

