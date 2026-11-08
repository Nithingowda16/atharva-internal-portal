import prisma from './prisma';
import { logAudit } from './audit';
import { recalculateVehicleRecord } from './calculationEngine';

export async function softDeleteRecord(params: {
  entityType: 'Vehicle' | 'VehicleMonthlyRecord' | 'BillingLine' | 'FinancialAdjustment' | 'FinancialPeriod' | 'Driver';
  entityId: string;
  userEmail: string;
  reason?: string;
}) {
  const { entityType, entityId, userEmail, reason } = params;

  let displayName = `${entityType} #${entityId}`;
  let snapshotData: any = {};
  let parentRecordId: string | null = null;

  if (entityType === 'VehicleMonthlyRecord') {
    const rec = await prisma.vehicleMonthlyRecord.findUnique({
      where: { id: entityId },
      include: {
        vehicle: true,
        period: true,
        billingLines: true,
        adjustments: true,
      },
    });
    if (!rec) throw new Error('Record not found');
    displayName = `${rec.vehicle.registrationNumber} (${rec.period.periodName})`;
    snapshotData = rec;
    parentRecordId = rec.id;

    await prisma.vehicleMonthlyRecord.update({
      where: { id: entityId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  } else if (entityType === 'Vehicle') {
    const v = await prisma.vehicle.findUnique({ where: { id: entityId } });
    if (!v) throw new Error('Vehicle not found');
    displayName = v.registrationNumber;
    snapshotData = v;

    await prisma.vehicle.update({
      where: { id: entityId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  } else if (entityType === 'BillingLine') {
    const bl = await prisma.billingLine.findUnique({ where: { id: entityId } });
    if (!bl) throw new Error('Billing line not found');
    displayName = `${bl.companyName} Line`;
    snapshotData = bl;
    parentRecordId = bl.recordId;

    await prisma.billingLine.update({
      where: { id: entityId },
      data: { isDeleted: true },
    });
  } else if (entityType === 'FinancialAdjustment') {
    const adj = await prisma.financialAdjustment.findUnique({ where: { id: entityId } });
    if (!adj) throw new Error('Adjustment not found');
    displayName = `${adj.category} (${adj.amount})`;
    snapshotData = adj;
    parentRecordId = adj.recordId;

    await prisma.financialAdjustment.update({
      where: { id: entityId },
      data: { isDeleted: true },
    });
  } else if (entityType === 'FinancialPeriod') {
    const p = await prisma.financialPeriod.findUnique({ where: { id: entityId } });
    if (!p) throw new Error('Period not found');
    displayName = p.periodName;
    snapshotData = p;

    await prisma.financialPeriod.update({
      where: { id: entityId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  } else if (entityType === 'Driver') {
    const d = await prisma.driver.findUnique({ where: { id: entityId } });
    if (!d) throw new Error('Driver not found');
    displayName = `${d.name} (Driver)`;
    snapshotData = { id: d.id, name: d.name, phone: d.phone, status: d.status };

    await prisma.driver.update({
      where: { id: entityId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // Add to recycle bin
  const binItem = await prisma.recycleBinItem.create({
    data: {
      entityType,
      entityId,
      displayName,
      deletedByEmail: userEmail,
      snapshotData: JSON.stringify(snapshotData),
      restoreStatus: 'DELETED',
    },
  });

  if (parentRecordId) {
    await recalculateVehicleRecord(parentRecordId);
  }

  await logAudit({
    userEmail,
    action: 'DELETE',
    module: 'MONTHLY_FINANCE',
    entityType,
    entityId,
    previousState: snapshotData,
    reason: reason || 'Soft deleted to Recycle Bin',
  });

  return binItem;
}

export async function restoreRecord(recycleBinItemId: string, userEmail: string) {
  const item = await prisma.recycleBinItem.findUnique({
    where: { id: recycleBinItemId },
  });

  if (!item || item.restoreStatus !== 'DELETED') {
    throw new Error('Item not found in Recycle Bin or already restored');
  }

  const { entityType, entityId } = item;
  let parentRecordId: string | null = null;

  if (entityType === 'VehicleMonthlyRecord') {
    await prisma.vehicleMonthlyRecord.update({
      where: { id: entityId },
      data: { isDeleted: false, deletedAt: null },
    });
    parentRecordId = entityId;
  } else if (entityType === 'Vehicle') {
    await prisma.vehicle.update({
      where: { id: entityId },
      data: { isDeleted: false, deletedAt: null },
    });
  } else if (entityType === 'BillingLine') {
    const bl = await prisma.billingLine.update({
      where: { id: entityId },
      data: { isDeleted: false },
    });
    parentRecordId = bl.recordId;
  } else if (entityType === 'FinancialAdjustment') {
    const adj = await prisma.financialAdjustment.update({
      where: { id: entityId },
      data: { isDeleted: false },
    });
    parentRecordId = adj.recordId;
  } else if (entityType === 'FinancialPeriod') {
    await prisma.financialPeriod.update({
      where: { id: entityId },
      data: { isDeleted: false, deletedAt: null },
    });
  } else if (entityType === 'Driver') {
    await prisma.driver.update({
      where: { id: entityId },
      data: { isDeleted: false, deletedAt: null },
    });
  }

  await prisma.recycleBinItem.update({
    where: { id: recycleBinItemId },
    data: { restoreStatus: 'RESTORED' },
  });

  if (parentRecordId) {
    await recalculateVehicleRecord(parentRecordId);
  }

  await logAudit({
    userEmail,
    action: 'RESTORE',
    module: 'MONTHLY_FINANCE',
    entityType,
    entityId,
    reason: 'Restored from Recycle Bin',
  });

  return { success: true };
}

export async function permanentPurgeRecord(recycleBinItemId: string, userEmail: string) {
  const item = await prisma.recycleBinItem.findUnique({
    where: { id: recycleBinItemId },
  });

  if (!item) throw new Error('Item not found');

  const { entityType, entityId } = item;

  if (entityType === 'VehicleMonthlyRecord') {
    await prisma.vehicleMonthlyRecord.delete({ where: { id: entityId } });
  } else if (entityType === 'Vehicle') {
    await prisma.vehicle.delete({ where: { id: entityId } });
  } else if (entityType === 'BillingLine') {
    await prisma.billingLine.delete({ where: { id: entityId } });
  } else if (entityType === 'FinancialAdjustment') {
    await prisma.financialAdjustment.delete({ where: { id: entityId } });
  } else if (entityType === 'FinancialPeriod') {
    await prisma.financialPeriod.delete({ where: { id: entityId } });
  } else if (entityType === 'Driver') {
    await prisma.driver.delete({ where: { id: entityId } });
  }

  await prisma.recycleBinItem.update({
    where: { id: recycleBinItemId },
    data: { restoreStatus: 'PURGED' },
  });

  await logAudit({
    userEmail,
    action: 'DELETE',
    module: 'MONTHLY_FINANCE',
    entityType,
    entityId,
    reason: 'Permanently purged by Super Admin',
  });

  return { success: true };
}

