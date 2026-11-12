const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importInitialTds() {
  console.log('=== IMPORTING INITIAL 2 TDS RECORDS ===\n');

  const initialTdsRecords = [
    {
      financialYear: '2026-27',
      financialMonth: 'Aug-26',
      companyName: 'ECO Travels',
      tdsCategory: '194C - Cab Transport',
      amount: 8989.95,
      transactionDate: '2026-08-31',
      tdsReferenceNo: 'ECO-TDS-AUG26',
      invoiceReference: 'INV-ECO-2026-08',
      accountingType: 'RECEIVABLE',
      status: 'CONFIRMED',
      remarks: 'Initial TDS deduction for Aug-26 as per workbook sheet TDS (Cell B6: 8,989.95)',
      createdByEmail: 'bhaskar.internal@atharvatravels.com',
    },
    {
      financialYear: '2026-27',
      financialMonth: 'Sep-26',
      companyName: 'ECO Travels',
      tdsCategory: '194C - Cab Transport',
      amount: 11215.35,
      transactionDate: '2026-09-30',
      tdsReferenceNo: 'ECO-TDS-SEP26',
      invoiceReference: 'INV-ECO-2026-09',
      accountingType: 'RECEIVABLE',
      status: 'CONFIRMED',
      remarks: 'Initial TDS deduction for Sep-26 as per workbook sheet TDS (Cell B7: 11,215.35)',
      createdByEmail: 'bhaskar.internal@atharvatravels.com',
    },
  ];

  for (const item of initialTdsRecords) {
    const existing = await prisma.tdsRecord.findFirst({
      where: {
        financialMonth: item.financialMonth,
        companyName: item.companyName,
        isDeleted: false,
      },
    });

    if (existing) {
      console.log(`[SKIP - MATCHED] TDS Record for ${item.companyName} (${item.financialMonth}) already exists with ID: ${existing.id}`);
    } else {
      const created = await prisma.tdsRecord.create({
        data: {
          financialYear: item.financialYear,
          financialMonth: item.financialMonth,
          companyName: item.companyName,
          tdsCategory: item.tdsCategory,
          amount: item.amount,
          transactionDate: item.transactionDate,
          tdsReferenceNo: item.tdsReferenceNo,
          invoiceReference: item.invoiceReference,
          accountingType: item.accountingType,
          status: item.status,
          remarks: item.remarks,
          createdByEmail: item.createdByEmail,
          versions: {
            create: {
              versionNumber: 1,
              snapshotData: JSON.stringify(item),
              changeReason: 'Initial verified source workbook import from sheet TDS',
              createdByEmail: item.createdByEmail,
            },
          },
        },
      });
      console.log(`[INSERTED - NEW] Created TDS record ID: ${created.id} for ${created.companyName} (${created.financialMonth}) -> ₹${created.amount}`);
    }
  }

  // Audit totals check
  const allTds = await prisma.tdsRecord.findMany({ where: { isDeleted: false } });
  const totalAmount = allTds.reduce((sum, r) => sum + r.amount, 0);
  console.log(`\nTotal Active TDS Records: ${allTds.length}`);
  console.log(`Total Active TDS Amount: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Expected Reference Total: ₹20,205.30`);
  console.log(`Status: ${Math.abs(totalAmount - 20205.30) < 0.05 ? 'PERFECT MATCH' : 'MISMATCH'}`);
}

importInitialTds().catch(console.error).finally(() => prisma.$disconnect());

