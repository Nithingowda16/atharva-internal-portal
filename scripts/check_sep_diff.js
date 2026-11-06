const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-09' } });
  const dbRecs = await prisma.vehicleMonthlyRecord.findMany({
    where: { periodId: p.id },
    include: { adjustments: true, vehicle: true },
    orderBy: { sectionIndex: 'asc' }
  });

  const raw = JSON.parse(fs.readFileSync('scripts/extracted_workbook_summary.json', 'utf8'));
  const sepVehicles = raw.sheets['Pay slip'].vehicles;

  console.log(`DB recs: ${dbRecs.length}, raw vehicles: ${sepVehicles.length}`);

  let diffTotal = 0;
  for (let i = 0; i < sepVehicles.length; i++) {
    const rawV = sepVehicles[i];
    const dbV = dbRecs[i];
    const rawNet = rawV.net_payment.amount;
    const dbNet = dbV.netPayable;
    if (Math.abs(rawNet - dbNet) > 0.01) {
      console.log(`Section ${i + 1} (${dbV.vehicle.registrationNumber}): rawNet=${rawNet}, dbNet=${dbNet}, diff=${dbNet - rawNet}`);
      diffTotal += (dbNet - rawNet);
    }
  }
  console.log('Total diff:', diffTotal);
}

main().finally(() => prisma.$disconnect());

