const http = require('http');

const postData = JSON.stringify({
  email: 'harish.internal@atharvatravels.com',
  password: 'atharvatravels@internal'
});

const req = http.request('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Login Response Status:', res.statusCode);
    console.log('Body:', body);
    console.log('Set-Cookie received:', !!res.headers['set-cookie']);
  });
});

req.on('error', err => console.error('Error:', err.message));
req.write(postData);
req.end();

