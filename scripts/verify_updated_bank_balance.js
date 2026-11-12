const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const account = await prisma.bankAccount.findFirst({
    where: { accountSlug: 'bank-balance' },
    include: {
      entries: {
        where: { isDeleted: false },
        orderBy: [{ rowIndex: 'asc' }],
      },
      periods: true,
    },
  });

  console.log('=== POST-UPDATE VERIFICATION ===\n');
  console.log(`Account: ${account.accountName} (${account.accountSlug})`);
  const period = account.periods[0];
  console.log(`Period: ${period.periodCode} | ${period.periodLabel}`);
  console.log(`  - Book Balance (netBalance): ₹${period.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`  - Calculated Bank Balance (closingBalance): ₹${period.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`  - Total Investment (totalIncome): ₹${period.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`  - Net Operating Outflow (totalExpense): ₹${period.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`  - Status: ${period.status}`);

  console.log(`\nTotal Active Entries in DB: ${account.entries.length}`);

  // Check key rows
  const keyRows = [8, 9, 10, 11, 31, 38, 58, 62, 68, 81];
  console.log('\n--- Key Updated Entries Verification: ---');
  for (const r of keyRows) {
    const entry = account.entries.find(e => e.rowIndex === r);
    if (entry) {
      console.log(`Row ${r.toString().padStart(2)}: ID=${entry.id} | Date=${entry.entryDate} | Amount=${entry.amount} | Formula=${entry.formulaString} | Comments=${entry.comments}`);
    } else {
      console.log(`Row ${r.toString().padStart(2)}: NOT FOUND!`);
    }
  }

  // Duplicate Check
  console.log('\n--- Duplicate Check: ---');
  const rowCount = {};
  let duplicateFound = false;
  account.entries.forEach(e => {
    if (rowCount[e.rowIndex]) {
      console.log(`DUPLICATE DETECTED: RowIndex ${e.rowIndex} appears multiple times!`);
      duplicateFound = true;
    }
    rowCount[e.rowIndex] = (rowCount[e.rowIndex] || 0) + 1;
  });

  if (!duplicateFound) {
    console.log('CONFIRMED: ZERO DUPLICATE ROW ENTRIES.');
  }

  // Calculate sum of investments (rows 2-13)
  const investSum = account.entries
    .filter(e => e.rowIndex >= 2 && e.rowIndex <= 13)
    .reduce((sum, e) => sum + e.amount, 0);

  console.log(`\nSum of Investment Rows (2-13) in DB: ₹${investSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Expected Reference Investment: ₹9,16,246.23`);
  console.log(`Investment Match Status: ${Math.abs(investSum - 916246.23) < 0.01 ? 'PERFECT MATCH' : 'MISMATCH'}`);

  console.log('\n================================');
}

verify().catch(console.error).finally(() => prisma.$disconnect());

