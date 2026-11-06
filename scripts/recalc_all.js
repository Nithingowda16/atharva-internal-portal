const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-09' } });
  const rec = await prisma.vehicleMonthlyRecord.findFirst({
    where: { periodId: p.id, sectionIndex: 1 }
  });

  console.log('Recalculating Section 1 (id:', rec.id, ')...');
  const record = await prisma.vehicleMonthlyRecord.findUnique({
    where: { id: rec.id },
    include: {
      billingLines: { where: { isDeleted: false } },
      adjustments: { where: { isDeleted: false } },
      payments: { where: { isDeleted: false } },
    },
  });

  let grossBilling = 0;
  for (const line of record.billingLines) {
    let lineAmount = line.billingAmount;
    if ((lineAmount === 0 || lineAmount === null) && line.kmOrTrips && line.applicableRate) {
      lineAmount = line.kmOrTrips * line.applicableRate;
    }
    grossBilling += lineAmount;
  }

  let totalDeductions = 0;
  for (const adj of record.adjustments) {
    if (adj.isPostSettlement) continue;
    if (adj.amount < 0) {
      totalDeductions += Math.abs(adj.amount);
    } else if (adj.adjustmentType === 'DEDUCTION') {
      totalDeductions += Math.abs(adj.amount);
    } else {
      totalDeductions -= adj.amount;
    }
  }

  const netPayable = grossBilling - totalDeductions;
  console.log({ grossBilling, totalDeductions, netPayable });

  await prisma.vehicleMonthlyRecord.update({
    where: { id: rec.id },
    data: {
      grossBilling: Math.round(grossBilling * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100,
      amountPaid: Math.round(netPayable * 100) / 100,
    }
  });

  // Recalculate both periods
  const pAug = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-08' } });
  await updatePeriod(pAug.id);
  await updatePeriod(p.id);

  console.log('Done recalculating.');
}

async function updatePeriod(periodId) {
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

main().finally(() => prisma.$disconnect());
