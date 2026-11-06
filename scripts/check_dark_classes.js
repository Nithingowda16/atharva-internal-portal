const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx')) {
      results.push(fullPath.replace(/\\/g, '/'));
    }
  }
  return results;
}

const suspiciousPatterns = [
  /bg-slate-900/,
  /bg-slate-950/,
  /bg-zinc-900/,
  /bg-emerald-950/,
  /bg-gray-900/,
  /dark:/
];

const files = walk('src');
const flagged = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  for (const pat of suspiciousPatterns) {
    if (pat.test(content)) {
      flagged.push({ file: f, pattern: pat.toString() });
    }
  }
}

console.log(JSON.stringify(flagged, null, 2));

