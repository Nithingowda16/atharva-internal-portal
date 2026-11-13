const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProfitSharingRecords() {
  console.log('=== ATHARVA TRAVELS: PROFIT SHARING DATABASE UPDATE ===\n');

  const psAccount = await prisma.bankAccount.findUnique({
    where: { accountSlug: 'profit-sharing' },
  });

  if (!psAccount) {
    throw new Error('Profit Sharing BankAccount record not found!');
  }

  console.log(`Found Profit Sharing Account ID: ${psAccount.id}`);

  // 1. Soft-delete the 3 old lumped monthly summary entries (they are being replaced by granular verified entries)
  const oldLumpedIds = [
    'cmw7iblal002g93fyrwtd6nwn', // Old Jul-26 lumped
    'cmw7iblef002k93fyigeywxgz', // Old Aug-26 lumped
    'cmw7iblh1002o93fyc0mk3wt7', // Old Sep-26 lumped
  ];

  for (const id of oldLumpedIds) {
    const existing = await prisma.bankAccountEntry.findUnique({ where: { id } });
    if (existing && !existing.isDeleted) {
      await prisma.bankAccountEntry.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          remarks: 'Superseded by granular verified profit sharing lines and individual adjustments',
        },
      });

      await prisma.recycleBinItem.create({
        data: {
          entityType: 'BankAccountEntry',
          entityId: id,
          displayName: `${existing.particulars} (₹${existing.amount}) - Lumped Entry`,
          deletedByEmail: 'bhaskar.internal@atharvatravels.com',
          snapshotData: JSON.stringify(existing),
          restoreStatus: 'DELETED',
        },
      });
      console.log(`✔ Soft-deleted obsolete lumped entry: ${id} (${existing.particulars})`);
    }
  }

  // 2. Granular verified entries from the screenshot
  const granularEntries = [
    // --- JULY 2026 ---
    {
      txnId: 'PS-202607-001',
      date: '2026-07-31',
      periodCode: 'Jul-26',
      section: 'MONTHLY_PROFIT',
      category: 'ECO Contribution',
      particulars: 'ECO Travels Monthly Profit (July 2026)',
      company: 'ECO Travels',
      amount: 47794.99,
      paidAmount: 0,
      receivedAmount: 47794.99,
      netAmount: 47794.99,
      rowIndex: 2,
      meta: {
        transactionId: 'PS-202607-001',
        financialYear: '2026-27',
        financialMonth: 'Jul-26',
        company: 'ECO Travels',
        profitType: 'CONTRIBUTION',
        applicableShares: 3,
        paymentStatus: 'ALLOCATED',
      },
    },
    {
      txnId: 'PS-202607-002',
      date: '2026-07-31',
      periodCode: 'Jul-26',
      section: 'MONTHLY_PROFIT',
      category: 'EURO Contribution',
      particulars: 'EURO-Amz Monthly Profit (July 2026)',
      company: 'EURO-Amz',
      amount: 27945.35,
      paidAmount: 0,
      receivedAmount: 27945.35,
      netAmount: 27945.35,
      rowIndex: 3,
      meta: {
        transactionId: 'PS-202607-002',
        financialYear: '2026-27',
        financialMonth: 'Jul-26',
        company: 'EURO-Amz',
        profitType: 'CONTRIBUTION',
        applicableShares: 3,
        paymentStatus: 'ALLOCATED',
      },
    },
    {
      txnId: 'PS-202607-003',
      date: '2026-07-31',
      periodCode: 'Jul-26',
      section: 'PROFIT_ADJUSTMENT',
      category: 'Black Rock',
      particulars: 'Black Rock Partner Adjustment (July 2026)',
      company: 'Black Rock',
      amount: -3750.00,
      paidAmount: 3750.00,
      receivedAmount: 0,
      netAmount: -3750.00,
      rowIndex: 7,
      meta: {
        transactionId: 'PS-202607-003',
        financialYear: '2026-27',
        financialMonth: 'Jul-26',
        company: 'Black Rock',
        profitType: 'ADJUSTMENT',
        adjustmentType: 'LESS',
        applicableShares: 3,
        paymentStatus: 'ALLOCATED',
      },
    },

    // --- AUGUST 2026 ---
    {
      txnId: 'PS-202608-001',
      date: '2026-08-31',
      periodCode: 'Aug-26',
      section: 'MONTHLY_PROFIT',
      category: 'ECO Contribution',
      particulars: 'ECO Travels Monthly Profit (Aug 2026)',
      company: 'ECO Travels',
      amount: 82574.50,
      paidAmount: 0,
      receivedAmount: 82574.50,
      netAmount: 82574.50,
      rowIndex: 2,
      meta: {
        transactionId: 'PS-202608-001',
        financialYear: '2026-27',
        financialMonth: 'Aug-26',
        company: 'ECO Travels',
        profitType: 'CONTRIBUTION',
        applicableShares: 3,
        paymentStatus: 'ALLOCATED',
      },
    },
    {
      txnId: 'PS-202608-002',
      date: '2026-08-31',
      periodCode: 'Aug-26',
      section: 'MONTHLY_PROFIT',
      category: 'EURO Contribution',
      particulars: 'EURO-Amz Monthly Profit (Aug 2026)',
      company: 'EURO-Amz',
      amount: 21143.70,
      paidAmount: 0,
      receivedAmount: 21143.70,
      netAmount: 21143.70,
      rowIndex: 3,
      meta: {
        transactionId: 'PS-202608-002',
        financialYear: '2026-27',
        financialMonth: 'Aug-26',
        company: 'EURO-Amz',
        profitType: 'CONTRIBUTION',
        applicableShares: 3,
        paymentStatus: 'ALLOCATED',
      },
    },

    // --- SEPTEMBER 2026 ADJUSTMENTS ---
    {
      txnId: 'PS-202609-001',
      date: '2026-09-30',
      periodCode: 'Sep-26',
      section: 'PROFIT_ADJUSTMENT',
      category: 'Davis',
      particulars: 'Davis Partner Adjustment (Sep 2026)',
      company: 'Davis',
      amount: -30000.00,
      paidAmount: 30000.00,
      receivedAmount: 0,
      netAmount: -30000.00,
      rowIndex: 2,
      meta: {
        transactionId: 'PS-202609-001',
        financialYear: '2026-27',
        financialMonth: 'Sep-26',
        company: 'Davis',
        profitType: 'ADJUSTMENT',
        adjustmentType: 'LESS',
        applicableShares: 3,
        paymentStatus: 'ALLOCATED',
      },
    },
    {
      txnId: 'PS-202609-002',
      date: '2026-09-30',
      periodCode: 'Sep-26',
      section: 'PROFIT_ADJUSTMENT',
      category: 'BR',
      particulars: 'BR Partner Adjustment (Sep 2026)',
      company: 'BR',
      amount: -6000.00,
      paidAmount: 6000.00,
      receivedAmount: 0,
      netAmount: -6000.00,
      rowIndex: 3,
      meta: {
        transactionId: 'PS-202609-002',
        financialYear: '2026-27',
        financialMonth: 'Sep-26',
        company: 'BR',
        profitType: 'ADJUSTMENT',
        adjustmentType: 'LESS',
        applicableShares: 3,
        paymentStatus: 'ALLOCATED',
      },
    },
    {
      txnId: 'PS-202609-003',
      date: '2026-09-30',
      periodCode: 'Sep-26',
      section: 'PROFIT_ADJUSTMENT',
      category: 'Sweet-9-11-26',
      particulars: 'Sweet-9-11-26 Partner Adjustment (Sep 2026)',
      company: 'Sweet',
      amount: -5000.00,
      paidAmount: 5000.00,
      receivedAmount: 0,
      netAmount: -5000.00,
      rowIndex: 4,
      meta: {
        transactionId: 'PS-202609-003',
        financialYear: '2026-27',
        financialMonth: 'Sep-26',
        company: 'Sweet',
        profitType: 'ADJUSTMENT',
        adjustmentType: 'LESS',
        applicableShares: 3,
        paymentStatus: 'ALLOCATED',
      },
    },
  ];

  // 3. Insert granular entries (idempotent check)
  let inserted = 0;
  for (const item of granularEntries) {
    const existing = await prisma.bankAccountEntry.findFirst({
      where: {
        accountId: psAccount.id,
        meta: { contains: item.txnId },
        isDeleted: false,
      },
    });

    if (!existing) {
      const entry = await prisma.bankAccountEntry.create({
        data: {
          accountId: psAccount.id,
          periodCode: item.periodCode,
          entryDate: item.date,
          section: item.section,
          category: item.category,
          particulars: item.particulars,
          sourceReference: item.company,
          amount: item.amount,
          rawAmount: String(item.amount),
          paidAmount: item.paidAmount,
          receivedAmount: item.receivedAmount,
          netAmount: item.netAmount,
          comments: item.particulars,
          remarks: 'Granular Profit Sharing line from verified Excel screenshot',
          meta: JSON.stringify(item.meta),
          rowIndex: item.rowIndex,
          isDeleted: false,
        },
      });

      await prisma.bankAccountEntryVersion.create({
        data: {
          entryId: entry.id,
          versionNumber: 1,
          snapshotData: JSON.stringify(entry),
          changeReason: 'Initial verified granular Profit Sharing record import',
          createdById: 'bhaskar-admin-id',
          createdByEmail: 'bhaskar.internal@atharvatravels.com',
        },
      });

      console.log(`✔ Inserted [${item.txnId}]: Period=${item.periodCode}, Item="${item.particulars}", Amount=₹${item.amount}`);
      inserted++;
    } else {
      console.log(`ℹ Record [${item.txnId}] already exists. Skipped duplicate.`);
    }
  }

  // 4. Update BankAccountPeriods for July, August, and September
  // July 2026 Period
  await prisma.bankAccountPeriod.upsert({
    where: {
      accountId_periodCode: {
        accountId: psAccount.id,
        periodCode: 'Jul-26',
      },
    },
    update: {
      periodLabel: 'July 2026',
      totalIncome: 75740.34,
      totalExpense: 3750.00,
      netBalance: 71990.34,
      closingBalance: 23996.78,
      status: 'ACTIVE',
      remarks: 'Each partner share: ₹23,996.78',
    },
    create: {
      accountId: psAccount.id,
      periodCode: 'Jul-26',
      periodLabel: 'July 2026',
      totalIncome: 75740.34,
      totalExpense: 3750.00,
      netBalance: 71990.34,
      closingBalance: 23996.78,
      status: 'ACTIVE',
      remarks: 'Each partner share: ₹23,996.78',
    },
  });
  console.log('✔ Reconciled Jul-26 Period: Net=₹71,990.34, Each=₹23,996.78');

  // August 2026 Period
  await prisma.bankAccountPeriod.upsert({
    where: {
      accountId_periodCode: {
        accountId: psAccount.id,
        periodCode: 'Aug-26',
      },
    },
    update: {
      periodLabel: 'August 2026',
      totalIncome: 103718.20,
      totalExpense: 0.00,
      netBalance: 103718.20,
      closingBalance: 34572.73,
      status: 'ACTIVE',
      remarks: 'Each partner share: ₹34,572.73',
    },
    create: {
      accountId: psAccount.id,
      periodCode: 'Aug-26',
      periodLabel: 'August 2026',
      totalIncome: 103718.20,
      totalExpense: 0.00,
      netBalance: 103718.20,
      closingBalance: 34572.73,
      status: 'ACTIVE',
      remarks: 'Each partner share: ₹34,572.73',
    },
  });
  console.log('✔ Reconciled Aug-26 Period: Net=₹103,718.20, Each=₹34,572.73');

  // September 2026 Period (Updated to -41,000 to include Sweet-9-11-26)
  await prisma.bankAccountPeriod.upsert({
    where: {
      accountId_periodCode: {
        accountId: psAccount.id,
        periodCode: 'Sep-26',
      },
    },
    update: {
      periodLabel: 'September 2026',
      totalIncome: 0.00,
      totalExpense: 41000.00,
      netBalance: -41000.00,
      closingBalance: -13666.67,
      status: 'ACTIVE',
      remarks: 'Each partner share: -₹13,666.67 (Total Adjustments: -₹41,000.00)',
    },
    create: {
      accountId: psAccount.id,
      periodCode: 'Sep-26',
      periodLabel: 'September 2026',
      totalIncome: 0.00,
      totalExpense: 41000.00,
      netBalance: -41000.00,
      closingBalance: -13666.67,
      status: 'ACTIVE',
      remarks: 'Each partner share: -₹13,666.67 (Total Adjustments: -₹41,000.00)',
    },
  });
  console.log('✔ Reconciled Sep-26 Period: Net=-₹41,000.00, Each=-₹13,666.67 (matches Main Bank Balance Row 62)');

  // 5. Ensure Hemaraj records (3) and Cash With Hemaraj records (3) have versions
  const existingRecordsToVerify = await prisma.bankAccountEntry.findMany({
    where: {
      accountId: psAccount.id,
      section: { in: ['PARTNER_DRAWING', 'CASH_HOLDING'] },
      isDeleted: false,
    },
    include: { versions: true },
  });

  for (const r of existingRecordsToVerify) {
    if (!r.versions || r.versions.length === 0) {
      await prisma.bankAccountEntryVersion.create({
        data: {
          entryId: r.id,
          versionNumber: 1,
          snapshotData: JSON.stringify(r),
          changeReason: 'Baseline version capture for existing record',
          createdById: 'bhaskar-admin-id',
          createdByEmail: 'bhaskar.internal@atharvatravels.com',
        },
      });
      console.log(`✔ Created version snapshot for: ${r.particulars} (₹${r.amount})`);
    }
  }

  // 6. Audit Log Entry
  await prisma.auditLog.create({
    data: {
      userEmail: 'bhaskar.internal@atharvatravels.com',
      action: 'UPDATE',
      module: 'BANK_ACCOUNTS',
      entityType: 'BankAccountEntry',
      entityId: psAccount.id,
      newState: JSON.stringify({
        account: 'Profit Sharing',
        entriesAdded: inserted,
        periodsUpdated: ['Jul-26', 'Aug-26', 'Sep-26'],
        septemberAdjustmentsTotal: -41000.00,
      }),
      reason: 'Updated Profit Sharing to granular verified lines (Jul: ₹71,990.34, Aug: ₹103,718.20, Sep: -₹41,000.00) matching Main Bank Balance Row 62',
    },
  });

  console.log('\n=== PROFIT SHARING DATABASE UPDATE COMPLETE ===');
  await prisma.$disconnect();
}

updateProfitSharingRecords().catch(e => {
  console.error('Failed to update Profit Sharing records:', e);
  process.exit(1);
});

