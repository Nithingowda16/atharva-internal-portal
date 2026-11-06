const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restore(backupFilePath) {
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    console.error('Error: Please provide a valid backup JSON file path.');
    console.log('Usage: node scripts/restore_backup.js backups/<filename>.json');
    process.exit(1);
  }

  console.log(`--- Restoring ATHARVA TRAVELS Database from: ${backupFilePath} ---`);
  const raw = fs.readFileSync(backupFilePath, 'utf8');
  const backup = JSON.parse(raw);

  if (!backup.data) {
    console.error('Invalid backup format: missing data field.');
    process.exit(1);
  }

  const { data, tableCounts } = backup;
  console.log('Backup summary:', tableCounts);

  // Restore in transactional order
  console.log('Restoring tables...');

  // 1. Users
  if (data.users?.length) {
    for (const u of data.users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role, permissions: u.permissions, isAllowed: u.isAllowed },
        create: { id: u.id, email: u.email, name: u.name, passwordHash: u.passwordHash || '', role: u.role, permissions: u.permissions, isAllowed: u.isAllowed }
      });
    }
    console.log(`  ✔ Restored ${data.users.length} users`);
  }

  // 2. Periods
  if (data.periods?.length) {
    for (const p of data.periods) {
      await prisma.financialPeriod.upsert({
        where: { monthCode: p.monthCode },
        update: { periodName: p.periodName, financialYear: p.financialYear, startDate: p.startDate, endDate: p.endDate, status: p.status, grossBilling: p.grossBilling, totalDeductions: p.totalDeductions, netPayable: p.netPayable, totalPaid: p.totalPaid, isDeleted: p.isDeleted },
        create: p
      });
    }
    console.log(`  ✔ Restored ${data.periods.length} financial periods`);
  }

  // 3. Vehicles
  if (data.vehicles?.length) {
    for (const v of data.vehicles) {
      await prisma.vehicle.upsert({
        where: { id: v.id },
        update: { registrationNumber: v.registrationNumber, vehicleType: v.vehicleType, isActive: v.isActive, ownerName: v.ownerName, bankAccountMasked: v.bankAccountMasked, bankName: v.bankName, ifscCode: v.ifscCode, isDeleted: v.isDeleted },
        create: v
      });
    }
    console.log(`  ✔ Restored ${data.vehicles.length} vehicles`);
  }

  // 4. Companies
  if (data.companies?.length) {
    for (const c of data.companies) {
      await prisma.company.upsert({
        where: { name: c.name },
        update: { code: c.code, category: c.category, defaultRate: c.defaultRate, isActive: c.isActive },
        create: c
      });
    }
    console.log(`  ✔ Restored ${data.companies.length} companies`);
  }

  // 5. Monthly Records
  if (data.records?.length) {
    for (const r of data.records) {
      await prisma.vehicleMonthlyRecord.upsert({
        where: { id: r.id },
        update: { grossBilling: r.grossBilling, totalDeductions: r.totalDeductions, netPayable: r.netPayable, amountPaid: r.amountPaid, paymentStatus: r.paymentStatus, paymentDate: r.paymentDate, remarks: r.remarks, isDeleted: r.isDeleted },
        create: r
      });
    }
    console.log(`  ✔ Restored ${data.records.length} monthly vehicle records`);
  }

  // 6. Billing Lines
  if (data.billingLines?.length) {
    for (const b of data.billingLines) {
      await prisma.billingLine.upsert({
        where: { id: b.id },
        update: { billingAmount: b.billingAmount, kmOrTrips: b.kmOrTrips, applicableRate: b.applicableRate, isDeleted: b.isDeleted },
        create: b
      });
    }
    console.log(`  ✔ Restored ${data.billingLines.length} billing lines`);
  }

  // 7. Adjustments
  if (data.adjustments?.length) {
    for (const a of data.adjustments) {
      await prisma.financialAdjustment.upsert({
        where: { id: a.id },
        update: { amount: a.amount, category: a.category, adjustmentType: a.adjustmentType, isPostSettlement: a.isPostSettlement, isDeleted: a.isDeleted },
        create: a
      });
    }
    console.log(`  ✔ Restored ${data.adjustments.length} financial adjustments`);
  }

  // 8. Payments
  if (data.payments?.length) {
    for (const pm of data.payments) {
      await prisma.paymentTransaction.upsert({
        where: { id: pm.id },
        update: { amount: pm.amount, paymentDate: pm.paymentDate, paymentMode: pm.paymentMode, referenceNumber: pm.referenceNumber, isDeleted: pm.isDeleted },
        create: pm
      });
    }
    console.log(`  ✔ Restored ${data.payments.length} payment transactions`);
  }

  console.log('\n=== Database Restoration Completed Successfully! ===');
}

const targetFile = process.argv[2];
restore(targetFile)
  .catch((e) => {
    console.error('Restoration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

