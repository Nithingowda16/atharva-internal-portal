const XLSX = require('xlsx');
const path = require('path');

const workbookPath = path.join(__dirname, '..', 'excel_sources', 'Upload data.xlsx');
const wb = XLSX.readFile(workbookPath, { cellFormula: true, cellStyles: true, cellDates: true });
const ws = wb.Sheets['Bank Balance'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

console.log('--- Rows 71 to 175 ---');
rows.slice(70, 175).forEach((row, idx) => {
  if (row && row.some(c => c !== undefined && c !== '')) {
    console.log(`Row ${idx + 71}:`, JSON.stringify(row));
  }
});

