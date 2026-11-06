import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { softDeleteRecord } from '@/lib/softDelete';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'EDIT_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const prev = await prisma.vehicle.findUnique({ where: { id: params.id } });
    if (!prev) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    const updated = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        registrationNumber: body.registrationNumber !== undefined ? body.registrationNumber.trim() : prev.registrationNumber,
        vehicleType: body.vehicleType !== undefined ? body.vehicleType : prev.vehicleType,
        isActive: body.isActive !== undefined ? body.isActive : prev.isActive,
        ownerName: body.ownerName !== undefined ? body.ownerName : prev.ownerName,
        contactNumber: body.contactNumber !== undefined ? body.contactNumber : prev.contactNumber,
        bankAccountMasked: body.bankAccountMasked !== undefined ? body.bankAccountMasked : prev.bankAccountMasked,
        bankName: body.bankName !== undefined ? body.bankName : prev.bankName,
        notes: body.notes !== undefined ? body.notes : prev.notes,
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'VEHICLES',
      entityType: 'Vehicle',
      entityId: params.id,
      previousState: prev,
      newState: updated,
      reason: body.reason || 'Updated vehicle master record',
    });

    return NextResponse.json({ success: true, vehicle: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update vehicle' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'DELETE_FINANCE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const reason = searchParams.get('reason') || 'Deleted vehicle';

  try {
    const binItem = await softDeleteRecord({
      entityType: 'Vehicle',
      entityId: params.id,
      userEmail: user.email,
      reason,
    });

    return NextResponse.json({ success: true, message: 'Vehicle moved to Recycle Bin', binItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete vehicle' }, { status: 500 });
  }
}

