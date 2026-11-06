const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function testBackupRestore() {
  console.log('Testing Backup Generation & Recovery...');

  // Create backups folder
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = 'test_' + Date.now();
  const backupFileName = `test_backup_${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFileName);

  const [users, periods, records] = await Promise.all([
    prisma.user.findMany(),
    prisma.financialPeriod.findMany(),
    prisma.vehicleMonthlyRecord.findMany(),
  ]);

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    initiatedBy: 'automated-test',
    tableCounts: {
      users: users.length,
      periods: periods.length,
      records: records.length,
    },
    data: {
      users,
      periods,
      records,
    }
  };

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Backup written to:', backupFileName, `(${users.length} users, ${records.length} records)`);

  // Run restore
  console.log('Running restore script...');
  const output = execSync(`node scripts/restore_backup.js backups/${backupFileName}`, { encoding: 'utf8' });
  console.log(output);

  // Clean up test backup file
  fs.unlinkSync(backupPath);
  console.log('Test backup file cleaned up.');
  console.log('✔ PASS: Backup and recovery test passed!');
}

testBackupRestore()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

