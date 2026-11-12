const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'excel_sources', 'Upload data.xlsx'), { cellFormula: true, cellStyles: true });
const ws = wb.Sheets['Bank Balance'];

for (let r = 1; r <= 85; r++) {
  const rowVals = [];
  for (const c of ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P']) {
    const cell = ws[c + r];
    if (cell && (cell.v !== undefined || cell.f)) {
      rowVals.push(`${c}${r}: ${JSON.stringify(cell.v)}${cell.f ? ' [=' + cell.f + ']' : ''}`);
    }
  }
  if (rowVals.length > 0) {
    console.log(`Row ${r.toString().padStart(2, ' ')} -> ${rowVals.join(' | ')}`);
  }
}

