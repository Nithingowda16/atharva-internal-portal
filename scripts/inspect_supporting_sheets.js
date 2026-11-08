const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('excel_sources/Bank And Balance Details-2025.xlsx', {
  cellFormula: true,
  cellNF: true,
  cellDates: true,
});

const SUPPORTING_SHEETS = [
  'DCO',
  'Profit Sharing',
  'Pending Payment',
  'Harish GS',
  'Expense',
  'SST',
  'ECO Travels',
  'EURO-Amz',
  'O2',
  'ORIX -Parexel',
  'ANP-HCL'
];

const results = {};

for (const sheetName of SUPPORTING_SHEETS) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`Sheet not found: ${sheetName}`);
    continue;
  }
  const ref = ws['!ref'] || 'A1:A1';
  const range = XLSX.utils.decode_range(ref);
  const rows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    let hasVal = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell && (cell.v !== undefined || cell.f !== undefined)) {
        hasVal = true;
        row.push({
          col: c,
          addr,
          val: cell.w !== undefined ? cell.w : cell.v,
          raw: cell.v,
          formula: cell.f || null,
          type: cell.t,
        });
      }
    }
    if (hasVal) {
      rows.push({ rowIdx: r + 1, cells: row });
    }
  }
  results[sheetName] = {
    ref,
    totalRows: rows.length,
    rows: rows
  };
}

fs.writeFileSync('scripts/supporting_sheets_data.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Saved supporting sheets data to scripts/supporting_sheets_data.json');

