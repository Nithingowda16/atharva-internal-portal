const XLSX = require('xlsx');

const wb = XLSX.readFile('excel_sources/Bank And Balance Details-2025.xlsx', {
  cellFormula: true,
  cellNF: true,
});

const ws = wb.Sheets['Bank Balance'];
const ref = ws['!ref'];
const range = XLSX.utils.decode_range(ref);

console.log('=== BANK BALANCE CELLS WITH VALUES AND FORMULAS ===\n');

for (let R = range.s.r; R <= Math.min(range.e.r, 80); ++R) {
  const rowCells = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = ws[addr];
    if (cell && (cell.v !== undefined || cell.f !== undefined)) {
      rowCells.push(`${addr}: ${cell.f ? '=' + cell.f : ''} [v: ${cell.v}]`);
    }
  }
  if (rowCells.length > 0) {
    console.log(`Row ${R + 1}: ${rowCells.join(' | ')}`);
  }
}

