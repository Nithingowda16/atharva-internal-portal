const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('================================================================');
  console.log('ATHARVA TRAVELS — DATABASE BACKUP PROCEDURE (STEP 9)');
  console.log('================================================================\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `db_backup_${timestamp}.json`);

  console.log('Extracting current state of all critical financial tables...');

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'ATHARVA TRAVELS FINANCE MANAGEMENT PORTAL',
      description: 'Pre-migration full database snapshot for Centralized Accounting',
    },
    users: await prisma.user.findMany(),
    bankAccounts: await prisma.bankAccount.findMany({ include: { periods: true } }),
    bankAccountEntriesCount: await prisma.bankAccountEntry.count(),
    tdsRecords: await prisma.tdsRecord.findMany({ include: { versions: true } }),
    fuelCommissionRecords: await prisma.fuelCommissionRecord.findMany({ include: { versions: true } }),
    financialPeriods: await prisma.financialPeriod.findMany(),
    vehicles: await prisma.vehicle.findMany(),
    drivers: await prisma.driver.findMany(),
    auditLogsCount: await prisma.auditLog.count(),
    rawCellsCount: await prisma.sourceWorkbookCell.count(),
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`\n✔ Backup successfully created at: ${backupFilePath}`);
  console.log(`- Users: ${backupData.users.length}`);
  console.log(`- Bank Accounts: ${backupData.bankAccounts.length}`);
  console.log(`- Bank Entries Count: ${backupData.bankAccountEntriesCount}`);
  console.log(`- TDS Records: ${backupData.tdsRecords.length}`);
  console.log(`- Fuel Commission Records: ${backupData.fuelCommissionRecords.length}`);
  console.log(`- Vehicles: ${backupData.vehicles.length}`);
  console.log(`- Drivers: ${backupData.drivers.length}`);
  console.log(`- Raw Cells: ${backupData.rawCellsCount}`);

  await prisma.$disconnect();
}

backupDatabase().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});

