const XLSX = require('xlsx');

const wb = XLSX.readFile('excel_sources/Bank And Balance Details-2025.xlsx', { cellFormula: true });
const ws = wb.Sheets['Bank Balance'];

function val(cell) {
  const c = ws[cell];
  return c ? Number(c.v) || 0 : 0;
}

console.log('=== BANK BALANCE CORE METRICS VERIFICATION ===');
console.log('Total Invest (L1):', val('L1'), 'Formula: SUM(D2:D13)');
console.log('Total Investment (E17):', val('E17'), 'Formula: E15+E23+D68');
console.log('Yet to Receive (M13):', val('M13'), 'Formula: SUM(M2:M11)');
console.log('Book Account Balance (H1):', val('H1'), 'Formula: D81+E23');
console.log('Balance (M17):', val('M17'), 'Formula: M13+M15');
console.log('Difference (M20):', val('M20'), 'Formula: M17-E15');
console.log('Total Diff (M34):', val('M34'), 'Formula: SUM(M22:M33)');
console.log('Account Difference (M40):', val('M40'), 'Formula: SUM(M34:M38)');
console.log('CHECK (M43):', val('M43'), 'Formula: M40-M20 (Should be 0)');
console.log('NET (D81):', val('D81'), 'Formula: SUM(D2:D80)');

