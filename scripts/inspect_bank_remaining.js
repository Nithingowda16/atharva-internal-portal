const XLSX = require('xlsx');
const ws = XLSX.readFile('excel_sources/Bank And Balance Details-2025.xlsx', { cellFormula: true }).Sheets['Bank Balance'];

console.log('--- Bank Balance Rows 82 to 175 ---');
let foundAny = false;
for (let r = 81; r <= 175; r++) {
  const row = [];
  for (let c = 0; c < 16; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (cell && (cell.v !== undefined || cell.f !== undefined)) {
      row.push(`${addr}: ${cell.f ? '=' + cell.f : ''} [${cell.v}]`);
    }
  }
  if (row.length) {
    foundAny = true;
    console.log(`Row ${r + 1}: ${row.join(' | ')}`);
  }
}
if (!foundAny) {
  console.log('No cells found beyond row 81.');
}

