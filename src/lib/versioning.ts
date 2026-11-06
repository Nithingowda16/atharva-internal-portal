import prisma from './prisma';
import { logAudit } from './audit';
import { recalculateVehicleRecord } from './calculationEngine';

export async function createRecordSnapshot(recordId: string, reason: string, userEmail: string) {
  const record = await prisma.vehicleMonthlyRecord.findUnique({
    where: { id: recordId },
    include: {
      vehicle: true,
      billingLines: { where: { isDeleted: false } },
      adjustments: { where: { isDeleted: false } },
    },
  });

  if (!record) return;

  const count = await prisma.recordVersion.count({
    where: { recordId },
  });

  const nextVersion = count + 1;

  const user = await prisma.user.findUnique({ where: { email: userEmail } });

  await prisma.recordVersion.create({
    data: {
      recordId,
      versionNumber: nextVersion,
      snapshotData: JSON.stringify(record),
      changeReason: reason,
      createdById: user ? user.id : null,
    },
  });
}

export async function revertRecordToVersion(recordId: string, targetVersion: number, userEmail: string) {
  const version = await prisma.recordVersion.findFirst({
    where: { recordId, versionNumber: targetVersion },
  });

  if (!version) {
    throw new Error(`Version ${targetVersion} not found for record ${recordId}`);
  }

  const snapshot = JSON.parse(version.snapshotData);

  // Before reverting, save snapshot of current state
  await createRecordSnapshot(recordId, `Pre-revert snapshot before rolling back to version ${targetVersion}`, userEmail);

  // Revert main record fields
  await prisma.vehicleMonthlyRecord.update({
    where: { id: recordId },
    data: {
      grossBilling: snapshot.grossBilling,
      totalDeductions: snapshot.totalDeductions,
      netPayable: snapshot.netPayable,
      amountPaid: snapshot.amountPaid,
      paymentStatus: snapshot.paymentStatus,
      paymentDate: snapshot.paymentDate,
      bankDetails: snapshot.bankDetails,
      remarks: snapshot.remarks,
    },
  });

  // Revert billing lines if present in snapshot
  if (Array.isArray(snapshot.billingLines)) {
    // Delete existing lines and recreate from snapshot
    await prisma.billingLine.deleteMany({ where: { recordId } });
    for (const bl of snapshot.billingLines) {
      await prisma.billingLine.create({
        data: {
          recordId,
          companyName: bl.companyName,
          kmOrTrips: bl.kmOrTrips,
          kmFormula: bl.kmFormula,
          applicableRate: bl.applicableRate,
          rateFormula: bl.rateFormula,
          billingAmount: bl.billingAmount,
          amountFormula: bl.amountFormula,
          lineOrder: bl.lineOrder || 0,
        },
      });
    }
  }

  // Revert adjustments if present in snapshot
  if (Array.isArray(snapshot.adjustments)) {
    await prisma.financialAdjustment.deleteMany({ where: { recordId } });
    for (const adj of snapshot.adjustments) {
      await prisma.financialAdjustment.create({
        data: {
          recordId,
          category: adj.category,
          adjustmentType: adj.adjustmentType,
          amount: adj.amount,
          formulaString: adj.formulaString,
          isPostSettlement: adj.isPostSettlement || false,
          meta1: adj.meta1,
          meta2: adj.meta2,
          notes: adj.notes,
        },
      });
    }
  }

  await recalculateVehicleRecord(recordId);

  await logAudit({
    userEmail,
    action: 'REVERT',
    module: 'MONTHLY_FINANCE',
    entityType: 'VehicleMonthlyRecord',
    entityId: recordId,
    newState: { revertedToVersion: targetVersion },
    reason: `Reverted record to version ${targetVersion}`,
  });

  return { success: true };
}

