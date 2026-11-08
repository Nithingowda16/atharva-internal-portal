import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Vehicle counts
    const [totalVehicles, activeVehicles, inactiveVehicles, maintenanceVehicles, retiredVehicles] = await Promise.all([
      prisma.vehicle.count({ where: { isDeleted: false } }),
      prisma.vehicle.count({ where: { isDeleted: false, status: 'ACTIVE' } }),
      prisma.vehicle.count({ where: { isDeleted: false, status: 'INACTIVE' } }),
      prisma.vehicle.count({ where: { isDeleted: false, status: 'UNDER_MAINTENANCE' } }),
      prisma.vehicle.count({ where: { isDeleted: false, status: 'RETIRED' } }),
    ]);

    // 2. Driver counts
    const [totalDrivers, activeDrivers] = await Promise.all([
      prisma.driver.count({ where: { isDeleted: false } }),
      prisma.driver.count({ where: { isDeleted: false, status: 'ACTIVE' } }),
    ]);

    // 3. Licence expiry calculation (within 30 days or already expired)
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [expiringSoonCount, expiredCount] = await Promise.all([
      prisma.driver.count({
        where: {
          isDeleted: false,
          licenceExpiry: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),
      prisma.driver.count({
        where: {
          isDeleted: false,
          licenceExpiry: {
            lt: now,
          },
        },
      }),
    ]);

    return NextResponse.json({
      summary: {
        totalVehicles,
        activeVehicles,
        inactiveVehicles,
        maintenanceVehicles,
        retiredVehicles,
        totalDrivers,
        activeDrivers,
        licencesExpiringSoon: expiringSoonCount + expiredCount,
        expiredCount,
        expiringSoonCount,
      },
    });
  } catch (err: any) {
    console.error('Fleet summary error:', err);
    return NextResponse.json({ error: 'Failed to fetch fleet summary' }, { status: 500 });
  }
}

