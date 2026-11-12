const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateReport() {
  const account = await prisma.bankAccount.findFirst({
    where: { accountSlug: 'bank-balance' },
    include: {
      entries: {
        where: { isDeleted: false },
        orderBy: [{ rowIndex: 'asc' }, { createdAt: 'asc' }],
      },
      periods: true,
    },
  });

  const workbookPath = path.join(__dirname, '..', 'excel_sources', 'Upload data.xlsx');
  const wb = XLSX.readFile(workbookPath, { cellFormula: true, cellStyles: true, cellDates: true });
  const ws = wb.Sheets['Bank Balance'];

  const dbEntriesMap = new Map();
  account.entries.forEach(e => {
    dbEntriesMap.set(e.rowIndex, e);
  });

  // Complete list of entries in the Bank Balance worksheet
  const excelTransactions = [
    { row: 2, date: '02-08-2022', desc: 'Opening Balance', cell: 'D2', amount: ws['D2']?.v, formula: ws['D2']?.f, type: 'Credit (Opening)', section: 'INVESTMENT_RECEIPT' },
    { row: 3, date: '03-08-2022', desc: 'Investment', cell: 'D3', amount: ws['D3']?.v, formula: ws['D3']?.f, type: 'Credit (Investment)', section: 'INVESTMENT_RECEIPT' },
    { row: 4, date: '13-03-2025', desc: 'IT Return - 24-25', cell: 'D4', amount: ws['D4']?.v, formula: ws['D4']?.f, type: 'Credit (Tax Refund)', section: 'INVESTMENT_RECEIPT' },
    { row: 5, date: '08-04-2025', desc: 'Investment', cell: 'D5', amount: ws['D5']?.v, formula: ws['D5']?.f, type: 'Credit (Investment)', section: 'INVESTMENT_RECEIPT' },
    { row: 6, date: '21-05-2025', desc: 'Investment', cell: 'D6', amount: ws['D6']?.v, formula: ws['D6']?.f, type: 'Credit (Investment)', section: 'INVESTMENT_RECEIPT' },
    { row: 7, date: '10-06-2025', desc: 'Investment-Loan From Harish M', cell: 'D7', amount: ws['D7']?.v, formula: ws['D7']?.f, type: 'Credit (Partner Loan)', section: 'INVESTMENT_RECEIPT' },
    { row: 8, date: '18-10-2025', desc: 'Loan Taken Radha & Gok (Merged Bhaskar Own)', cell: 'D8', amount: ws['D8']?.v, formula: ws['D8']?.f, type: 'Credit (Loan/Invest)', section: 'INVESTMENT_RECEIPT' },
    { row: 9, date: '28-10-2026', desc: 'Investment (Formalized from Temp Row 10)', cell: 'D9', amount: ws['D9']?.v, formula: ws['D9']?.f, type: 'Credit (Investment)', section: 'INVESTMENT_RECEIPT' },
    { row: 10, date: 'Temp', desc: 'Investment (Row 10 Blank in new Excel)', cell: 'D10', amount: null, formula: null, type: 'Credit (Obsolete Temp)', section: 'INVESTMENT_RECEIPT' },
    { row: 11, date: '24-09-2026', desc: 'DCO', cell: 'D11', amount: ws['D11']?.v, formula: ws['D11']?.f, type: 'Debit (Transfer/Expense)', section: 'INVESTMENT_RECEIPT' },
    { row: 13, date: '26-06-26, 29-06-26, 2-7-26', desc: 'Transfed to Boss', cell: 'D13', amount: ws['D13']?.v, formula: ws['D13']?.f, type: 'Debit (Transfer Out)', section: 'INVESTMENT_RECEIPT' },
    { row: 19, date: 'Consolidated', desc: 'ATT (NT)', cell: 'D19', amount: ws['D19']?.v, formula: ws['C19']?.f, type: 'Operating Ledger (P/L)', section: 'COMPANY_PROFIT', pLAmount: ws['C19']?.v },
    { row: 23, date: 'Consolidated', desc: 'ORIX (PEREXEL)', cell: 'D23', amount: ws['D23']?.v, formula: ws['C23']?.f, type: 'Operating Ledger (P/L)', section: 'COMPANY_PROFIT', pLAmount: ws['C23']?.v },
    { row: 27, date: 'Consolidated', desc: 'ANP (HCL)', cell: 'D27', amount: ws['D27']?.v, formula: ws['C27']?.f, type: 'Operating Ledger (P/L)', section: 'COMPANY_PROFIT', pLAmount: ws['C27']?.v },
    { row: 31, date: 'Consolidated', desc: 'EURO (AMZ)', cell: 'D31', amount: ws['D31']?.v, formula: ws['C31']?.f, type: 'Debit (Expense Allocation)', section: 'COMPANY_PROFIT', pLAmount: ws['C31']?.v },
    { row: 34, date: 'Consolidated', desc: 'ROUTE. M (VOIS)', cell: 'D34', amount: ws['D34']?.v, formula: ws['C34']?.f, type: 'Operating Ledger (P/L)', section: 'COMPANY_PROFIT', pLAmount: ws['C34']?.v },
    { row: 38, date: 'Consolidated', desc: 'ECO (WM/ORACLE)', cell: 'D38', amount: ws['D38']?.v, formula: ws['C38']?.f, type: 'Debit (Expense Allocation)', section: 'COMPANY_PROFIT', pLAmount: ws['C38']?.v },
    { row: 42, date: 'Consolidated', desc: 'RAYAN', cell: 'D42', amount: ws['D42']?.v || 0, formula: ws['C42']?.f, type: 'Operating Ledger (P/L)', section: 'COMPANY_PROFIT', pLAmount: ws['C42']?.v },
    { row: 46, date: 'Consolidated', desc: 'FICTIV', cell: 'D46', amount: ws['D46']?.v || 0, formula: ws['C46']?.f, type: 'Operating Ledger (P/L)', section: 'COMPANY_PROFIT', pLAmount: ws['C46']?.v },
    { row: 50, date: 'Consolidated', desc: 'EMINENT', cell: 'D50', amount: ws['D50']?.v || 0, formula: null, type: 'Operating Ledger (P/L)', section: 'COMPANY_PROFIT', pLAmount: ws['C50']?.v },
    { row: 54, date: 'Consolidated', desc: 'SST', cell: 'D54', amount: ws['D54']?.v, formula: ws['D54']?.f, type: 'Debit (Expense)', section: 'SUPPORTING_EXPENSE' },
    { row: 58, date: 'Consolidated', desc: 'O2 Mobility', cell: 'D58', amount: ws['D58']?.v, formula: ws['D58']?.f, type: 'Debit (Expense)', section: 'SUPPORTING_EXPENSE' },
    { row: 62, date: 'Consolidated', desc: 'Monthly Profit Sharing', cell: 'D62', amount: ws['D62']?.v, formula: ws['D62']?.f, type: 'Debit (Profit Distribution)', section: 'PROFIT_DISTRIBUTION' },
    { row: 65, date: 'Consolidated', desc: 'NEW Cab EMI 1st Month', cell: 'D65', amount: ws['D65']?.v, formula: null, type: 'Debit (Vehicle EMI)', section: 'VEHICLE_EMI' },
    { row: 66, date: 'Consolidated', desc: 'NEW Cab EMI 2nd Month', cell: 'D66', amount: ws['D66']?.v, formula: null, type: 'Debit (Vehicle EMI)', section: 'VEHICLE_EMI' },
    { row: 68, date: 'Consolidated', desc: 'Fuel Commission', cell: 'D68', amount: ws['D68']?.v, formula: `C68: =${ws['C68']?.f} (#REF!), D68: =${ws['D68']?.f}`, type: 'Credit (Commission)', section: 'COMMISSION' },
    { row: 70, date: 'Consolidated', desc: 'Account Difference Adjustment', cell: 'D70', amount: ws['D70']?.v, formula: ws['D70']?.f, type: 'Adjustment (Reconciliation)', section: 'ADJUSTMENT' },
    { row: 72, date: 'Consolidated', desc: 'GST & TDS', cell: 'D72', amount: ws['D72']?.v, formula: ws['D72']?.f, type: 'Debit / Tax Liability', section: 'TAX_DEDUCTION' },
    { row: 74, date: 'Consolidated', desc: 'Harish GS - Fuel', cell: 'D74', amount: ws['D74']?.v, formula: ws['D74']?.f, type: 'Debit (Advance Settlement)', section: 'FUEL_SETTLEMENT' },
    { row: 76, date: 'Consolidated', desc: 'Pending Payment', cell: 'D76', amount: ws['D76']?.v, formula: ws['D76']?.f, type: 'Liability / Accrual', section: 'PENDING_LIABILITY' },
    { row: 78, date: 'Consolidated', desc: 'Less Expense', cell: 'D78', amount: ws['D78']?.v, formula: ws['D78']?.f, type: 'Expense Reversal', section: 'EXPENSE_REVERSAL' },
    { row: 81, date: 'Consolidated', desc: 'Net Operating Balance (Row 81)', cell: 'D81', amount: ws['D81']?.v, formula: ws['D81']?.f, type: 'Summary / Calculated Net', section: 'SUMMARY_NET' }
  ];

  console.log(JSON.stringify(excelTransactions, null, 2));
}

generateReport().catch(console.error).finally(() => prisma.$disconnect());

