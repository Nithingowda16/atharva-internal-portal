import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { softDeleteRecord } from '@/lib/softDelete';
import {
  encryptSensitiveField,
  maskPAN,
  maskDL,
  validatePAN,
  validateDrivingLicence,
} from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      include: {
        assignments: {
          include: {
            vehicle: {
              select: {
                id: true,
                registrationNumber: true,
                carName: true,
                make: true,
                model: true,
                category: true,
                status: true,
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const currentAssignment = driver.assignments.find((a) => a.isCurrent) || null;

    const now = new Date();
    let expiryStatus: 'EXPIRED' | 'EXPIRING_SOON' | 'VALID' | 'NO_EXPIRY' = 'NO_EXPIRY';
    let daysRemaining: number | null = null;

    if (driver.licenceExpiry) {
      const diffTime = new Date(driver.licenceExpiry).getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        expiryStatus = 'EXPIRED';
      } else if (daysRemaining <= 30) {
        expiryStatus = 'EXPIRING_SOON';
      } else {
        expiryStatus = 'VALID';
      }
    }

    // Fetch audit history for this driver
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Driver',
        entityId: driver.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone || '',
        panMasked: driver.panMasked || '••••••••••',
        dlMasked: driver.dlMasked || '•••••••••••••',
        hasPAN: !!driver.panEncrypted,
        hasDL: !!driver.dlEncrypted,
        licenceExpiry: driver.licenceExpiry,
        expiryStatus,
        daysRemaining,
        status: driver.status,
        remarks: driver.remarks || '',
        isDeleted: driver.isDeleted,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt,
        currentVehicle: currentAssignment ? currentAssignment.vehicle : null,
        currentAssignment: currentAssignment
          ? {
              id: currentAssignment.id,
              startDate: currentAssignment.startDate,
              notes: currentAssignment.notes,
              assignedBy: currentAssignment.assignedBy,
            }
          : null,
        assignmentHistory: driver.assignments.map((a) => ({
          id: a.id,
          vehicleId: a.vehicle.id,
          registrationNumber: a.vehicle.registrationNumber,
          carName: a.vehicle.carName || a.vehicle.registrationNumber,
          category: a.vehicle.category,
          startDate: a.startDate,
          endDate: a.endDate,
          isCurrent: a.isCurrent,
          assignedBy: a.assignedBy,
          notes: a.notes,
        })),
        auditHistory: auditLogs.map((l) => ({
          id: l.id,
          action: l.action,
          userEmail: l.userEmail,
          createdAt: l.createdAt,
          reason: l.reason,
        })),
      },
    });
  } catch (err: any) {
    console.error('Error fetching driver profile:', err);
    return NextResponse.json({ error: 'Failed to fetch driver profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const existing = await prisma.driver.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    const { name, pan, drivingLicence, licenceExpiry, phone, status, remarks } = body;

    let panEncrypted = existing.panEncrypted;
    let panMasked = existing.panMasked;
    // Only update PAN if a new, unmasked PAN value is sent
    if (pan && !pan.includes('*') && !pan.includes('•') && pan.trim() !== '') {
      const panValidation = validatePAN(pan);
      if (!panValidation.valid) {
        return NextResponse.json({ error: panValidation.message }, { status: 400 });
      }
      panEncrypted = encryptSensitiveField(panValidation.formatted);
      panMasked = maskPAN(panValidation.formatted);
    }

    let dlEncrypted = existing.dlEncrypted;
    let dlMasked = existing.dlMasked;
    // Only update DL if a new, unmasked DL value is sent
    if (drivingLicence && !drivingLicence.includes('*') && !drivingLicence.includes('•') && drivingLicence.trim() !== '') {
      const dlValidation = validateDrivingLicence(drivingLicence);
      if (!dlValidation.valid) {
        return NextResponse.json({ error: dlValidation.message }, { status: 400 });
      }
      dlEncrypted = encryptSensitiveField(dlValidation.formatted);
      dlMasked = maskDL(dlValidation.formatted);
    }

    let parsedExpiry = existing.licenceExpiry;
    if (licenceExpiry !== undefined) {
      if (licenceExpiry) {
        const expDate = new Date(licenceExpiry);
        if (!isNaN(expDate.getTime())) {
          parsedExpiry = expDate;
        }
      } else {
        parsedExpiry = null;
      }
    }

    const updated = await prisma.driver.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        panEncrypted,
        panMasked,
        dlEncrypted,
        dlMasked,
        licenceExpiry: parsedExpiry,
        phone: phone !== undefined ? phone.trim() : existing.phone,
        status: status !== undefined ? status : existing.status,
        remarks: remarks !== undefined ? remarks.trim() : existing.remarks,
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'FLEET_MANAGEMENT',
      entityType: 'Driver',
      entityId: updated.id,
      previousState: {
        name: existing.name,
        status: existing.status,
        panMasked: existing.panMasked,
        dlMasked: existing.dlMasked,
      },
      newState: {
        name: updated.name,
        status: updated.status,
        panMasked: updated.panMasked,
        dlMasked: updated.dlMasked,
      },
      reason: 'Driver details updated via Fleet Management',
    });

    return NextResponse.json({
      driver: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        panMasked: updated.panMasked,
        dlMasked: updated.dlMasked,
        licenceExpiry: updated.licenceExpiry,
        status: updated.status,
        remarks: updated.remarks,
      },
    });
  } catch (err: any) {
    console.error('Error updating driver:', err);
    return NextResponse.json({ error: err.message || 'Failed to update driver' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const item = await softDeleteRecord({
      entityType: 'Driver',
      entityId: params.id,
      userEmail: user.email,
      reason: 'Driver soft-deleted from Fleet Management',
    });

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    console.error('Error soft-deleting driver:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete driver' }, { status: 500 });
  }
}

