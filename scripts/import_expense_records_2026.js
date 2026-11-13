const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const screenshotRows = [
  { row: 3, month: 'Dec-24', particulars: 'RENT', amount: 3502.66, paidDate: '11-12-2024', comments: '', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 4, month: 'Dec-25', particulars: 'Personal-Amz party', amount: 3000.00, paidDate: '20-12-2025', comments: 'Harish GS', category: 'Personal Use', section: 'PERSONAL_DRAWINGS', class: 'Personal Drawing', status: 'PAID' },
  { row: 5, month: 'Dec-25', particulars: 'SMS Charges', amount: 178.48, paidDate: '27-12-2025', comments: 'Bank Charge', category: 'Bank Charges', section: 'BANK_CHARGES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 6, month: 'Dec-25', particulars: 'Rent-Nov-25', amount: 3800.00, paidDate: '12-01-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 7, month: 'Jan-25', particulars: 'Rent-DEC-25', amount: 3800.00, paidDate: '12-01-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 8, month: 'Jan-25', particulars: 'Current Bill', amount: 250.00, paidDate: '12-01-2026', comments: 'Current Bill', category: 'Utilities', section: 'OTHER_EXPENSE', class: 'Business Operating Expense', status: 'PAID' },
  { row: 9, month: 'Jan-26', particulars: 'Ca Fee', amount: 1700.00, paidDate: '20-01-2026', comments: '2Month[Nov&Dec]', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 10, month: 'Jan-26', particulars: 'Cheque Charges', amount: 590.00, paidDate: '20-01-2026', comments: 'ANP Cheque', category: 'Bank Charges', section: 'BANK_CHARGES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 11, month: 'Feb-26', particulars: 'Ca Fee', amount: 850.00, paidDate: '17-02-2026', comments: 'CA Charge', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 12, month: 'Mar-26', particulars: 'Domin Renewal', amount: 9500.00, paidDate: 'Adjustment', comments: 'Domine Renewal', category: 'Website Expenses', section: 'OFFICE_EXPENSE', class: 'Non-Cash Adjustment', status: 'ADJUSTMENT' },
  { row: 13, month: 'Feb-26', particulars: 'Ca Fee', amount: 850.00, paidDate: '18-03-2026', comments: 'CA Charge', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 14, month: 'Mar-26', particulars: 'Rent-JAN-26', amount: 4000.00, paidDate: '24-03-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 15, month: 'Apr-26', particulars: 'New Website charge', amount: 8200.00, paidDate: '07-04-2026', comments: 'New website creation', category: 'Website Expenses', section: 'OFFICE_EXPENSE', class: 'Business Operating Expense', status: 'PAID' },
  { row: 16, month: 'Apr-26', particulars: 'Ca Fee', amount: 850.00, paidDate: '29-04-2026', comments: 'CA Charge', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 17, month: 'Apr-26', particulars: 'Rent-FEB-26', amount: 4000.00, paidDate: '29-04-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 18, month: 'Apr-26', particulars: 'PT Tax', amount: 2900.00, paidDate: '29-04-2026', comments: 'TAX', category: 'Taxes', section: 'TAXES', class: 'Tax Payment', status: 'PAID' },
  { row: 19, month: 'Apr-26', particulars: 'Rent-MAR-26', amount: 3900.00, paidDate: '29-04-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 20, month: 'May-26', particulars: 'Profit taken -110000', amount: 10000.00, paidDate: '02-06-2026', comments: 'Drawing A/c', category: 'Profit Withdrawals', section: 'PERSONAL_DRAWINGS', class: 'Owner Withdrawal', status: 'PAID' },
  { row: 21, month: 'May-26', particulars: 'Ca Fee', amount: 1250.00, paidDate: '02-06-2026', comments: 'CA Charge', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 22, month: 'Jun-26', particulars: 'Rent-APR-26', amount: 4300.00, paidDate: '15-06-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 23, month: 'Jun-26', particulars: 'Rent-MAY-26', amount: 4300.00, paidDate: '15-06-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 24, month: 'Jun-26', particulars: 'Reddy', amount: 1.00, paidDate: '25-06-2026', comments: 'God', category: 'Donations', section: 'DONATIONS', class: 'Business Operating Expense', status: 'PAID' },
  { row: 25, month: 'Jun-26', particulars: 'New Table Exp', amount: 5000.00, paidDate: '03-07-2026', comments: 'Office Instruments', category: 'Office Equipment', section: 'OFFICE_EXPENSE', class: 'Business Operating Expense', status: 'PAID' },
  { row: 26, month: 'Jul-26', particulars: 'Sathis Exp', amount: 1000.00, paidDate: '10-07-2026', comments: 'Other', category: 'Miscellaneous', section: 'OTHER_EXPENSE', class: 'Business Operating Expense', status: 'PAID' },
  { row: 27, month: 'Jul-26', particulars: 'Ca Fee', amount: 2500.00, paidDate: '19-07-2026', comments: 'CA Charge', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 28, month: 'Jul-26', particulars: 'Rent-JUN-26', amount: 4300.00, paidDate: '15-08-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 29, month: 'Aug-26', particulars: 'Rent-JUL-26', amount: 4300.00, paidDate: '15-08-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 30, month: 'Aug-26', particulars: 'Ca Fee', amount: 18200.00, paidDate: '26-08-2026', comments: 'CA Charge', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 31, month: 'Aug-26', particulars: 'Personal Use', amount: 14000.00, paidDate: '26-08-2026', comments: 'Drawing A/c', category: 'Personal Use', section: 'PERSONAL_DRAWINGS', class: 'Personal Drawing', status: 'PAID' },
  { row: 32, month: 'Sep-26', particulars: 'Amazon-Harish 6182', amount: 2000.00, paidDate: '05-09-2026', comments: 'Other', category: 'Vehicle Expenses', section: 'OTHER_EXPENSE', class: 'Business Operating Expense', status: 'PAID' },
  { row: 33, month: 'Sep-26', particulars: 'Personal Use', amount: 25000.00, paidDate: '09-09-2026', comments: 'Drawing A/c', category: 'Personal Use', section: 'PERSONAL_DRAWINGS', class: 'Personal Drawing', status: 'PAID' },
  { row: 34, month: 'Sep-26', particulars: 'Krishna 4013', amount: 5000.00, paidDate: '30-09-2026', comments: 'ANP Exp.', category: 'Vehicle Expenses', section: 'OTHER_EXPENSE', class: 'Business Operating Expense', status: 'PAID' },
  { row: 35, month: 'Oct-26', particulars: 'New Printer', amount: 13670.00, paidDate: '01-10-2026', comments: 'Office Instruments', category: 'Office Equipment', section: 'OFFICE_EXPENSE', class: 'Business Operating Expense', status: 'PAID' },
  { row: 36, month: 'Oct-26', particulars: 'Rent-AUG-26', amount: 4300.00, paidDate: '03-10-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 37, month: 'Oct-26', particulars: 'Rent-SEP-26', amount: 4000.00, paidDate: '10-10-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
  { row: 38, month: 'Oct-26', particulars: 'Ca Fee', amount: 1250.00, paidDate: '15-10-2026', comments: 'CA Charge', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 39, month: 'Oct-26', particulars: 'Ca Fee', amount: 1250.00, paidDate: '15-10-2026', comments: 'CA Charge', category: 'CA Fees', section: 'PROFESSIONAL_FEES', class: 'Business Operating Expense', status: 'PAID' },
  { row: 40, month: 'Oct-26', particulars: 'Personal Use', amount: 7000.00, paidDate: '27-10-2026', comments: 'Drawing A/c', category: 'Personal Use', section: 'PERSONAL_DRAWINGS', class: 'Personal Drawing', status: 'PAID' },
  { row: 41, month: 'Oct-26', particulars: 'Personal Use', amount: 10000.00, paidDate: '01-11-2026', comments: 'Drawing A/c', category: 'Personal Use', section: 'PERSONAL_DRAWINGS', class: 'Personal Drawing', status: 'PAID' },
  { row: 42, month: 'Oct-26', particulars: 'Personal Use', amount: 125000.00, paidDate: '02-11-2026', comments: 'Drawing A/c', category: 'Personal Use', section: 'PERSONAL_DRAWINGS', class: 'Personal Drawing', status: 'PAID' },
  { row: 43, month: 'Jul-26', particulars: 'Swamy', amount: 12000.00, paidDate: '15-06-2026', comments: 'Donation', category: 'Donations', section: 'DONATIONS', class: 'Donation', status: 'PAID' },
  { row: 44, month: 'Jul-26', particulars: 'ECO-BR', amount: -1051.50, paidDate: '15-06-2026', comments: 'Expense Invest ment', category: 'Expense Investments', section: 'EXPENSE_INVESTMENT', class: 'Expense Investment', status: 'ADJUSTMENT' },
  { row: 45, month: 'Sep-26', particulars: 'IT Return', amount: -48809.00, paidDate: '15-09-2026', comments: 'Expense Invest ment', category: 'Expense Investments', section: 'EXPENSE_INVESTMENT', class: 'Expense Investment', status: 'ADJUSTMENT' },
  { row: 46, month: 'Nov-26', particulars: 'Rent', amount: 8000.00, paidDate: '10-11-2026', comments: 'Rent', category: 'Rent', section: 'RENT', class: 'Business Operating Expense', status: 'PAID' },
];

async function main() {
  console.log('================================================================');
  console.log('ATHARVA TRAVELS – IMPORT EXPENSE RECORDS (RENT & OTHER EXP -2026)');
  console.log('================================================================\n');

  // 1. Locate Expense Account
  const account = await prisma.bankAccount.findUnique({
    where: { accountSlug: 'expense' },
    include: {
      entries: { where: { isDeleted: false } },
      periods: true
    }
  });

  if (!account) {
    throw new Error('Expense account not found in database!');
  }

  console.log(`Target Account: ${account.accountName} (slug: ${account.accountSlug}, ID: ${account.id})`);
  console.log(`Current active DB entries: ${account.entries.length}`);

  // Fetch Super Admin for audit trail
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const adminId = superAdmin ? superAdmin.id : null;
  const adminEmail = superAdmin ? superAdmin.email : 'bhaskar.internal@atharvatravels.com';

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < screenshotRows.length; idx++) {
    const item = screenshotRows[idx];
    const seq = String(idx + 1).padStart(3, '0');
    const txnId = `EXP-2026-${seq}`;

    // Helper for financial year
    let fy = '2026-27';
    if (item.month.includes('24') || item.paidDate.includes('2024')) fy = '2024-25';
    else if (item.month.includes('25') && !item.paidDate.includes('2026')) fy = '2025-26';

    const metaObj = {
      transactionId: txnId,
      financialYear: fy,
      financialMonth: item.month,
      expenseCategory: item.category,
      accountingClassification: item.class,
      debitCredit: item.amount < 0 ? 'CREDIT' : 'DEBIT',
      paymentStatus: item.status,
      paymentMode: 'BANK_TRANSFER',
      sourceRow: item.row,
      comments: item.comments,
      isPostedToBank: item.status === 'PAID'
    };

    // Check if this row is the matched Row 3
    if (item.row === 3) {
      const matchRow3 = account.entries.find(e => 
        e.rowIndex === 3 || 
        (Math.abs(e.amount - 3502.66) < 0.01 && e.periodCode === 'Dec-24')
      );

      if (matchRow3) {
        console.log(`[UPDATE MATCHED] Updating Row 3: ${matchRow3.id} (${item.particulars} ₹${item.amount})`);
        const updated = await prisma.bankAccountEntry.update({
          where: { id: matchRow3.id },
          data: {
            periodCode: item.month,
            entryDate: item.paidDate,
            particulars: item.particulars,
            category: item.category,
            section: item.section,
            amount: item.amount,
            rawAmount: String(item.amount),
            paidAmount: item.amount,
            netAmount: item.amount,
            comments: item.comments,
            rowIndex: item.row,
            meta: JSON.stringify(metaObj)
          }
        });

        // Record version snapshot
        await prisma.bankAccountEntryVersion.create({
          data: {
            entryId: updated.id,
            versionNumber: 2,
            snapshotData: JSON.stringify(updated),
            changeReason: 'Updated from source screenshot RENT & OTHER EXP -2026 (Row 3)',
            createdById: adminId,
            createdByEmail: adminEmail
          }
        });

        updatedCount++;
        continue;
      }
    }

    // Check if already inserted
    const existing = await prisma.bankAccountEntry.findFirst({
      where: {
        accountId: account.id,
        rowIndex: item.row,
        periodCode: item.month,
        amount: item.amount,
        isDeleted: false
      }
    });

    if (existing) {
      console.log(`[SKIP MATCHED] Row ${item.row} already exists: [${existing.id}] ${item.particulars} (₹${item.amount})`);
      skippedCount++;
      continue;
    }

    // Insert new record
    const entry = await prisma.bankAccountEntry.create({
      data: {
        accountId: account.id,
        periodCode: item.month,
        entryDate: item.paidDate,
        section: item.section,
        category: item.category,
        particulars: item.particulars,
        sourceReference: item.comments || null,
        amount: item.amount,
        rawAmount: String(item.amount),
        paidAmount: item.status === 'PAID' ? item.amount : 0,
        receivedAmount: 0,
        netAmount: item.amount,
        formulaString: item.amount < 0 ? String(item.amount) : null,
        comments: item.comments,
        remarks: `Source row ${item.row} from RENT & OTHER EXP -2026`,
        rowIndex: item.row,
        meta: JSON.stringify(metaObj)
      }
    });

    // Create initial version snapshot
    await prisma.bankAccountEntryVersion.create({
      data: {
        entryId: entry.id,
        versionNumber: 1,
        snapshotData: JSON.stringify(entry),
        changeReason: `Initial import of Row ${item.row}: ${item.particulars} (₹${item.amount}) from RENT & OTHER EXP -2026`,
        createdById: adminId,
        createdByEmail: adminEmail
      }
    });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        userEmail: adminEmail,
        action: 'CREATE',
        module: 'BANK_ACCOUNTS',
        entityType: 'BankAccountEntry',
        entityId: entry.id,
        newState: JSON.stringify(entry),
        reason: `Imported Expense Row ${item.row}: ${item.particulars} (₹${item.amount}, ${item.class})`
      }
    });

    console.log(`[INSERTED] Row ${item.row}: ${txnId} | ${item.month} | ${item.particulars} | ₹${item.amount} | ${item.class} (ID: ${entry.id})`);
    insertedCount++;
  }

  // 3. Update or Create Consolidated Period for 2026-27
  const periodCode = 'CONSOLIDATED-2026';
  const existingPeriod = await prisma.bankAccountPeriod.findFirst({
    where: {
      accountId: account.id,
      periodCode: periodCode
    }
  });

  const allActive2026Entries = await prisma.bankAccountEntry.findMany({
    where: {
      accountId: account.id,
      isDeleted: false,
      rowIndex: { gte: 3, lte: 46 }
    }
  });

  const totalPositive = allActive2026Entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const totalCredits = allActive2026Entries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  const netBalance = allActive2026Entries.reduce((s, e) => s + e.amount, 0);

  if (existingPeriod) {
    await prisma.bankAccountPeriod.update({
      where: { id: existingPeriod.id },
      data: {
        totalIncome: totalCredits,
        totalExpense: totalPositive,
        netBalance: netBalance,
        closingBalance: netBalance,
        remarks: 'RENT & OTHER EXP -2026 Consolidated Period'
      }
    });
  } else {
    await prisma.bankAccountPeriod.create({
      data: {
        accountId: account.id,
        periodCode: periodCode,
        periodLabel: 'RENT & OTHER EXP - 2026',
        openingBalance: 0,
        totalIncome: totalCredits,
        totalExpense: totalPositive,
        netBalance: netBalance,
        closingBalance: netBalance,
        status: 'ACTIVE',
        remarks: 'RENT & OTHER EXP -2026 Consolidated Period'
      }
    });
  }

  console.log('\n================================================================');
  console.log(`IMPORT SUMMARY:`);
  console.log(`  Inserted: ${insertedCount}`);
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  Total Active 2026 Rows: ${allActive2026Entries.length} (Expected: 44)`);
  console.log(`  Gross Positive Expenses: ₹${totalPositive.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Expected: ₹3,39,492.14)`);
  console.log(`  Total Credits/Investments: ₹${totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Expected: ₹49,860.50)`);
  console.log(`  Net Expense Outflow: ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Expected: ₹2,89,631.64)`);
  console.log('================================================================');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
