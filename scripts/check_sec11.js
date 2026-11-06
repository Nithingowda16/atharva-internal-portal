const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-09' } });
  for (const s of [1, 11]) {
    const rec = await prisma.vehicleMonthlyRecord.findFirst({
      where: { periodId: p.id, sectionIndex: s },
      include: { adjustments: true, vehicle: true }
    });
    console.log(`\nSection ${s} (${rec.vehicle.registrationNumber}): gross=${rec.grossBilling}, deductions=${rec.totalDeductions}, net=${rec.netPayable}`);
    console.log(rec.adjustments.map(a => ({ id: a.id, cat: a.category, amt: a.amount, isPost: a.isPostSettlement, type: a.adjustmentType, notes: a.notes })));
  }
}

main().finally(() => prisma.$disconnect());

