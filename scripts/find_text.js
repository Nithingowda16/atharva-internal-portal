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
    } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.md')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('Apple-Inspired') || c.includes('Minimal Financial Intelligence') || c.includes('Apple-inspired')) {
        res.push(p);
      }
    }
  }
  return res;
}

console.log(JSON.stringify(walk('.'), null, 2));

