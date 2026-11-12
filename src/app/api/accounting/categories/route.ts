import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const accountSlug = searchParams.get('accountSlug');
    const transactionType = searchParams.get('transactionType');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: any = {};
    if (activeOnly) where.isActive = true;
    if (transactionType && transactionType !== 'ALL') where.transactionType = transactionType;

    if (accountSlug && accountSlug !== 'ALL') {
      where.OR = [
        { assignedAccountSlug: 'ALL' },
        { assignedAccountSlug: accountSlug },
      ];
    }

    const categories = await prisma.accountingCategory.findMany({
      where,
      orderBy: [{ reportingGroup: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, categories });
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'EDIT_FINANCE');
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden: Super Admin privileges required to create accounting categories.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      name,
      description,
      assignedAccountSlug = 'ALL',
      transactionType = 'EXPENSE',
      defaultClassification = 'DEBIT',
      isCashImpact = true,
      requiresConfirmation = true,
      reportingGroup = 'OPERATING',
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check unique
    const existing = await prisma.accountingCategory.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      if (!existing.isActive) {
        // Re-activate
        const updated = await prisma.accountingCategory.update({
          where: { id: existing.id },
          data: { isActive: true, description, assignedAccountSlug, transactionType },
        });
        return NextResponse.json({ success: true, category: updated });
      }
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }

    const category = await prisma.accountingCategory.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        assignedAccountSlug,
        transactionType,
        defaultClassification,
        isCashImpact,
        requiresConfirmation,
        reportingGroup,
        createdById: user.id,
        createdByEmail: user.email,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'CREATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'AccountingCategory',
      entityId: category.id,
      previousState: null,
      newState: category,
      reason: `Created accounting category: ${category.name} (${category.transactionType})`,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating category:', err);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

