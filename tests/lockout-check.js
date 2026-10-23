// MAN-01: shows the login lockout. Run against the DEV server (npm run dev), not the test database.
//   node tests/lockout-check.js            (server must be running on http://localhost:3000)
// After it runs, restart the dev server to clear the lockout (Ctrl+C, npm run dev).
const fs = require('fs'), path = require('path');
const base = process.env.BASE_URL || 'http://localhost:3000';
(async () => {
  let cookie = '';
  const grab = r => (r.headers.getSetCookie ? r.headers.getSetCookie() : []).forEach(c => { if (c.startsWith('cd.sid=')) cookie = c.split(';')[0]; });
  let r = await fetch(base + '/api/auth/csrf'); grab(r); const token = (await r.json()).token;
  const lines = [`MAN-01 lockout check against ${base} at ${new Date().toISOString()}`];
  for (let i = 1; i <= 12; i++) {
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': token, cookie }, body: JSON.stringify({ email: 'lockout-test@example.com', password: 'WrongPass' + i }) });
    const j = await r.json().catch(() => ({}));
    lines.push(`attempt ${String(i).padStart(2)}: HTTP ${r.status}  ${j.error || ''}`);
  }
  const ok = lines.some(l => /attempt 1[12]: HTTP 429/.test(l)) && lines.some(l => /attempt 10: HTTP 401/.test(l));
  lines.push(ok ? 'RESULT: PASS. The first 10 wrong attempts were refused (401); further attempts were blocked (429).' : 'RESULT: FAIL. No lockout seen. Is the server running in NODE_ENV=test?');
  console.log(lines.join('\n'));
  const out = path.join(__dirname, '..', 'docs', 'testing', 'results'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'man-01-lockout.txt'), lines.join('\n') + '\n');
  console.log('\nSaved docs/testing/results/man-01-lockout.txt. Restart the dev server to clear the lockout.');
})().catch(e => { console.error('Could not reach the server:', e.message); process.exit(1); });
