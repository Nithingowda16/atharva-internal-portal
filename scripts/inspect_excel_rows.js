const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'excel_sources', 'Upload data.xlsx'), { cellFormula: true, cellStyles: true });
const ws = wb.Sheets['Bank Balance'];

const rowsToCheck = [2,3,4,5,6,7,8,9,10,11,13,19,23,27,31,34,38,42,46,50,54,58,62,65,66,68,70,72,74,76,78,81];

for (const r of rowsToCheck) {
  const aCell = ws['A' + r];
  const bCell = ws['B' + r];
  const cCell = ws['C' + r];
  const dCell = ws['D' + r];
  const eCell = ws['E' + r];
  const kCell = ws['K' + r];
  const lCell = ws['L' + r];
  const mCell = ws['M' + r];
  console.log('Row ' + r.toString().padStart(2) + ': ' +
    'A=' + (aCell ? aCell.v : '—') + ' | ' +
    'B=' + (bCell ? bCell.v : '—') + ' | ' +
    'C=' + (cCell ? cCell.v + (cCell.f ? ' [=' + cCell.f + ']' : '') : 'empty') + ' | ' +
    'D=' + (dCell ? dCell.v + (dCell.f ? ' [=' + dCell.f + ']' : '') : 'empty') + ' | ' +
    'E=' + (eCell ? eCell.v : 'empty') + ' | ' +
    (kCell ? 'K=' + kCell.v + ' | ' : '') +
    (lCell ? 'L=' + lCell.v + ' | ' : '') +
    (mCell ? 'M=' + mCell.v : '')
  );
}

