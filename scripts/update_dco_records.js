const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateDcoRecords() {
  console.log('=== ATHARVA TRAVELS: DCO RECORDS UPDATE & SEEDING ===\n');

  const dcoAccount = await prisma.bankAccount.findUnique({
    where: { accountSlug: 'dco' },
  });

  if (!dcoAccount) {
    throw new Error('DCO BankAccount record not found!');
  }

  console.log(`Found DCO Account ID: ${dcoAccount.id}`);

  // 1. Soft-delete obsolete 0-amount record if it exists and is active
  const obsoleteEntry = await prisma.bankAccountEntry.findUnique({
    where: { id: 'cmw7ibkzw002693fy0lzo6kf3' }
  });

  if (obsoleteEntry && !obsoleteEntry.isDeleted) {
    await prisma.bankAccountEntry.update({
      where: { id: obsoleteEntry.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        remarks: 'Superseded by 3 valid November 2026 booking entries totaling -₹15,000.00'
      }
    });

    // Add to Recycle Bin
    await prisma.recycleBinItem.create({
      data: {
        entityType: 'BankAccountEntry',
        entityId: obsoleteEntry.id,
        displayName: `${obsoleteEntry.particulars} (₹${obsoleteEntry.amount}) - Obsolete DCO record`,
        deletedByEmail: 'bhaskar.internal@atharvatravels.com',
        snapshotData: JSON.stringify(obsoleteEntry),
        restoreStatus: 'DELETED',
      }
    });

    console.log('✔ Soft-deleted obsolete 0-amount entry cmw7ibkzw002693fy0lzo6kf3');
  }

  // 2. Define the 3 legitimate individual booking entries from the screenshot
  const initialDcoEntries = [
    {
      txnId: 'DCO-202611-001',
      date: '2026-11-10',
      originalDate: '10-11-2026',
      particulars: 'Booking amount',
      category: 'Booking amount',
      amount: -5000,
      paidAmount: 5000,
      netAmount: -5000,
      rowIndex: 3,
    },
    {
      txnId: 'DCO-202611-002',
      date: '2026-11-10',
      originalDate: '10-11-2026',
      particulars: 'Booking amount',
      category: 'Booking amount',
      amount: -5000,
      paidAmount: 5000,
      netAmount: -5000,
      rowIndex: 4,
    },
    {
      txnId: 'DCO-202611-003',
      date: '2026-11-10',
      originalDate: '10-11-2026',
      particulars: 'Booking amount',
      category: 'Booking amount',
      amount: -5000,
      paidAmount: 5000,
      netAmount: -5000,
      rowIndex: 5,
    },
  ];

  // 3. Insert the 3 entries if they do not already exist
  let insertedCount = 0;
  for (const item of initialDcoEntries) {
    const existing = await prisma.bankAccountEntry.findFirst({
      where: {
        accountId: dcoAccount.id,
        meta: { contains: item.txnId },
        isDeleted: false,
      }
    });

    if (!existing) {
      const metaObj = {
        transactionId: item.txnId,
        financialYear: '2026-27',
        financialMonth: 'Nov-26',
        originalDateString: item.originalDate,
        debitCredit: 'DEBIT',
        paymentStatus: 'PAID',
        paymentMode: 'BANK_TRANSFER',
        bankTxnReference: 'REF-BANK-D11-DCO',
        isBaselineLinked: true,
      };

      const entry = await prisma.bankAccountEntry.create({
        data: {
          accountId: dcoAccount.id,
          periodCode: '2026-NOV',
          entryDate: item.date,
          section: 'BOOKING',
          category: item.category,
          particulars: item.particulars,
          sourceReference: 'DCO-BOOKING',
          amount: item.amount,
          rawAmount: String(item.amount),
          paidAmount: item.paidAmount,
          receivedAmount: 0,
          netAmount: item.netAmount,
          comments: 'Booking amount',
          remarks: 'Initial DCO Booking Entry from Excel source',
          meta: JSON.stringify(metaObj),
          rowIndex: item.rowIndex,
          isDeleted: false,
        }
      });

      // Create initial version snapshot
      await prisma.bankAccountEntryVersion.create({
        data: {
          entryId: entry.id,
          versionNumber: 1,
          snapshotData: JSON.stringify(entry),
          changeReason: 'Initial DCO verified booking record import from screenshot',
          createdById: 'bhaskar-admin-id',
          createdByEmail: 'bhaskar.internal@atharvatravels.com',
        }
      });

      console.log(`✔ Inserted [${item.txnId}]: Date=${item.date}, Item="${item.particulars}", Amount=₹${item.amount}`);
      insertedCount++;
    } else {
      console.log(`ℹ Record [${item.txnId}] already exists. Skipped duplicate creation.`);
    }
  }

  // 4. Upsert the 2026-NOV BankAccountPeriod for DCO
  const novPeriod = await prisma.bankAccountPeriod.upsert({
    where: {
      accountId_periodCode: {
        accountId: dcoAccount.id,
        periodCode: '2026-NOV',
      }
    },
    update: {
      periodLabel: 'November 2026',
      openingBalance: 0,
      totalIncome: 0,
      totalExpense: 15000,
      netBalance: -15000,
      closingBalance: -15000,
      status: 'RECONCILED',
    },
    create: {
      accountId: dcoAccount.id,
      periodCode: '2026-NOV',
      periodLabel: 'November 2026',
      openingBalance: 0,
      totalIncome: 0,
      totalExpense: 15000,
      netBalance: -15000,
      closingBalance: -15000,
      status: 'RECONCILED',
    }
  });
  console.log(`✔ Upserted DCO 2026-NOV accounting period (Net Balance: ₹${novPeriod.netBalance})`);

  // 5. Create Audit Log Entry
  await prisma.auditLog.create({
    data: {
      userEmail: 'bhaskar.internal@atharvatravels.com',
      action: 'IMPORT',
      module: 'BANK_ACCOUNTS',
      entityType: 'BankAccountEntry',
      entityId: dcoAccount.id,
      newState: JSON.stringify({
        account: 'DCO',
        entriesAdded: insertedCount,
        totalBookingAmount: -15000,
        transactions: ['DCO-202611-001', 'DCO-202611-002', 'DCO-202611-003']
      }),
      reason: 'Imported 3 verified DCO booking entries of -₹5,000 each totaling -₹15,000.00 linked to Main Bank Balance D11'
    }
  });

  console.log('✔ Logged Audit record for DCO update.');
  console.log('\n=== DCO RECORDS UPDATE COMPLETE ===');
  await prisma.$disconnect();
}

updateDcoRecords().catch(e => {
  console.error('Failed to update DCO records:', e);
  process.exit(1);
});

