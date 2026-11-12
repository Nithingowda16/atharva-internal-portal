const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseDB() {
  console.log('=== TASK 1 & 2: PRODUCTION POSTGRESQL VERIFICATION ===\n');

  const account = await prisma.bankAccount.findUnique({
    where: { accountSlug: 'bank-balance' },
    include: {
      periods: true,
      entries: {
        where: { isDeleted: false },
        orderBy: [{ rowIndex: 'asc' }],
      },
    },
  });

  if (!account) {
    console.log('ERROR: Bank Balance account not found!');
    return;
  }

  console.log(`Account ID: ${account.id}, Name: ${account.accountName}, Slug: ${account.accountSlug}`);
  console.log(`Total Active Entries in DB: ${account.entries.length}`);

  console.log('\n--- Periods in DB: ---');
  account.periods.forEach(p => {
    console.log(`Period ID: ${p.id}`);
    console.log(`  Code: ${p.periodCode}`);
    console.log(`  Label: ${p.periodLabel}`);
    console.log(`  netBalance (Book Balance): ${p.netBalance}`);
    console.log(`  closingBalance (Calculated Bank Balance): ${p.closingBalance}`);
    console.log(`  totalIncome (Total Investment): ${p.totalIncome}`);
    console.log(`  totalExpense (Net Operating Outflow): ${p.totalExpense}`);
    console.log(`  status: ${p.status}`);
    console.log(`  updatedAt: ${p.updatedAt}`);
  });

  console.log('\n--- Specific Updated Rows in DB: ---');
  const targetRows = [8, 9, 10, 11, 31, 38, 58, 62, 68, 81];
  for (const r of targetRows) {
    const entry = account.entries.find(e => e.rowIndex === r);
    if (entry) {
      console.log(`Row ${r.toString().padStart(2)}: amount=${entry.amount}, date=${entry.entryDate}, formula=${entry.formulaString}, comments=${entry.comments}`);
    } else {
      console.log(`Row ${r.toString().padStart(2)}: NOT FOUND!`);
    }
  }

  const investSum = account.entries
    .filter(e => e.rowIndex >= 2 && e.rowIndex <= 13)
    .reduce((sum, e) => sum + e.amount, 0);

  console.log(`\nComputed DB Investment Sum (Rows 2-13): ${investSum}`);
}

diagnoseDB().catch(console.error).finally(() => prisma.$disconnect());

