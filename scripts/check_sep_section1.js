const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-09' } });
  const rec = await prisma.vehicleMonthlyRecord.findFirst({
    where: { periodId: p.id, sectionIndex: 1 },
    include: { adjustments: true, billingLines: true, versions: true }
  });
  console.log('Record Section 1:', {
    grossBilling: rec.grossBilling,
    totalDeductions: rec.totalDeductions,
    netPayable: rec.netPayable,
    billingLines: rec.billingLines.length,
    adjustments: rec.adjustments.map(a => ({ cat: a.category, amt: a.amount })),
    versions: rec.versions.length
  });
}

main().finally(() => prisma.$disconnect());

