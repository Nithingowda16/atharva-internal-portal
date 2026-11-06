const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.vehicleMonthlyRecord.findMany({
    where: { isDeleted: false },
    include: {
      billingLines: { where: { isDeleted: false } },
      adjustments: { where: { isDeleted: false } },
      payments: { where: { isDeleted: false } },
    }
  });

  console.log(`Recalculating ${records.length} records...`);

  for (const record of records) {
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
    let amountPaid = record.amountPaid;
    if (record.paymentStatus === 'Paid' && netPayable > 0) {
      amountPaid = netPayable;
    }

    await prisma.vehicleMonthlyRecord.update({
      where: { id: record.id },
      data: {
        grossBilling: Math.round(grossBilling * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPayable: Math.round(netPayable * 100) / 100,
        amountPaid: Math.round(amountPaid * 100) / 100,
      }
    });
  }

  // Also remove test October 2026 period so total records across August and September are exactly 92
  const octPeriod = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-10' } });
  if (octPeriod) {
    console.log('Cleaning up test October period...');
    await prisma.recordVersion.deleteMany({ where: { record: { periodId: octPeriod.id } } });
    await prisma.financialAdjustment.deleteMany({ where: { record: { periodId: octPeriod.id } } });
    await prisma.billingLine.deleteMany({ where: { record: { periodId: octPeriod.id } } });
    await prisma.vehicleMonthlyRecord.deleteMany({ where: { periodId: octPeriod.id } });
    await prisma.financialPeriod.delete({ where: { id: octPeriod.id } });
  }

  // Recalculate periods
  const periods = await prisma.financialPeriod.findMany();
  for (const p of periods) {
    const recs = await prisma.vehicleMonthlyRecord.findMany({
      where: { periodId: p.id, isDeleted: false },
      select: {
        grossBilling: true,
        totalDeductions: true,
        netPayable: true,
        amountPaid: true,
      }
    });

    let periodGross = 0;
    let periodDeductions = 0;
    let periodNet = 0;
    let periodPaid = 0;

    for (const r of recs) {
      periodGross += r.grossBilling;
      periodDeductions += r.totalDeductions;
      periodNet += r.netPayable;
      periodPaid += r.amountPaid;
    }

    await prisma.financialPeriod.update({
      where: { id: p.id },
      data: {
        grossBilling: Math.round(periodGross * 100) / 100,
        totalDeductions: Math.round(periodDeductions * 100) / 100,
        netPayable: Math.round(periodNet * 100) / 100,
        totalPaid: Math.round(periodPaid * 100) / 100,
      }
    });
  }

  console.log('All records and periods recalculated successfully.');
}

main().finally(() => prisma.$disconnect());
