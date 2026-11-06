const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const users = await prisma.user.findMany({ select: { email: true, role: true, isAllowed: true } });
  const archives = await prisma.sourceFileArchive.count();
  const cells = await prisma.sourceWorkbookCell.count();
  const refCells = await prisma.sourceWorkbookCell.count({ where: { isRefError: true } });
  const periods = await prisma.financialPeriod.findMany();
  const vehicles = await prisma.vehicle.count();
  const records = await prisma.vehicleMonthlyRecord.count();
  const billingLines = await prisma.billingLine.count();
  const adjustments = await prisma.financialAdjustment.count();
  const versions = await prisma.recordVersion.count();

  console.log('=== DATABASE VERIFICATION ===');
  console.log('Users:', users);
  console.log('Archives:', archives);
  console.log('Populated Raw Cells Preserved:', cells);
  console.log('Flagged #REF! Cells:', refCells);
  console.log('Vehicles Master Count:', vehicles);
  console.log('Vehicle Monthly Records (92 expected):', records);
  console.log('Billing Lines:', billingLines);
  console.log('Financial Adjustments:', adjustments);
  console.log('Version Snapshots:', versions);
  console.log('Periods:', periods.map(p => ({
    name: p.periodName,
    code: p.monthCode,
    gross: p.grossBilling,
    net: p.netPayable,
    status: p.status
  })));
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

