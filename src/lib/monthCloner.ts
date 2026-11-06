import prisma from './prisma';
import { logAudit } from './audit';
import { recalculatePeriodTotals } from './calculationEngine';

export interface CloneMonthOptions {
  monthCode: string; // e.g. "2026-10"
  periodName: string; // "October 2026"
  financialYear: string; // "2026-27"
  startDate: string; // "2026-10-01"
  endDate: string; // "2026-10-31"
  templatePeriodId: string; // ID of source period (e.g. September 2026)
  copyRecurringCharges: boolean; // GPS, Office charge
  userEmail: string;
}

export async function createNewMonthFromTemplate(options: CloneMonthOptions) {
  // Check if month already exists
  const existing = await prisma.financialPeriod.findUnique({
    where: { monthCode: options.monthCode },
  });

  if (existing) {
    throw new Error(`Financial Month ${options.periodName} (${options.monthCode}) already exists. Never overwriting existing historical months.`);
  }

  const template = await prisma.financialPeriod.findUnique({
    where: { id: options.templatePeriodId },
    include: {
      monthlyRecords: {
        where: { isDeleted: false },
        include: {
          vehicle: true,
          billingLines: { where: { isDeleted: false } },
          adjustments: { where: { isDeleted: false } },
        },
      },
    },
  });

  if (!template) {
    throw new Error(`Template period with ID ${options.templatePeriodId} not found.`);
  }

  // 1. Create the new FinancialPeriod in 'Draft' status
  const newPeriod = await prisma.financialPeriod.create({
    data: {
      monthCode: options.monthCode,
      periodName: options.periodName,
      financialYear: options.financialYear,
      startDate: options.startDate,
      endDate: options.endDate,
      status: 'Draft',
      templateSourceId: template.id,
      grossBilling: 0,
      totalDeductions: 0,
      netPayable: 0,
      totalPaid: 0,
    },
  });

  // 2. Clone vehicle records
  for (const srcRec of template.monthlyRecords) {
    // Recurring adjustments to copy
    const clonedAdjustments = [];
    if (options.copyRecurringCharges) {
      for (const adj of srcRec.adjustments) {
        const catUpper = adj.category.toUpperCase();
        // Recurring charges: GPS Rental, Office charge
        if (catUpper.includes('GPS') || catUpper.includes('OFFICE')) {
          clonedAdjustments.push({
            category: adj.category,
            adjustmentType: adj.adjustmentType,
            amount: adj.amount,
            formulaString: adj.formulaString,
            meta1: options.periodName.slice(0, 3).toUpperCase(),
            meta2: options.startDate.slice(0, 4),
            isPostSettlement: false,
          });
        }
      }
    }

    // Clone billing structure with KM reset to 0
    const clonedBillingLines = srcRec.billingLines.map((bl) => ({
      companyName: bl.companyName,
      kmOrTrips: null, // Reset monthly KM
      kmFormula: null,
      applicableRate: bl.applicableRate, // Carry forward approved rate
      rateFormula: null,
      billingAmount: 0, // Reset billing amount
      amountFormula: null,
      lineOrder: bl.lineOrder,
    }));

    let initialDeductions = 0;
    for (const a of clonedAdjustments) {
      if (a.amount < 0) initialDeductions += Math.abs(a.amount);
      else initialDeductions -= a.amount;
    }

    const newRecord = await prisma.vehicleMonthlyRecord.create({
      data: {
        periodId: newPeriod.id,
        vehicleId: srcRec.vehicleId,
        sectionIndex: srcRec.sectionIndex,
        calcHeader: `${options.periodName.slice(0, 3).toUpperCase()}-26 Payment Calculation`,
        periodLabel: `Payment for ${options.startDate} to ${options.endDate}`,
        grossBilling: 0,
        totalDeductions: initialDeductions,
        netPayable: -initialDeductions,
        amountPaid: 0,
        paymentStatus: 'Draft',
        paymentDate: null,
        bankDetails: srcRec.bankDetails || 'OTHER Bank',
        hasRefErrors: false,
        refErrorCount: 0,
        remarks: null,
        billingLines: {
          create: clonedBillingLines,
        },
        adjustments: {
          create: clonedAdjustments,
        },
      },
    });

    // Create version 1 snapshot for the new month
    await prisma.recordVersion.create({
      data: {
        recordId: newRecord.id,
        versionNumber: 1,
        snapshotData: JSON.stringify({
          period: options.periodName,
          vehicle: srcRec.vehicle.registrationNumber,
          status: 'Draft',
          clonedFromTemplate: template.periodName,
        }),
        changeReason: `Cloned into new month ${options.periodName} from template ${template.periodName}`,
      },
    });
  }

  // Recalculate totals for the new period
  await recalculatePeriodTotals(newPeriod.id);

  // Log audit
  await logAudit({
    userEmail: options.userEmail,
    action: 'CLONE_MONTH',
    module: 'MONTHLY_FINANCE',
    entityType: 'FinancialPeriod',
    entityId: newPeriod.id,
    newState: {
      periodName: options.periodName,
      monthCode: options.monthCode,
      template: template.periodName,
      vehiclesCloned: template.monthlyRecords.length,
    },
    reason: `Created new month ${options.periodName} using template ${template.periodName}`,
  });

  return newPeriod;
}

