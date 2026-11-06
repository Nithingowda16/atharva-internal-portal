import prisma from './prisma';

export interface CalculationResult {
  grossBilling: number;
  totalDeductions: number;
  netPayable: number;
  amountPaid: number;
  outstandingBalance: number;
}

export async function recalculateVehicleRecord(recordId: string): Promise<CalculationResult> {
  const record = await prisma.vehicleMonthlyRecord.findUnique({
    where: { id: recordId },
    include: {
      billingLines: { where: { isDeleted: false } },
      adjustments: { where: { isDeleted: false } },
      payments: { where: { isDeleted: false } },
    },
  });

  if (!record) {
    throw new Error(`Record ${recordId} not found`);
  }

  // 1. Calculate Gross Billing
  let grossBilling = 0;
  for (const line of record.billingLines) {
    let lineAmount = line.billingAmount;
    if ((lineAmount === 0 || lineAmount === null) && line.kmOrTrips && line.applicableRate) {
      lineAmount = line.kmOrTrips * line.applicableRate;
    }
    grossBilling += lineAmount;
  }

  // 2. Calculate Adjustments (Additions vs Deductions)
  let totalDeductions = 0;
  for (const adj of record.adjustments) {
    // Post-settlement adjustments are informational reconciliation notes from Excel, not deductions from billing
    if (adj.isPostSettlement) {
      continue;
    }
    // If negative amount, it's a deduction
    if (adj.amount < 0) {
      totalDeductions += Math.abs(adj.amount);
    } else if (adj.adjustmentType === 'DEDUCTION') {
      totalDeductions += Math.abs(adj.amount);
    } else {
      // It's an addition, reduces deductions or adds to gross
      totalDeductions -= adj.amount;
    }
  }

  const netPayable = grossBilling - totalDeductions;

  // 3. Payments
  let amountPaid = 0;
  for (const p of record.payments) {
    amountPaid += p.amount;
  }

  if (record.paymentStatus === 'Paid' && amountPaid === 0 && netPayable > 0) {
    // Retain full recorded settlement status from Excel
    amountPaid = netPayable;
  }

  const outstandingBalance = netPayable - amountPaid;

  // Update record in database
  await prisma.vehicleMonthlyRecord.update({
    where: { id: recordId },
    data: {
      grossBilling: Math.round(grossBilling * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100,
      amountPaid: Math.round(amountPaid * 100) / 100,
    },
  });

  // Also update parent FinancialPeriod totals
  await recalculatePeriodTotals(record.periodId);

  return {
    grossBilling,
    totalDeductions,
    netPayable,
    amountPaid,
    outstandingBalance,
  };
}

export async function recalculatePeriodTotals(periodId: string) {
  const records = await prisma.vehicleMonthlyRecord.findMany({
    where: { periodId, isDeleted: false },
    select: {
      grossBilling: true,
      totalDeductions: true,
      netPayable: true,
      amountPaid: true,
    },
  });

  let periodGross = 0;
  let periodDeductions = 0;
  let periodNet = 0;
  let periodPaid = 0;

  for (const r of records) {
    periodGross += r.grossBilling;
    periodDeductions += r.totalDeductions;
    periodNet += r.netPayable;
    periodPaid += r.amountPaid;
  }

  await prisma.financialPeriod.update({
    where: { id: periodId },
    data: {
      grossBilling: Math.round(periodGross * 100) / 100,
      totalDeductions: Math.round(periodDeductions * 100) / 100,
      netPayable: Math.round(periodNet * 100) / 100,
      totalPaid: Math.round(periodPaid * 100) / 100,
    },
  });
}

