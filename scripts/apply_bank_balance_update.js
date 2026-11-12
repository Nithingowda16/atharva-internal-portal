const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyUpdate() {
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

  if (!account) throw new Error('Bank balance account not found');

  const period = account.periods[0];
  const workbookPath = path.join(__dirname, '..', 'excel_sources', 'Upload data.xlsx');
  const wb = XLSX.readFile(workbookPath, { cellFormula: true, cellStyles: true, cellDates: true });
  const ws = wb.Sheets['Bank Balance'];

  console.log('--- Applying Bank Balance Updates in Transaction ---');

  await prisma.$transaction(async (tx) => {
    // 1. Update Row 8: Loan Taken Radha & Gok (Formula includes +1000)
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 8, isDeleted: false },
      data: {
        amount: Number(ws['D8']?.v),
        rawAmount: String(ws['D8']?.v),
        formulaString: ws['D8']?.f,
        updatedAt: new Date(),
      },
    });

    // 2. Row 9 & Row 10: Duplicate safeguard & formalization
    // Row 9 is updated with Date 28-10-2026, Amount 200,000, Formula 60000+20000+120000
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 9, isDeleted: false },
      data: {
        entryDate: '28-10-2026',
        particulars: 'Investment',
        amount: 200000,
        rawAmount: '200000',
        formulaString: ws['D9']?.f,
        comments: 'Investment',
        updatedAt: new Date(),
      },
    });

    // Row 10 in DB was the temporary 200,000 placeholder. In the new Excel sheet, columns A-E row 10 are blank.
    // To prevent counting 200k twice, we zero out Row 10 and mark it consolidated.
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 10, isDeleted: false },
      data: {
        amount: 0,
        rawAmount: '0',
        formulaString: 'Consolidated into Row 9',
        comments: 'Merged into formalized Row 9 (Date: 28-10-2026) to prevent duplicate counting',
        updatedAt: new Date(),
      },
    });

    // 3. Update Row 11: DCO (-15,000)
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 11, isDeleted: false },
      data: {
        amount: Number(ws['D11']?.v),
        rawAmount: String(ws['D11']?.v),
        formulaString: ws['D11']?.f,
        comments: 'DCO',
        updatedAt: new Date(),
      },
    });

    // 4. Update Row 31: EURO (AMZ) (-400,960.68)
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 31, isDeleted: false },
      data: {
        amount: Number(ws['D31']?.v),
        rawAmount: String(ws['D31']?.v),
        paidAmount: Math.abs(Number(ws['D31']?.v)),
        receivedAmount: Number(ws['C31']?.v),
        formulaString: ws['C31']?.f,
        updatedAt: new Date(),
      },
    });

    // 5. Update Row 38: ECO (WM/ORACLE) (-348,172.38)
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 38, isDeleted: false },
      data: {
        amount: Number(ws['D38']?.v),
        rawAmount: String(ws['D38']?.v),
        paidAmount: Math.abs(Number(ws['D38']?.v)),
        receivedAmount: Number(ws['C38']?.v),
        formulaString: ws['C38']?.f,
        updatedAt: new Date(),
      },
    });

    // 6. Update Row 58: O2 Mobility (-165,529.20)
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 58, isDeleted: false },
      data: {
        amount: Number(ws['D58']?.v),
        rawAmount: String(ws['D58']?.v),
        paidAmount: Math.abs(Number(ws['D58']?.v)),
        formulaString: ws['D58']?.f,
        updatedAt: new Date(),
      },
    });

    // 7. Update Row 62: Monthly Profit Sharing (-41,000.00)
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 62, isDeleted: false },
      data: {
        amount: Number(ws['D62']?.v),
        rawAmount: String(ws['D62']?.v),
        paidAmount: Math.abs(Number(ws['D62']?.v)),
        formulaString: ws['D62']?.f,
        updatedAt: new Date(),
      },
    });

    // 8. Row 68 Fuel Commission: Verify and preserve C68 #REF! error
    await tx.bankAccountEntry.updateMany({
      where: { accountId: account.id, rowIndex: 68, isDeleted: false },
      data: {
        amount: Number(ws['D68']?.v),
        rawAmount: String(ws['D68']?.v),
        formulaString: `C68: ='Expense '!#REF! (Preserved), D68: ='Fuel Commison'!D44`,
        comments: 'Preserved source formula error in C68 (#REF!) as mandated',
        updatedAt: new Date(),
      },
    });

    // 9. Upsert Row 81: Net Operating Balance
    const existingRow81 = await tx.bankAccountEntry.findFirst({
      where: { accountId: account.id, rowIndex: 81, isDeleted: false },
    });

    if (existingRow81) {
      await tx.bankAccountEntry.update({
        where: { id: existingRow81.id },
        data: {
          amount: Number(ws['D81']?.v),
          rawAmount: String(ws['D81']?.v),
          formulaString: ws['D81']?.f,
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.bankAccountEntry.create({
        data: {
          accountId: account.id,
          periodCode: period.periodCode,
          entryDate: 'Consolidated',
          section: 'SUMMARY_NET',
          category: 'NET_OPERATING',
          particulars: 'Net Operating Balance (Row 81)',
          sourceReference: 'System Summary',
          amount: Number(ws['D81']?.v),
          rawAmount: String(ws['D81']?.v),
          formulaString: ws['D81']?.f,
          comments: 'Calculated Net Operating Outflow (=SUM(D2:D80))',
          rowIndex: 81,
        },
      });
    }

    // 10. Update Period Balances to match November verified figures
    if (period) {
      await tx.bankAccountPeriod.update({
        where: { id: period.id },
        data: {
          totalIncome: 916246.23, // Cell E15 / L1
          totalExpense: Math.abs(Number(ws['D81']?.v)),
          netBalance: 146495.90, // Cell H1
          closingBalance: 1648617.55, // Cell M17
          status: 'RECONCILED',
          updatedAt: new Date(),
        },
      });
    }
  });

  console.log('Update completed successfully in database transaction!');
}

if (require.main === module) {
  applyUpdate()
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { applyUpdate };

