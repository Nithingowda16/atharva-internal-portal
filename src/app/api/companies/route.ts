import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' },
  });

  // Calculate stats for each company from billing lines
  const lines = await prisma.billingLine.findMany({
    where: { isDeleted: false },
    select: {
      companyName: true,
      billingAmount: true,
      kmOrTrips: true,
    },
  });

  const statsMap = new Map<string, { totalAmount: number; tripCount: number }>();
  for (const l of lines) {
    const cur = statsMap.get(l.companyName) || { totalAmount: 0, tripCount: 0 };
    cur.totalAmount += l.billingAmount;
    cur.tripCount += l.kmOrTrips || 1;
    statsMap.set(l.companyName, cur);
  }

  const result = companies.map((c) => {
    const stats = statsMap.get(c.name) || { totalAmount: 0, tripCount: 0 };
    return {
      ...c,
      totalBilled: Math.round(stats.totalAmount * 100) / 100,
      totalTrips: Math.round(stats.tripCount),
    };
  });

  return NextResponse.json({ companies: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, defaultRate, category } = await req.json();
    if (!name) return NextResponse.json({ error: 'Company name is required' }, { status: 400 });

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        defaultRate: parseFloat(defaultRate) || null,
        category: category || null,
        isActive: true,
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'CREATE',
      module: 'BILLING',
      entityType: 'Company',
      entityId: company.id,
      newState: company,
      reason: 'Added new client company',
    });

    return NextResponse.json({ success: true, company });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create company' }, { status: 500 });
  }
}

