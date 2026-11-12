import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'EDIT_FINANCE');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
  }

  try {
    const existing = await prisma.accountingCategory.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const body = await req.json();
    const {
      description,
      assignedAccountSlug,
      transactionType,
      defaultClassification,
      isCashImpact,
      requiresConfirmation,
      reportingGroup,
      isActive,
    } = body;

    const updated = await prisma.accountingCategory.update({
      where: { id: params.id },
      data: {
        description: description !== undefined ? description : existing.description,
        assignedAccountSlug: assignedAccountSlug !== undefined ? assignedAccountSlug : existing.assignedAccountSlug,
        transactionType: transactionType !== undefined ? transactionType : existing.transactionType,
        defaultClassification: defaultClassification !== undefined ? defaultClassification : existing.defaultClassification,
        isCashImpact: isCashImpact !== undefined ? isCashImpact : existing.isCashImpact,
        requiresConfirmation: requiresConfirmation !== undefined ? requiresConfirmation : existing.requiresConfirmation,
        reportingGroup: reportingGroup !== undefined ? reportingGroup : existing.reportingGroup,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'UPDATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'AccountingCategory',
      entityId: updated.id,
      previousState: existing,
      newState: updated,
      reason: `Updated accounting category: ${updated.name}`,
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (err: any) {
    console.error('Error updating category:', err);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasPermission = await checkPermission(user, 'DELETE_FINANCE');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
  }

  try {
    const existing = await prisma.accountingCategory.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    // Soft deactivate
    const deactivated = await prisma.accountingCategory.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'DELETE',
      module: 'BANK_ACCOUNTS',
      entityType: 'AccountingCategory',
      entityId: deactivated.id,
      previousState: existing,
      newState: deactivated,
      reason: `Deactivated category: ${deactivated.name}`,
    });

    return NextResponse.json({ success: true, message: 'Category deactivated successfully' });
  } catch (err: any) {
    console.error('Error deleting category:', err);
    return NextResponse.json({ error: 'Failed to deactivate category' }, { status: 500 });
  }
}

