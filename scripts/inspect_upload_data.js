const XLSX = require('xlsx');
const path = require('path');

const workbookPath = path.join(__dirname, '..', 'excel_sources', 'Upload data.xlsx');
const wb = XLSX.readFile(workbookPath, { cellFormula: true, cellStyles: true, cellDates: true });

console.log('Sheet names in Upload data.xlsx:');
console.log(wb.SheetNames);

const sheetName = 'Bank Balance';
if (!wb.SheetNames.includes(sheetName)) {
  console.error(`Sheet "${sheetName}" not found!`);
  process.exit(1);
}

const ws = wb.Sheets[sheetName];
console.log(`\nRange for "${sheetName}":`, ws['!ref']);

// Dump all non-empty cells
const cells = [];
for (const cellAddress in ws) {
  if (cellAddress.startsWith('!')) continue;
  const cell = ws[cellAddress];
  cells.push({
    address: cellAddress,
    value: cell.v,
    formula: cell.f,
    type: cell.t,
    formatted: cell.w,
  });
}

console.log(`Total non-empty cells in "${sheetName}": ${cells.length}`);

// Dump cell values formatted
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
console.log(`\nTotal rows: ${rows.length}`);
console.log('\n--- First 40 rows ---');
rows.slice(0, 40).forEach((row, idx) => {
  if (row && row.some(c => c !== undefined && c !== '')) {
    console.log(`Row ${idx + 1}:`, JSON.stringify(row));
  }
});

console.log('\n--- Rows 41 to 70 ---');
rows.slice(40, 70).forEach((row, idx) => {
  if (row && row.some(c => c !== undefined && c !== '')) {
    console.log(`Row ${idx + 41}:`, JSON.stringify(row));
  }
});

