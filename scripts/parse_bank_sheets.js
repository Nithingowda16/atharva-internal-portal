const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('excel_sources/Bank And Balance Details-2025.xlsx', {
  cellFormula: true,
  cellNF: true,
  cellDates: true,
});

const SHEETS = [
  'Bank Balance',
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

console.log('--- DETAILED PARSING OF 12 TARGET WORKSHEETS ---');

const parsed = {};

for (const name of SHEETS) {
  const ws = wb.Sheets[name];
  const ref = ws['!ref'];
  const range = XLSX.utils.decode_range(ref);
  const rows = [];

  for (let R = range.s.r; R <= range.e.r; ++R) {
    const rowObj = { rowIndex: R + 1, cells: {} };
    let hasData = false;
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && (cell.v !== undefined || cell.f !== undefined)) {
        hasData = true;
        rowObj.cells[addr] = {
          colIndex: C,
          val: cell.v,
          formatted: cell.w,
          formula: cell.f || null,
          type: cell.t
        };
      }
    }
    if (hasData) {
      rows.push(rowObj);
    }
  }

  parsed[name] = {
    ref,
    totalPopulatedRows: rows.length,
    rows
  };
}

fs.writeFileSync('scripts/parsed_bank_data.json', JSON.stringify(parsed, null, 2), 'utf8');
console.log('Saved detailed parsed data to scripts/parsed_bank_data.json');

