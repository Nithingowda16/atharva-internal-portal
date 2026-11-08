import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  encryptSensitiveField,
  maskPAN,
  maskDL,
  validatePAN,
  validateDrivingLicence,
} from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const expiryFilter = searchParams.get('expiryFilter'); // ALL, EXPIRING_SOON, EXPIRED, VALID

  const where: any = { isDeleted: false };
  if (status && status !== 'ALL') where.status = status;

  const now = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  if (expiryFilter === 'EXPIRED') {
    where.licenceExpiry = { lt: now };
  } else if (expiryFilter === 'EXPIRING_SOON') {
    where.licenceExpiry = { gte: now, lte: thirtyDays };
  } else if (expiryFilter === 'VALID') {
    where.licenceExpiry = { gt: thirtyDays };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { remarks: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const drivers = await prisma.driver.findMany({
      where,
      include: {
        assignments: {
          where: { isCurrent: true },
          include: {
            vehicle: {
              select: {
                id: true,
                registrationNumber: true,
                carName: true,
                category: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = drivers.map((d) => {
      const currentAssignment = d.assignments[0] || null;
      const currentVehicle = currentAssignment?.vehicle || null;

      let expiryStatus: 'EXPIRED' | 'EXPIRING_SOON' | 'VALID' | 'NO_EXPIRY' = 'NO_EXPIRY';
      let daysRemaining: number | null = null;

      if (d.licenceExpiry) {
        const diffTime = new Date(d.licenceExpiry).getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) {
          expiryStatus = 'EXPIRED';
        } else if (daysRemaining <= 30) {
          expiryStatus = 'EXPIRING_SOON';
        } else {
          expiryStatus = 'VALID';
        }
      }

      return {
        id: d.id,
        name: d.name,
        phone: d.phone || '',
        // Sensitive identifiers are ALWAYS masked by default!
        panMasked: d.panMasked || '••••••••••',
        dlMasked: d.dlMasked || '•••••••••••••',
        hasPAN: !!d.panEncrypted,
        hasDL: !!d.dlEncrypted,
        licenceExpiry: d.licenceExpiry,
        expiryStatus,
        daysRemaining,
        status: d.status,
        remarks: d.remarks || '',
        currentVehicle: currentVehicle
          ? {
              id: currentVehicle.id,
              registrationNumber: currentVehicle.registrationNumber,
              carName: currentVehicle.carName,
              category: currentVehicle.category,
              status: currentVehicle.status,
              assignedSince: currentAssignment.startDate,
            }
          : null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });

    return NextResponse.json({ drivers: formatted });
  } catch (err: any) {
    console.error('Error fetching drivers:', err);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'MANAGE_DRIVERS')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot register drivers.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      pan,
      drivingLicence,
      licenceExpiry,
      phone,
      status = 'ACTIVE',
      remarks,
      assignedVehicleId,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Driver name is required' }, { status: 400 });
    }

    // Validate and encrypt PAN if provided
    let panEncrypted: string | null = null;
    let panMasked: string | null = null;
    if (pan && pan.trim()) {
      const panValidation = validatePAN(pan);
      if (!panValidation.valid) {
        return NextResponse.json({ error: panValidation.message }, { status: 400 });
      }
      panEncrypted = encryptSensitiveField(panValidation.formatted);
      panMasked = maskPAN(panValidation.formatted);
    }

    // Validate and encrypt DL if provided
    let dlEncrypted: string | null = null;
    let dlMasked: string | null = null;
    if (drivingLicence && drivingLicence.trim()) {
      const dlValidation = validateDrivingLicence(drivingLicence);
      if (!dlValidation.valid) {
        return NextResponse.json({ error: dlValidation.message }, { status: 400 });
      }
      dlEncrypted = encryptSensitiveField(dlValidation.formatted);
      dlMasked = maskDL(dlValidation.formatted);
    }

    // Parse expiry date
    let parsedExpiry: Date | null = null;
    if (licenceExpiry) {
      const expDate = new Date(licenceExpiry);
      if (!isNaN(expDate.getTime())) {
        parsedExpiry = expDate;
      }
    }

    const driver = await prisma.driver.create({
      data: {
        name: name.trim(),
        panEncrypted,
        panMasked,
        dlEncrypted,
        dlMasked,
        licenceExpiry: parsedExpiry,
        phone: phone?.trim() || null,
        status,
        remarks: remarks?.trim() || null,
      },
    });

    // If assigned to a vehicle immediately
    if (assignedVehicleId) {
      // Close active assignment on that vehicle
      await prisma.vehicleDriverAssignment.updateMany({
        where: { vehicleId: assignedVehicleId, isCurrent: true },
        data: { isCurrent: false, endDate: new Date() },
      });

      await prisma.vehicleDriverAssignment.create({
        data: {
          vehicleId: assignedVehicleId,
          driverId: driver.id,
          startDate: new Date(),
          isCurrent: true,
          assignedBy: user.email,
          notes: 'Assigned during driver registration',
        },
      });
    }

    await logAudit({
      userEmail: user.email,
      action: 'CREATE',
      module: 'FLEET_MANAGEMENT',
      entityType: 'Driver',
      entityId: driver.id,
      newState: {
        name: driver.name,
        panMasked,
        dlMasked,
        status,
        licenceExpiry: parsedExpiry,
        assignedVehicleId,
      },
      reason: 'Driver created with field-level encrypted identifiers',
    });

    return NextResponse.json(
      {
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          panMasked: driver.panMasked,
          dlMasked: driver.dlMasked,
          licenceExpiry: driver.licenceExpiry,
          status: driver.status,
          remarks: driver.remarks,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creating driver:', err);
    return NextResponse.json({ error: err.message || 'Failed to create driver' }, { status: 500 });
  }
}

