import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'MANAGE_FLEET')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot assign drivers.' }, { status: 403 });
  }

  try {
    const { vehicleId, driverId, startDate, notes } = await req.json();

    if (!vehicleId || !driverId) {
      return NextResponse.json({ error: 'vehicleId and driverId are required' }, { status: 400 });
    }

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        assignments: { where: { isCurrent: true }, include: { driver: true } },
      },
    });
    if (!vehicle || vehicle.isDeleted) {
      return NextResponse.json({ error: 'Vehicle not found or inactive' }, { status: 404 });
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        assignments: { where: { isCurrent: true }, include: { vehicle: true } },
      },
    });
    if (!driver || driver.isDeleted) {
      return NextResponse.json({ error: 'Driver not found or inactive' }, { status: 404 });
    }

    const assignmentDate = startDate ? new Date(startDate) : new Date();

    // 1. Close current assignment on this vehicle (if any)
    const previousVehicleAssignment = vehicle.assignments[0] || null;
    if (previousVehicleAssignment) {
      await prisma.vehicleDriverAssignment.update({
        where: { id: previousVehicleAssignment.id },
        data: {
          isCurrent: false,
          endDate: assignmentDate,
        },
      });
    }

    // 2. Close current assignment on this driver (if already assigned to another vehicle)
    const previousDriverAssignment = driver.assignments[0] || null;
    if (previousDriverAssignment && previousDriverAssignment.id !== previousVehicleAssignment?.id) {
      await prisma.vehicleDriverAssignment.update({
        where: { id: previousDriverAssignment.id },
        data: {
          isCurrent: false,
          endDate: assignmentDate,
        },
      });
    }

    // 3. Create the new assignment
    const newAssignment = await prisma.vehicleDriverAssignment.create({
      data: {
        vehicleId,
        driverId,
        startDate: assignmentDate,
        isCurrent: true,
        assignedBy: user.email,
        notes: notes?.trim() || null,
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, carName: true } },
        driver: { select: { id: true, name: true, phone: true } },
      },
    });

    // 4. Log audit
    await logAudit({
      userEmail: user.email,
      action: 'ASSIGN_DRIVER',
      module: 'FLEET_MANAGEMENT',
      entityType: 'VehicleDriverAssignment',
      entityId: newAssignment.id,
      previousState: {
        previousDriver: previousVehicleAssignment?.driver.name || 'None',
        previousVehicle: previousDriverAssignment?.vehicle.registrationNumber || 'None',
      },
      newState: {
        vehicle: newAssignment.vehicle.registrationNumber,
        driver: newAssignment.driver.name,
        startDate: assignmentDate,
      },
      reason: `Assigned driver ${newAssignment.driver.name} to vehicle ${newAssignment.vehicle.registrationNumber}`,
    });

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
    });
  } catch (err: any) {
    console.error('Error assigning driver:', err);
    return NextResponse.json({ error: err.message || 'Failed to assign driver' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'VIEWER' || !checkPermission(user, 'MANAGE_FLEET')) {
    return NextResponse.json({ error: 'Forbidden: View-only accounts cannot unassign drivers.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('id');
    const vehicleId = searchParams.get('vehicleId');

    let assignment;
    if (assignmentId) {
      assignment = await prisma.vehicleDriverAssignment.findUnique({
        where: { id: assignmentId },
        include: { vehicle: true, driver: true },
      });
    } else if (vehicleId) {
      assignment = await prisma.vehicleDriverAssignment.findFirst({
        where: { vehicleId, isCurrent: true },
        include: { vehicle: true, driver: true },
      });
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Active assignment not found' }, { status: 404 });
    }

    const updated = await prisma.vehicleDriverAssignment.update({
      where: { id: assignment.id },
      data: {
        isCurrent: false,
        endDate: new Date(),
      },
    });

    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'FLEET_MANAGEMENT',
      entityType: 'VehicleDriverAssignment',
      entityId: assignment.id,
      previousState: { isCurrent: true },
      newState: { isCurrent: false, endDate: new Date() },
      reason: `Ended assignment of driver ${assignment.driver.name} from vehicle ${assignment.vehicle.registrationNumber}`,
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (err: any) {
    console.error('Error unassigning driver:', err);
    return NextResponse.json({ error: err.message || 'Failed to unassign driver' }, { status: 500 });
  }
}

