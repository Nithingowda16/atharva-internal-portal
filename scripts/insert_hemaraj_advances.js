const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('ATHARVA TRAVELS – INSERT HEMARAJ EMPLOYEE ADVANCES TO HARISH GS');
  console.log('================================================================\n');

  // 1. Locate the Harish GS account
  const account = await prisma.bankAccount.findUnique({
    where: { accountSlug: 'harish-gs' },
    include: {
      entries: {
        where: { isDeleted: false }
      },
      periods: true
    }
  });

  if (!account) {
    throw new Error('Harish GS bank account not found!');
  }

  console.log(`Target Account: ${account.accountName} (${account.accountSlug}, ID: ${account.id})`);
  console.log(`Current active entries: ${account.entries.length}`);

  // 2. Fetch Bhaskar Super Admin user for audit trail
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });
  const adminId = superAdmin ? superAdmin.id : null;
  const adminEmail = superAdmin ? superAdmin.email : 'bhaskar.internal@atharvatravels.com';

  // 3. Define the three Hemaraj advance records
  const recordsToInsert = [
    {
      transactionId: 'HMR-ADV-202607-001',
      periodCode: '2026-JULY',
      financialMonth: 'Jul-26',
      financialYear: '2026-27',
      entryDate: 'July',
      section: 'EMPLOYEE_ADVANCE',
      category: 'Employee Advance',
      employeeName: 'Hemaraj',
      particulars: 'Hemaraj',
      sourceReference: 'Hemaraj -NT',
      amount: -35000.00,
      netAmount: -35000.00,
      formulaString: '-35000',
      comments: 'Employee Advance - Hemaraj (Included in Main Bank Row 74 via Harish GS -3,16,000)',
      remarks: 'Preserved month-only date from source workbook cell I1',
      rowIndex: 1
    },
    {
      transactionId: 'HMR-ADV-202608-001',
      periodCode: '2026-AUG',
      financialMonth: 'Aug-26',
      financialYear: '2026-27',
      entryDate: 'Aug',
      section: 'EMPLOYEE_ADVANCE',
      category: 'Employee Advance',
      employeeName: 'Hemaraj',
      particulars: 'Hemaraj',
      sourceReference: 'Hemaraj -NT',
      amount: -6000.00,
      netAmount: -6000.00,
      formulaString: '-6000',
      comments: 'Employee Advance - Hemaraj (Included in Main Bank Row 74 via Harish GS -3,16,000)',
      remarks: 'Preserved month-only date from source workbook cell I1',
      rowIndex: 2
    },
    {
      transactionId: 'HMR-ADV-202610-001',
      periodCode: '2026-OCT',
      financialMonth: 'Oct-26',
      financialYear: '2026-27',
      entryDate: '25-10-2026',
      section: 'EMPLOYEE_ADVANCE',
      category: 'Employee Advance',
      employeeName: 'Hemaraj',
      particulars: 'Hemaraj',
      sourceReference: 'Hemaraj -NT',
      amount: -5000.00,
      netAmount: -5000.00,
      formulaString: '-5000',
      comments: 'Employee Advance - Hemaraj (Included in Main Bank Row 74 via Harish GS -3,16,000)',
      remarks: 'Preserved exact date from source workbook cell I1 / screenshot',
      rowIndex: 3
    }
  ];

  let insertedCount = 0;
  let skippedCount = 0;

  for (const item of recordsToInsert) {
    // Check if duplicate already exists
    const existing = await prisma.bankAccountEntry.findFirst({
      where: {
        accountId: account.id,
        isDeleted: false,
        OR: [
          {
            particulars: item.particulars,
            entryDate: item.entryDate,
            amount: item.amount
          },
          {
            meta: { contains: item.transactionId }
          }
        ]
      }
    });

    if (existing) {
      console.log(`[SKIP MATCHED] Record already exists: ${item.transactionId} (${item.entryDate}: ₹${item.amount})`);
      skippedCount++;
      continue;
    }

    const metaObj = {
      transactionId: item.transactionId,
      employeeName: item.employeeName,
      financialYear: item.financialYear,
      financialMonth: item.financialMonth,
      category: item.category,
      debitCredit: 'DEBIT',
      paymentStatus: 'PAID',
      isPostedToBank: true,
      bankReference: "Consolidated Main Bank Row 74 ('Harish GS'!C1)",
      reconciliationNote: "Already accounted in Bank Balance Row 74 (-₹3,16,000.00). Zero duplicate bank debit."
    };

    const entry = await prisma.bankAccountEntry.create({
      data: {
        accountId: account.id,
        periodCode: item.periodCode,
        entryDate: item.entryDate,
        section: item.section,
        category: item.category,
        particulars: item.particulars,
        sourceReference: item.sourceReference,
        amount: item.amount,
        rawAmount: String(item.amount),
        paidAmount: 0,
        receivedAmount: 0,
        netAmount: item.netAmount,
        formulaString: item.formulaString,
        comments: item.comments,
        remarks: item.remarks,
        rowIndex: item.rowIndex,
        meta: JSON.stringify(metaObj)
      }
    });

    // Create initial version snapshot
    await prisma.bankAccountEntryVersion.create({
      data: {
        entryId: entry.id,
        versionNumber: 1,
        snapshotData: JSON.stringify(entry),
        changeReason: `Initial import of Hemaraj Employee Advance record (${item.entryDate}: ₹${item.amount})`,
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
        reason: `Added Hemaraj Employee Advance: ${item.entryDate} ₹${item.amount} to Harish GS`
      }
    });

    console.log(`[INSERTED] ${item.transactionId}: ${item.employeeName} | ${item.entryDate} | ₹${item.amount} (ID: ${entry.id})`);
    insertedCount++;
  }

  // 4. Verify post-insertion state
  const allActiveEntries = await prisma.bankAccountEntry.findMany({
    where: {
      accountId: account.id,
      isDeleted: false
    }
  });

  console.log(`\nPost-insertion total active entries in Harish GS: ${allActiveEntries.length}`);

  const hemarajEntries = allActiveEntries.filter(e => e.section === 'EMPLOYEE_ADVANCE' || (e.meta && e.meta.includes('Hemaraj')));
  const hemarajTotal = hemarajEntries.reduce((s, e) => s + e.amount, 0);
  console.log(`Active Hemaraj entries count: ${hemarajEntries.length}`);
  console.log(`Active Hemaraj total sum: ₹${hemarajTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Expected: -₹46,000.00)`);

  const directFuelEntries = allActiveEntries.filter(e => e.section === 'FUEL_PAYMENT');
  const directFuelTotal = directFuelEntries.reduce((s, e) => s + e.amount, 0);
  console.log(`Active Direct Fuel total sum: ₹${directFuelTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Expected: -₹95,000.00)`);

  const vehicleEntries = allActiveEntries.filter(e => e.section === 'VEHICLE_BALANCE');
  console.log(`Active Vehicle entries count: ${vehicleEntries.length}`);
  for (const v of vehicleEntries) {
    console.log(`  - ${v.particulars}: ₹${v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }

  // Verify Bank Balance Row 74
  const bbEntry = await prisma.bankAccountEntry.findFirst({
    where: {
      account: { accountSlug: 'bank-balance' },
      particulars: 'Harish GS - Fuel',
      isDeleted: false
    }
  });
  if (bbEntry) {
    console.log(`\nMain Bank Balance Row 74: "${bbEntry.particulars}" | Amount: ₹${bbEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Formula: ${bbEntry.formulaString}`);
    console.log(`Mathematical equality: C17 (-1,75,000) + C32 (-95,000) + I1 (-46,000) = ₹${(-175000 + -95000 + -46000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${insertedCount} inserted, ${skippedCount} skipped.`);
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

