const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/supporting_sheets_data.json', 'utf8'));

for (const [name, info] of Object.entries(data)) {
  console.log(`\n======================================================`);
  console.log(`SHEET: "${name}" (Ref: ${info.ref}, Populated Rows: ${info.totalRows})`);
  console.log(`======================================================`);
  
  // Print first 10 rows
  for (let i = 0; i < Math.min(info.rows.length, 12); i++) {
    const r = info.rows[i];
    const text = r.cells.map(c => `${c.addr}: ${c.formula ? '=' + c.formula : ''} [${c.val}]`).join(' | ');
    console.log(`Row ${r.rowIdx}: ${text}`);
  }
  if (info.rows.length > 12) {
    console.log(`... and ${info.rows.length - 12} more rows`);
    // Print last 3 rows
    for (let i = info.rows.length - 3; i < info.rows.length; i++) {
      const r = info.rows[i];
      const text = r.cells.map(c => `${c.addr}: ${c.formula ? '=' + c.formula : ''} [${c.val}]`).join(' | ');
      console.log(`Row ${r.rowIdx}: ${text}`);
    }
  }
}

