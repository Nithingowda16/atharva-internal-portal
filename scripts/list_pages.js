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

const files = walk('src');
console.log(JSON.stringify(files, null, 2));

