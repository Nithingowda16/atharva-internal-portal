const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-09' } });
  console.log('sepPeriod record:', p);

  const recs = await prisma.vehicleMonthlyRecord.findMany({ where: { periodId: p.id } });
  let sumNet = 0;
  let sumGross = 0;
  let sumDed = 0;
  for (const r of recs) {
    sumNet += r.netPayable;
    sumGross += r.grossBilling;
    sumDed += r.totalDeductions;
  }
  console.log({ sumNet, sumGross, sumDed });

  // Let's check reports API result
  const repRes = await prisma.financialPeriod.findMany();
  console.log('all periods:', repRes.map(x => ({ code: x.monthCode, gross: x.grossBilling, net: x.netPayable })));
}

main().finally(() => prisma.$disconnect());

