const http = require('http');

function checkUrl(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:3000' + path, (res) => {
      resolve({ path, statusCode: res.statusCode, contentType: res.headers['content-type'] });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function main() {
  const endpoints = ['/login', '/logo.png', '/dashboard', '/vehicles', '/companies', '/billing', '/adjustments', '/payments', '/reports', '/raw-cells', '/audit', '/recycle-bin', '/users'];
  for (const ep of endpoints) {
    const res = await checkUrl(ep);
    console.log(`${ep.padEnd(16)} -> Status: ${res.statusCode} (${res.contentType || 'unknown'})`);
  }
}

main();

