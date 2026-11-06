const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        res.push(...walk(p));
      }
    } else if (f.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      const lines = c.split('\n');
      lines.forEach((line, idx) => {
        if (/Apple/i.test(line) && !line.includes('shadow-apple') && !line.includes('-apple-system') && !line.includes('//') && !line.includes('/*')) {
          res.push({ file: p, line: idx + 1, content: line.trim() });
        }
        if (/Minimal Financial/i.test(line)) {
          res.push({ file: p, line: idx + 1, content: line.trim() });
        }
      });
    }
  }
  return res;
}

console.log(JSON.stringify(walk('src'), null, 2));

