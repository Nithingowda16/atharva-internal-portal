const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const account = await prisma.bankAccount.findFirst({
    where: {
      OR: [
        { accountSlug: 'bank-balance' },
        { accountName: 'Bank Balance' },
      ],
    },
    include: {
      periods: true,
      entries: {
        where: { isDeleted: false },
        orderBy: [{ rowIndex: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!account) {
    console.log('No Bank Balance account found in DB!');
    return;
  }

  console.log('--- Bank Account ---');
  console.log(`ID: ${account.id}, Name: ${account.accountName}, Slug: ${account.accountSlug}, Type: ${account.accountType}`);

  console.log('\n--- Periods ---');
  account.periods.forEach(p => {
    console.log(`Period ID: ${p.id}, Code: ${p.periodCode}, Label: ${p.periodLabel}, Net: ${p.netBalance}, Closing: ${p.closingBalance}`);
  });

  console.log(`\n--- Entries Count: ${account.entries.length} ---`);
  account.entries.forEach((e, idx) => {
    console.log(`[${idx + 1}] ID: ${e.id}, Row: ${e.rowIndex}, Date: ${e.entryDate}, Section: ${e.section}, Category: ${e.category}, Particulars: ${e.particulars}, Amount: ${e.amount}, Paid: ${e.paidAmount}, Received: ${e.receivedAmount}, Formula: ${e.formulaString}, Comments: ${e.comments}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

