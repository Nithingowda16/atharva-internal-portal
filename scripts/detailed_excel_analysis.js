const XLSX = require('xlsx');
const path = require('path');

const workbookPath = path.join(__dirname, '..', 'excel_sources', 'Upload data.xlsx');
const wb = XLSX.readFile(workbookPath, { cellFormula: true, cellStyles: true, cellDates: true });
const ws = wb.Sheets['Bank Balance'];

// Let's inspect all non-empty rows and cells in Bank Balance
console.log('=== DETAILED CELL EXTRACTION: Bank Balance ===\n');

for (let r = 1; r <= 85; r++) {
  const rowCells = [];
  for (let c = 0; c < 20; c++) {
    const colLetter = XLSX.utils.encode_col(c);
    const cellAddr = `${colLetter}${r}`;
    const cell = ws[cellAddr];
    if (cell && (cell.v !== undefined || cell.f !== undefined)) {
      rowCells.push({
        addr: cellAddr,
        col: colLetter,
        val: cell.v,
        formatted: cell.w,
        formula: cell.f,
        type: cell.t,
      });
    }
  }
  if (rowCells.length > 0) {
    console.log(`--- ROW ${r} ---`);
    rowCells.forEach(rc => {
      let str = `  [${rc.addr}] = ${JSON.stringify(rc.val)}`;
      if (rc.formula) str += ` (Formula: =${rc.formula})`;
      if (rc.formatted) str += ` (Formatted: "${rc.formatted}")`;
      console.log(str);
    });
  }
}

