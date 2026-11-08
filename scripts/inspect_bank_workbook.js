const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('excel_sources/Bank And Balance Details-2025.xlsx', {
  cellFormula: true,
  cellNF: true,
  cellDates: true,
});

const TARGET_12_SHEETS = [
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

console.log('--- INSPECTING 12 TARGET WORKSHEETS ---');

const summary = {};

for (const name of TARGET_12_SHEETS) {
  const ws = wb.Sheets[name];
  if (!ws) {
    console.error(`Sheet "${name}" NOT FOUND in workbook!`);
    continue;
  }
  const ref = ws['!ref'] || 'A1:A1';
  const range = XLSX.utils.decode_range(ref);
  let cellCount = 0;
  let formulaCount = 0;
  const formulas = [];
  const crossRefs = [];

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (cell && (cell.v !== undefined || cell.f !== undefined)) {
        cellCount++;
        if (cell.f) {
          formulaCount++;
          formulas.push({ addr: cellAddress, f: cell.f, v: cell.v });
          // Check for cross-sheet references (contains ! or sheet names)
          for (const other of wb.SheetNames) {
            if (cell.f.includes(other) || cell.f.includes(`'${other}'`)) {
              crossRefs.push({ from: name, cell: cellAddress, to: other, formula: cell.f });
            }
          }
        }
      }
    }
  }

  summary[name] = {
    ref,
    rows: range.e.r - range.s.r + 1,
    cols: range.e.c - range.s.c + 1,
    cellCount,
    formulaCount,
    crossRefsCount: crossRefs.length,
    sampleFormulas: formulas.slice(0, 10),
    crossRefs: crossRefs,
  };

  console.log(`\nSheet: "${name}" | Ref: ${ref} | Cells: ${cellCount} | Formulas: ${formulaCount} | Cross-Refs: ${crossRefs.length}`);
}

fs.writeFileSync('scripts/bank_inspection_summary.json', JSON.stringify(summary, null, 2), 'utf8');
console.log('\nSaved full inspection to scripts/bank_inspection_summary.json');

