const http = require('http');

const payload = JSON.stringify({
  messages: [{ role: "user", content: "Halo AI, apa kabar?" }],
  context: { level: 1, exp: 0, upcomingTasksCount: 0, sleepInfo: "Belum di set" }
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(payload);
req.end();
