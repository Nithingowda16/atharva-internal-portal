import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'EXPORT_DATA')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot export financial data.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const financialYear = searchParams.get('financialYear');
    const companyName = searchParams.get('companyName');

    const where: any = { isDeleted: false };
    if (financialYear && financialYear !== 'ALL') where.financialYear = financialYear;
    if (companyName && companyName !== 'ALL') where.companyName = companyName;

    const records = await prisma.tdsRecord.findMany({
      where,
      orderBy: [{ transactionDate: 'desc' }],
    });

    // Generate CSV
    const headers = [
      'ID',
      'Financial Year',
      'Financial Month',
      'Transaction Date',
      'Company Name',
      'TDS Category',
      'TDS Amount (INR)',
      'Accounting Type',
      'Status',
      'TDS Reference No',
      'Invoice Reference',
      'Remarks',
      'Created By',
      'Created At',
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.financialYear}"`,
      `"${r.financialMonth}"`,
      `"${r.transactionDate}"`,
      `"${r.companyName}"`,
      `"${r.tdsCategory}"`,
      r.amount.toFixed(2),
      `"${r.accountingType}"`,
      `"${r.status}"`,
      `"${r.tdsReferenceNo || ''}"`,
      `"${r.invoiceReference || ''}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
      `"${r.createdByEmail || ''}"`,
      `"${r.createdAt.toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'EXPORT',
      module: 'BANK_ACCOUNTS',
      entityType: 'TdsRecord',
      reason: `Exported ${records.length} TDS records as CSV`,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Atharva_Travels_TDS_Statement_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

