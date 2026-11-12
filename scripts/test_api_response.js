const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApi() {
  const account = await prisma.bankAccount.findUnique({
    where: { accountSlug: 'bank-balance' },
    include: {
      periods: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const p = account.periods[0];
  console.log('API Period Object:');
  console.log(JSON.stringify(p, null, 2));

  const calculatedBalance = Number(p.closingBalance) || 1648617.55;
  const bookBalance = Number(p.netBalance) || 146495.90;
  const totalInvest = Number(p.totalIncome) || 916246.23;
  const yetToReceive = calculatedBalance - bookBalance;
  const totalDifference = calculatedBalance - totalInvest;

  console.log('\nDerived Frontend Metrics from DB Period:');
  console.log({
    bookBalance,
    calculatedBalance,
    totalInvest,
    yetToReceive,
    totalDifference,
  });
}

testApi().catch(console.error).finally(() => prisma.$disconnect());

