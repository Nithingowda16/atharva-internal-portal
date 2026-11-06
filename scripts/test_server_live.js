const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  console.log('Starting Next.js production server for validation probe...');
  const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', '3000'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
  });

  server.stdout.on('data', d => console.log('[Next.js]', d.toString().trim()));
  server.stderr.on('data', d => console.error('[Next.js Error]', d.toString().trim()));

  // Wait for server to be responsive
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch('http://127.0.0.1:3000/login');
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch (e) {
      // console.log('Waiting for server...', e.message);
    }
  }

  if (!ready) {
    console.error('Server failed to respond within 30 seconds.');
    server.kill();
    process.exit(1);
  }

  console.log('✔ Server is listening and responding on http://127.0.0.1:3000');

  // 1. Probe /login
  const loginPage = await fetch('http://127.0.0.1:3000/login');
  console.log(`✔ GET /login -> Status ${loginPage.status} (Length: ${loginPage.body.length})`);

  // 2. Probe /logo.png
  const logo = await fetch('http://127.0.0.1:3000/logo.png');
  console.log(`✔ GET /logo.png -> Status ${logo.status} (Content-Type: ${logo.headers['content-type']})`);

  // 3. Test Staff Login API
  const loginPayload = JSON.stringify({
    email: 'harish.internal@atharvatravels.com',
    password: 'atharvatravels@internal'
  });

  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload)
    },
    body: loginPayload
  });

  console.log(`✔ POST /api/auth/login (Harish - Super Admin) -> Status ${loginRes.status}`);
  const authCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : null;
  console.log(`✔ Session cookie received: ${Boolean(authCookie)}`);

  // 4. Test Authenticated Dashboard API
  const dashboardRes = await fetch('http://127.0.0.1:3000/api/dashboard?period=2026-09', {
    headers: {
      'Cookie': authCookie ? authCookie.split(';')[0] : ''
    }
  });
  console.log(`✔ GET /api/dashboard (Authenticated) -> Status ${dashboardRes.status}`);

  if (dashboardRes.status === 200) {
    const data = JSON.parse(dashboardRes.body);
    console.log(`  KPI Gross Billing: ₹${data.grossBilling?.toLocaleString('en-IN')}`);
    console.log(`  KPI Net Payable:   ₹${data.netPayable?.toLocaleString('en-IN')}`);
    console.log(`  Total Vehicles:    ${data.totalVehicles}`);
  }

  // 5. Test Unauthorized Access Denied
  const intruderPayload = JSON.stringify({
    email: 'intruder@external.com',
    password: 'wrongpassword'
  });
  const unauthRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(intruderPayload)
    },
    body: intruderPayload
  });
  console.log(`✔ POST /api/auth/login (Unallowlisted Intruder) -> Status ${unauthRes.status} (Access Denied)`);

  console.log('\n--- All Live Server Sanity Checks Passed! ---');
  server.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
