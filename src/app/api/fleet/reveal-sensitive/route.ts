import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { decryptSensitiveField } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Explicit role-based check: Only Super Admin and Finance Manager can reveal sensitive identifiers
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'FINANCE_MANAGER') {
    return NextResponse.json(
      { error: 'Access Denied: Only Super Admin and Finance Manager can view unmasked personal identifiers.' },
      { status: 403 }
    );
  }

  try {
    const { driverId, field } = await req.json();

    if (!driverId || (field !== 'PAN' && field !== 'DL')) {
      return NextResponse.json({ error: 'Valid driverId and field (PAN | DL) are required' }, { status: 400 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        panEncrypted: true,
        dlEncrypted: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    let unmaskedValue: string | null = null;
    if (field === 'PAN') {
      unmaskedValue = decryptSensitiveField(driver.panEncrypted);
    } else if (field === 'DL') {
      unmaskedValue = decryptSensitiveField(driver.dlEncrypted);
    }

    if (!unmaskedValue) {
      return NextResponse.json({ error: 'No encrypted data found for this identifier' }, { status: 404 });
    }

    // Write audit log (WITHOUT writing the actual sensitive value into the log)
    await logAudit({
      userEmail: user.email,
      action: 'REVEAL_SENSITIVE_DATA',
      module: 'FLEET_MANAGEMENT',
      entityType: 'Driver',
      entityId: driver.id,
      reason: `Authorized ${user.role} revealed ${field} for driver: ${driver.name}`,
    });

    return NextResponse.json({
      field,
      driverId: driver.id,
      driverName: driver.name,
      value: unmaskedValue,
    });
  } catch (err: any) {
    console.error('Error revealing sensitive identifier:', err);
    return NextResponse.json({ error: 'Failed to retrieve sensitive information' }, { status: 500 });
  }
}

