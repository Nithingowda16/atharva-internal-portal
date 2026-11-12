const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compare() {
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

  const workbookPath = path.join(__dirname, '..', 'excel_sources', 'Upload data.xlsx');
  const wb = XLSX.readFile(workbookPath, { cellFormula: true, cellStyles: true, cellDates: true });
  const ws = wb.Sheets['Bank Balance'];

  // Map existing DB entries by rowIndex / section / particulars
  const dbEntriesByRow = {};
  account.entries.forEach(e => {
    if (e.rowIndex) {
      dbEntriesByRow[e.rowIndex] = e;
    }
  });

  console.log(`Existing DB entries count: ${account.entries.length}`);

  // Let's identify all rows in the Bank Balance worksheet that represent transactions/entries
  // In Bank Balance sheet:
  // Part 1: Rows 2 to 13 - Investment & Bank receipts / transfers
  // Part 2: Rows 19 to 50 - Company P/L and Net Expenses
  // Part 3: Rows 54 to 78 - Operational expenses, EMIs, Commissions, Adjustments
  
  const excelEntries = [
    // Section 1: Investment / Receipts / Capital (Cols A-E)
    { row: 2, date: '8/2/22', particulars: 'Opening Balance', amount: ws['D2']?.v, formula: ws['D2']?.f, comments: ws['E2']?.v, section: 'INVESTMENT_RECEIPT', category: 'OPENING_BALANCE' },
    { row: 3, date: '8/3/22', particulars: 'Investment', amount: ws['D3']?.v, formula: ws['D3']?.f, comments: ws['E3']?.v, section: 'INVESTMENT_RECEIPT', category: 'INVESTMENT' },
    { row: 4, date: '3/13/25', particulars: 'IT Return- 24-25', amount: ws['D4']?.v, formula: ws['D4']?.f, comments: ws['E4']?.v, section: 'INVESTMENT_RECEIPT', category: 'INVESTMENT' },
    { row: 5, date: '4/8/25', particulars: 'Investment', amount: ws['D5']?.v, formula: ws['D5']?.f, comments: ws['E5']?.v, section: 'INVESTMENT_RECEIPT', category: 'INVESTMENT' },
    { row: 6, date: '5/21/25', particulars: 'Investment', amount: ws['D6']?.v, formula: ws['D6']?.f, comments: ws['E6']?.v, section: 'INVESTMENT_RECEIPT', category: 'INVESTMENT' },
    { row: 7, date: '6/10/25', particulars: 'Investment-Loan From Harish M', amount: ws['D7']?.v, formula: ws['D7']?.f, comments: ws['E7']?.v, section: 'INVESTMENT_RECEIPT', category: 'INVESTMENT' },
    { row: 8, date: '10/18/25', particulars: 'Loan Taken Radha & Gok', amount: ws['D8']?.v, formula: ws['D8']?.f, comments: ws['E8']?.v, section: 'INVESTMENT_RECEIPT', category: 'INVESTMENT' },
    { row: 9, date: '10/28/26', particulars: 'Investment', amount: ws['D9']?.v, formula: ws['D9']?.f, comments: ws['E9']?.v, section: 'INVESTMENT_RECEIPT', category: 'INVESTMENT' },
    { row: 11, date: '9/24/26', particulars: 'DCO', amount: ws['D11']?.v, formula: ws['D11']?.f, comments: ws['E11']?.v, section: 'INVESTMENT_RECEIPT', category: 'INVESTMENT' },
    { row: 13, date: '26-06-26, 29-06-26, 2-7-26', particulars: 'Transfed to Boss', amount: ws['D13']?.v, formula: ws['D13']?.f, comments: ws['E13']?.v, section: 'INVESTMENT_RECEIPT', category: 'TRANSFER_OUT' },

    // Section 2: Company Profit / Loss & Operations (Rows 19-50)
    { row: 19, date: 'Consolidated', particulars: 'ATT (NT)', received: ws['C19']?.v, paid: ws['D19']?.v, amount: ws['D19']?.v, formula: ws['C19']?.f, section: 'COMPANY_PROFIT', category: 'ATT' },
    { row: 23, date: 'Consolidated', particulars: 'ORIX (PEREXEL)', received: ws['C23']?.v, paid: ws['D23']?.v ? Math.abs(ws['D23']?.v) : null, amount: ws['D23']?.v, formula: ws['C23']?.f, section: 'COMPANY_PROFIT', category: 'ORIX' },
    { row: 27, date: 'Consolidated', particulars: 'ANP (HCL)', received: ws['C27']?.v, paid: ws['D27']?.v, amount: ws['D27']?.v, formula: ws['C27']?.f, section: 'COMPANY_PROFIT', category: 'ANP' },
    { row: 31, date: 'Consolidated', particulars: 'EURO (AMZ)', received: ws['C31']?.v, paid: ws['D31']?.v ? Math.abs(ws['D31']?.v) : null, amount: ws['D31']?.v, formula: ws['C31']?.f, section: 'COMPANY_PROFIT', category: 'EURO' },
    { row: 34, date: 'Consolidated', particulars: 'ROUTE. M (VOIS)', received: ws['C34']?.v, paid: ws['D34']?.v, amount: ws['D34']?.v, formula: ws['C34']?.f, section: 'COMPANY_PROFIT', category: 'ROUTE_M' },
    { row: 38, date: 'Consolidated', particulars: 'ECO (WM/ORACLE)', received: ws['C38']?.v, paid: ws['D38']?.v ? Math.abs(ws['D38']?.v) : null, amount: ws['D38']?.v, formula: ws['C38']?.f, section: 'COMPANY_PROFIT', category: 'ECO' },
    { row: 42, date: 'Consolidated', particulars: 'RAYAN', received: ws['C42']?.v, paid: ws['D42']?.v, amount: ws['D42']?.v || ws['C42']?.v, formula: ws['C42']?.f, section: 'COMPANY_PROFIT', category: 'RAYAN' },
    { row: 46, date: 'Consolidated', particulars: 'FICTIV', received: ws['C46']?.v, paid: ws['D46']?.v, amount: ws['D46']?.v || ws['C46']?.v, formula: ws['C46']?.f, section: 'COMPANY_PROFIT', category: 'FICTIV' },
    { row: 50, date: 'Consolidated', particulars: 'EMINENT', received: ws['C50']?.v, paid: ws['D50']?.v, amount: ws['D50']?.v || ws['C50']?.v, formula: null, section: 'COMPANY_PROFIT', category: 'EMINENT' },

    // Section 3: Expenses, EMI, Deductions, Commissions (Rows 54-81)
    { row: 54, date: 'Consolidated', particulars: 'SST', amount: ws['D54']?.v, formula: ws['D54']?.f, section: 'SUPPORTING_EXPENSE', category: 'SST' },
    { row: 58, date: 'Consolidated', particulars: 'O2 Mobility', amount: ws['D58']?.v, formula: ws['D58']?.f, section: 'SUPPORTING_EXPENSE', category: 'O2' },
    { row: 62, date: 'Consolidated', particulars: 'Monthly Profit Sharing', amount: ws['D62']?.v, formula: ws['D62']?.f, section: 'PROFIT_DISTRIBUTION', category: 'MONTHLY' },
    { row: 65, date: 'Consolidated', particulars: 'NEW Cab EMI 1st Month', amount: ws['D65']?.v, formula: null, section: 'VEHICLE_EMI', category: 'EMI1' },
    { row: 66, date: 'Consolidated', particulars: 'NEW Cab EMI 2nd Month', amount: ws['D66']?.v, formula: null, section: 'VEHICLE_EMI', category: 'EMI2' },
    { row: 68, date: 'Consolidated', particulars: 'Fuel Commission', amount: ws['D68']?.v, formula: ws['D68']?.f, section: 'COMMISSION', category: 'FUEL_COMM', formulaString: `C68: =${ws['C68']?.f} (#REF!), D68: =${ws['D68']?.f}` },
    { row: 70, date: 'Consolidated', particulars: 'Account Difference Adjustment', amount: ws['D70']?.v, formula: ws['D70']?.f, section: 'ADJUSTMENT', category: 'DIFF' },
    { row: 72, date: 'Consolidated', particulars: 'GST & TDS', amount: ws['D72']?.v, formula: ws['D72']?.f, section: 'TAX_DEDUCTION', category: 'GST_TDS' },
    { row: 74, date: 'Consolidated', particulars: 'Harish GS - Fuel', amount: ws['D74']?.v, formula: ws['D74']?.f, section: 'FUEL_SETTLEMENT', category: 'HARISH_GS' },
    { row: 76, date: 'Consolidated', particulars: 'Pending Payment', amount: ws['D76']?.v, formula: ws['D76']?.f, section: 'PENDING_LIABILITY', category: 'PENDING_PAY' },
    { row: 78, date: 'Consolidated', particulars: 'Less Expense', amount: ws['D78']?.v, formula: ws['D78']?.f, section: 'EXPENSE_REVERSAL', category: 'LESS_EXP' },
    { row: 81, date: 'Consolidated', particulars: 'Net Operating Balance (Row 81)', amount: ws['D81']?.v, formula: ws['D81']?.f, section: 'SUMMARY_NET', category: 'NET_OPERATING' }
  ];

  console.log('\n=== DETAILED COMPARISON REPORT ===\n');

  let matchedCount = 0;
  let updatedCount = 0;
  let newCount = 0;
  const comparisonRows = [];

  for (const item of excelEntries) {
    const existing = dbEntriesByRow[item.row];
    let status = 'NEW';
    let diff = 0;
    let proposedAction = 'Insert';

    if (existing) {
      const existingAmt = existing.amount;
      const newAmt = item.amount !== undefined ? Number(item.amount) : 0;
      diff = Math.round((newAmt - existingAmt) * 100) / 100;

      if (Math.abs(diff) < 0.001) {
        status = 'MATCHED';
        proposedAction = 'Skip (No Change)';
        matchedCount++;
      } else {
        status = 'UPDATED';
        proposedAction = 'Update in Place';
        updatedCount++;
      }
    } else {
      newCount++;
      proposedAction = 'Insert New Record';
    }

    comparisonRows.push({
      row: item.row,
      existingId: existing ? existing.id : 'NEW_RECORD',
      date: item.date,
      particulars: item.particulars,
      existingAmount: existing ? existing.amount : null,
      updatedAmount: item.amount,
      difference: diff,
      status,
      proposedAction,
      formula: item.formula || existing?.formulaString || '—',
      section: item.section,
      category: item.category,
    });
  }

  console.log(`Total Source Transactions checked: ${excelEntries.length}`);
  console.log(`Matched: ${matchedCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`New: ${newCount}`);

  console.log('\n--- Rows with Differences or New: ---');
  comparisonRows.forEach(cr => {
    if (cr.status !== 'MATCHED') {
      console.log(`Row ${cr.row} [${cr.particulars}]: Existing = ${cr.existingAmount}, Updated = ${cr.updatedAmount}, Diff = ${cr.difference}, Status = ${cr.status}, Action = ${cr.proposedAction}`);
    }
  });

  console.log('\n--- Checking Row 8 & 9 & 10 in detail ---');
  console.log('Row 8 in DB:', dbEntriesByRow[8]);
  console.log('Row 9 in DB:', dbEntriesByRow[9]);
  console.log('Row 10 in DB:', dbEntriesByRow[10]);
  console.log('Row 11 in DB:', dbEntriesByRow[11]);
}

compare().catch(console.error).finally(() => prisma.$disconnect());

