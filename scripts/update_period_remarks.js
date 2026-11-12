const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRemarks() {
  const updated = await prisma.bankAccountPeriod.update({
    where: { id: 'cmw7ibkxe002493fyv8wxtvjw' },
    data: {
      remarks: 'Book Bal: ₹1,46,495.90, Yet to Receive: ₹15,02,121.65, Diff: ₹7,32,371.32, Check Variance: ₹0.00',
    },
  });
  console.log('Updated remarks in DB:', updated.remarks);
}

updateRemarks().catch(console.error).finally(() => prisma.$disconnect());

