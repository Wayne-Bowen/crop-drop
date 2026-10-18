// Executes the documented test cases and writes a results report.
//   npm run test:report                 run all cases (needs a *_test database), writes docs/testing/results/
//   node tests/report.js --catalogue    only write the test-case catalogue (no database needed)
const fs = require('fs'), path = require('path');
const CATALOGUE_ONLY = process.argv.includes('--catalogue');
const cases = [];
const add = (id, module, type, title, steps, expected, fn) => cases.push({ id, module, type, title, steps, expected, fn });
const setup = (name, fn) => cases.push({ hidden: true, id: 'SETUP', title: name, fn });
const chk = (cond, actual) => ({ pass: !!cond, actual });
let S = {}; // shared state between cases

/* ===================== REGISTRATION ===================== */
const reg = (o = {}) => ({ full_name: 'Test User', email: 'u@t.co', phone: '0712345678', role: 'buyer', password: 'Passw0rdX', ...o });
add('REG-01', 'Registration', 'Positive', 'Register a valid buyer', 'POST /api/auth/register with valid name, email, phone, role buyer, strong password', 'HTTP 201, account active immediately', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'buyer1@test.co', full_name: 'Buyer One' })); return chk(r.status === 201 && r.data.status === 'approved', `HTTP ${r.status}, status=${r.data.status}`); });
add('REG-02', 'Registration', 'Positive', 'Register a valid farmer', 'Same as REG-01 with role farmer', 'HTTP 201, status pending (needs admin approval)', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'farmer1@test.co', full_name: 'Farmer One', role: 'farmer', phone: '0722345678' })); return chk(r.status === 201 && r.data.status === 'pending', `HTTP ${r.status}, status=${r.data.status}`); });
add('REG-03', 'Registration', 'Positive', 'Phone in +254 format accepted', 'Register with phone +254712345678', 'HTTP 201', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'plus254@test.co', phone: '+254712345678' })); return chk(r.status === 201, `HTTP ${r.status}`); });
add('REG-04', 'Registration', 'Boundary', 'Password of exactly 8 characters accepted', 'Register with password Pass1234 (8 chars, letter and digit)', 'HTTP 201', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'p8@test.co', password: 'Pass1234' })); return chk(r.status === 201, `HTTP ${r.status}`); });
add('REG-05', 'Registration', 'Boundary', 'Password of 7 characters rejected', 'Register with password Pass123 (7 chars)', 'HTTP 400 with a password error', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'p7@test.co', password: 'Pass123' })); return chk(r.status === 400 && r.data.fields && r.data.fields.password, `HTTP ${r.status}, field error: ${r.data.fields && r.data.fields.password}`); });
add('REG-06', 'Registration', 'Boundary', 'Email of 150 characters accepted, 151 rejected', 'Register with a 150-character email, then a 151-character email', '150 gives HTTP 201, 151 gives HTTP 400', async () => {
  const e150 = 'a'.repeat(138) + '@example.com', e151 = 'a'.repeat(139) + '@example.com';
  const a = await S.anon.req('POST', '/api/auth/register', reg({ email: e150 })), b = await S.anon.req('POST', '/api/auth/register', reg({ email: e151 }));
  return chk(a.status === 201 && b.status === 400, `150 chars: HTTP ${a.status}; 151 chars: HTTP ${b.status}`); });
add('REG-07', 'Registration', 'Boundary', 'One-character name rejected', 'Register with full_name "A"', 'HTTP 400 with a name error', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'n1@test.co', full_name: 'A' })); return chk(r.status === 400 && r.data.fields.full_name, `HTTP ${r.status}`); });
add('REG-08', 'Registration', 'Negative', 'Duplicate email rejected, case-insensitive', 'Register BUYER1@TEST.CO after buyer1@test.co exists', 'HTTP 409 already registered', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'BUYER1@TEST.CO' })); return chk(r.status === 409, `HTTP ${r.status}`); });
add('REG-09', 'Registration', 'Negative', 'Invalid phone numbers rejected', 'Register with 0612345678 and with 12345', 'Both HTTP 400 with a phone error', async () => {
  const a = await S.anon.req('POST', '/api/auth/register', reg({ email: 'ph1@test.co', phone: '0612345678' })), b = await S.anon.req('POST', '/api/auth/register', reg({ email: 'ph2@test.co', phone: '12345' }));
  return chk(a.status === 400 && b.status === 400, `0612345678: HTTP ${a.status}; 12345: HTTP ${b.status}`); });
add('REG-10', 'Registration', 'Negative', 'Malformed email rejected', 'Register with email a@b', 'HTTP 400 with an email error', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'a@b' })); return chk(r.status === 400 && r.data.fields.email, `HTTP ${r.status}`); });
add('REG-11', 'Registration', 'Negative', 'Cannot self-register as admin', 'Register with role admin', 'HTTP 400, no admin account created', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'evil@test.co', role: 'admin' }));
  const n = (await S.db.query("SELECT count(*)::int n FROM users WHERE email='evil@test.co'")).rows[0].n; return chk(r.status === 400 && n === 0, `HTTP ${r.status}, rows created: ${n}`); });
setup('Create second buyer, approve farmer, log everyone in', async () => {
  await S.anon.req('POST', '/api/auth/register', reg({ email: 'buyer2@test.co', full_name: 'Buyer Two', phone: '0733345678' }));
  await S.admin.login('admin@cropdrop.local', 'Admin@1234');
  const ov = (await S.admin.req('GET', '/api/admin/overview')).data; const f = ov.farmers.find(x => x.email === 'farmer1@test.co');
  await S.admin.req('POST', `/api/admin/farmers/${f.id}/approve`);
  await S.farmer.login('farmer1@test.co', 'Passw0rdX'); await S.buyer.login('buyer1@test.co', 'Passw0rdX'); await S.buyer2.login('buyer2@test.co', 'Passw0rdX');
});

/* ===================== LOGIN AND SECURITY ===================== */
add('AUTH-01', 'Login and security', 'Positive', 'Valid login', 'POST /api/auth/login with correct credentials', 'HTTP 200 with the user role', async () => {
  const c = new S.Client(); await c.csrf(); const r = await c.req('POST', '/api/auth/login', { email: 'buyer1@test.co', password: 'Passw0rdX' }); return chk(r.status === 200 && r.data.user.role === 'buyer', `HTTP ${r.status}, role=${r.data.user && r.data.user.role}`); });
add('AUTH-02', 'Login and security', 'Negative', 'Wrong password gives a generic error', 'Login with a wrong password', 'HTTP 401 "Incorrect email or password."', async () => {
  const c = new S.Client(); await c.csrf(); const r = await c.req('POST', '/api/auth/login', { email: 'buyer1@test.co', password: 'WrongPass9' }); return chk(r.status === 401 && r.data.error === 'Incorrect email or password.', `HTTP ${r.status}, "${r.data.error}"`); });
add('AUTH-03', 'Login and security', 'Security', 'Unknown email gives the same message (no account enumeration)', 'Login with an email that does not exist', 'HTTP 401 with the identical message as AUTH-02', async () => {
  const c = new S.Client(); await c.csrf(); const r = await c.req('POST', '/api/auth/login', { email: 'nobody@test.co', password: 'WrongPass9' }); return chk(r.status === 401 && r.data.error === 'Incorrect email or password.', `HTTP ${r.status}, "${r.data.error}"`); });
add('SEC-01', 'Login and security', 'Security', 'SQL injection in the login email field', "Login with email  admin@cropdrop.local' OR '1'='1' --  and any password", 'HTTP 401, no session created', async () => {
  const c = new S.Client(); await c.csrf(); const r = await c.req('POST', '/api/auth/login', { email: "admin@cropdrop.local' OR '1'='1' --", password: 'x' }); const me = await c.req('GET', '/api/auth/me'); return chk(r.status === 401 && me.data.user === null, `HTTP ${r.status}, logged in: ${me.data.user !== null}`); });
add('SEC-02', 'Login and security', 'Security', 'SQL injection in the password field', "Login as a real user with password  ' OR 1=1 --", 'HTTP 401', async () => {
  const c = new S.Client(); await c.csrf(); const r = await c.req('POST', '/api/auth/login', { email: 'buyer1@test.co', password: "' OR 1=1 --" }); return chk(r.status === 401, `HTTP ${r.status}`); });
add('SEC-03', 'Login and security', 'Security', 'SQL injection text in registration is stored as plain text', "Register with name  Robert'); DROP TABLE users;--", 'HTTP 201, the text is stored literally and the users table still exists', async () => {
  const r = await S.anon.req('POST', '/api/auth/register', reg({ email: 'bobby@test.co', full_name: "Robert'); DROP TABLE users;--" }));
  const row = (await S.db.query("SELECT full_name FROM users WHERE email='bobby@test.co'")).rows[0]; const n = (await S.db.query('SELECT count(*)::int n FROM users')).rows[0].n;
  return chk(r.status === 201 && row && row.full_name.startsWith('Robert') && n > 3, `HTTP ${r.status}, stored name: ${row && row.full_name}, users table rows: ${n}`); });
add('SEC-04', 'Login and security', 'Security', 'Weak passwords rejected', 'Register with "password" (no digit) and "12345678" (no letter)', 'Both HTTP 400 with a password error', async () => {
  const a = await S.anon.req('POST', '/api/auth/register', reg({ email: 'w1@test.co', password: 'password' })), b = await S.anon.req('POST', '/api/auth/register', reg({ email: 'w2@test.co', password: '12345678' }));
  return chk(a.status === 400 && b.status === 400, `"password": HTTP ${a.status}; "12345678": HTTP ${b.status}`); });
add('SEC-05', 'Login and security', 'Security', 'Passwords are stored hashed', 'Read password_hash for buyer1 from the database', 'Starts with a bcrypt marker and is not the plain password', async () => {
  const h = (await S.db.query("SELECT password_hash FROM users WHERE email='buyer1@test.co'")).rows[0].password_hash; return chk(/^\$2[aby]\$/.test(h) && h !== 'Passw0rdX', `hash begins "${h.slice(0, 7)}", length ${h.length}`); });
add('SEC-06', 'Login and security', 'Security', 'Password hash is never returned by the API', 'Inspect the login and /me responses', 'No password or hash fields', async () => {
  const me = await S.buyer.req('GET', '/api/auth/me'); const txt = JSON.stringify(me.data); return chk(!/password/i.test(txt), `fields returned: ${Object.keys(me.data.user).join(', ')}`); });
add('SEC-07', 'Login and security', 'Security', 'Protected endpoints refuse anonymous requests', 'Call /api/orders/mine, /api/produce/mine and /api/admin/overview without logging in', 'All HTTP 401', async () => {
  const s = []; for (const u of ['/api/orders/mine', '/api/produce/mine', '/api/admin/overview']) s.push((await S.anon.req('GET', u)).status); return chk(s.every(x => x === 401), `statuses: ${s.join(', ')}`); });
add('SEC-08', 'Login and security', 'Security', 'Role enforcement', 'Buyer calls the admin API; farmer tries to place an order', 'Both HTTP 403', async () => {
  const a = await S.buyer.req('GET', '/api/admin/overview'), b = await S.farmer.req('POST', '/api/orders', { items: [{ id: 1, qty: 1 }] }); return chk(a.status === 403 && b.status === 403, `buyer to admin: HTTP ${a.status}; farmer order: HTTP ${b.status}`); });
add('SEC-09', 'Login and security', 'Security', 'CSRF token required for state-changing requests', 'POST /api/auth/login without the X-CSRF-Token header', 'HTTP 403', async () => {
  const c = new S.Client(); const r = await c.req('POST', '/api/auth/login', { email: 'buyer1@test.co', password: 'Passw0rdX' }); return chk(r.status === 403, `HTTP ${r.status}`); });
add('SEC-10', 'Login and security', 'Security', 'Logout ends the session', 'Log in, log out, then request /api/orders/mine', 'After logout /api/auth/me is empty and orders/mine is HTTP 401', async () => {
  const c = new S.Client(); await c.login('buyer1@test.co', 'Passw0rdX'); await c.req('POST', '/api/auth/logout'); const me = await c.req('GET', '/api/auth/me'), o = await c.req('GET', '/api/orders/mine'); return chk(me.data.user === null && o.status === 401, `/me user: ${me.data.user}, orders/mine: HTTP ${o.status}`); });
add('SEC-11', 'Login and security', 'Security', 'Session cookie flags', 'Inspect the Set-Cookie header after login', 'HttpOnly and SameSite=Lax present (Secure is added in production)', async () => {
  const c = new S.Client(); await c.csrf(); const r = await c.req('POST', '/api/auth/login', { email: 'buyer1@test.co', password: 'Passw0rdX' }); const ck = (r.cookies.find(x => x.startsWith('cd.sid')) || ''); return chk(/HttpOnly/i.test(ck) && /SameSite=Lax/i.test(ck), ck.replace(/cd\.sid=[^;]+/, 'cd.sid=<hidden>')); });
add('SEC-12', 'Login and security', 'Security', 'Security headers present', 'Inspect response headers of any request', 'Content-Security-Policy (script-src self), X-Content-Type-Options nosniff, Strict-Transport-Security', async () => {
  const r = await S.anon.req('GET', '/api/health'); const h = r.headers; return chk(/script-src 'self'/.test(h['content-security-policy'] || '') && h['x-content-type-options'] === 'nosniff' && !!h['strict-transport-security'], `CSP: ${!!h['content-security-policy']}, nosniff: ${h['x-content-type-options']}, HSTS: ${!!h['strict-transport-security']}`); });
add('SEC-13', 'Login and security', 'Security', 'Login is rate limited', 'Inspect rate-limit headers on the login response (the lockout itself is tested manually, see MAN-01)', 'RateLimit headers present', async () => {
  const c = new S.Client(); await c.csrf(); const r = await c.req('POST', '/api/auth/login', { email: 'x@test.co', password: 'x' }); return chk(!!(r.headers['ratelimit-limit'] || r.headers['ratelimit']), `ratelimit-limit: ${r.headers['ratelimit-limit']}`); });
setup('Create listings used by catalogue and checkout tests', async () => {
  const mk = async o => { const f = new FormData(); Object.entries({ category_id: '1', location: 'Nakuru', description: 'Test item', ...o }).forEach(([k, v]) => f.append(k, v)); return S.farmer.req('POST', '/api/produce', f, true); };
  S.mk = mk; S.ids = {};
  for (const [k, o] of Object.entries({ tomatoes: { name: 'Tomatoes', price: '80', quantity: '50' }, mangoes: { name: 'Mangoes', price: '120', quantity: '100', category_id: '2', location: 'Machakos' }, soldout: { name: 'Sold Out Item', price: '10', quantity: '0' }, pending: { name: 'Pending Item', price: '10', quantity: '5' }, last: { name: 'Last Ones', price: '10', quantity: '3' }, onions: { name: 'Red onions', price: '60', quantity: '20' } })) {
    S.ids[k] = (await mk(o)).data.id;
    if (k !== 'pending') await S.admin.req('POST', `/api/admin/produce/${S.ids[k]}/approve`);
  }
});

/* ===================== CATALOGUE ===================== */
add('CAT-01', 'Produce catalogue', 'Positive', 'List shows approved, in-stock produce', 'GET /api/produce', 'HTTP 200, Tomatoes, Mangoes, Last Ones and Red onions listed', async () => {
  const r = await S.anon.req('GET', '/api/produce'); const n = r.data.items.map(i => i.name); return chk(r.status === 200 && ['Tomatoes', 'Mangoes', 'Last Ones', 'Red onions'].every(x => n.includes(x)), `total=${r.data.total}: ${n.join(', ')}`); });
add('CAT-02', 'Produce catalogue', 'Positive', 'Search by name', 'GET /api/produce?q=toma', 'Only Tomatoes returned', async () => {
  const r = await S.anon.req('GET', '/api/produce?q=toma'); return chk(r.data.total === 1 && r.data.items[0].name === 'Tomatoes', `total=${r.data.total}`); });
add('CAT-03', 'Produce catalogue', 'Positive', 'Filter by category', 'GET /api/produce?category=2 (Fruits)', 'Only Mangoes returned', async () => {
  const r = await S.anon.req('GET', '/api/produce?category=2'); return chk(r.data.total === 1 && r.data.items[0].name === 'Mangoes', `total=${r.data.total}`); });
add('CAT-04', 'Produce catalogue', 'Positive', 'Sort by price, low to high', 'GET /api/produce?sort=low', 'Prices ascending', async () => {
  const r = await S.anon.req('GET', '/api/produce?sort=low'); const p = r.data.items.map(i => i.price); return chk(p.every((x, i) => !i || x >= p[i - 1]), `prices: ${p.join(', ')}`); });
add('CAT-05', 'Produce catalogue', 'Negative', 'Search with no match', 'GET /api/produce?q=zzzzzz', 'HTTP 200, empty list, total 0', async () => {
  const r = await S.anon.req('GET', '/api/produce?q=zzzzzz'); return chk(r.status === 200 && r.data.total === 0 && r.data.items.length === 0, `HTTP ${r.status}, total=${r.data.total}`); });
add('CAT-06', 'Produce catalogue', 'Boundary', 'Page size of 1, and an offset past the end', 'GET /api/produce?limit=1, then ?offset=999', 'One item; then an empty list with the same total', async () => {
  const a = await S.anon.req('GET', '/api/produce?limit=1'), b = await S.anon.req('GET', '/api/produce?offset=999'); return chk(a.data.items.length === 1 && b.data.items.length === 0 && b.data.total === a.data.total, `limit=1: ${a.data.items.length} item; offset=999: ${b.data.items.length} items, total ${b.data.total}`); });
add('CAT-07', 'Produce catalogue', 'Negative', 'Unapproved listing is hidden', 'Search for "Pending Item" (created by an approved farmer, not yet approved)', 'Not in the public list and detail page returns 404', async () => {
  const a = await S.anon.req('GET', '/api/produce?q=Pending'), b = await S.anon.req('GET', `/api/produce/${S.ids.pending}`); return chk(a.data.total === 0 && b.status === 404, `search total=${a.data.total}, detail HTTP ${b.status}`); });
add('CAT-08', 'Produce catalogue', 'Boundary', 'Out-of-stock item (quantity 0) is hidden from the list', 'Search for "Sold Out Item" (quantity 0, approved)', 'Not in the public list', async () => {
  const a = await S.anon.req('GET', '/api/produce?q=Sold'); return chk(a.data.total === 0, `total=${a.data.total}`); });
add('CAT-09', 'Produce catalogue', 'Negative', 'Unknown or malformed product id', 'GET /api/produce/99999 and /api/produce/abc', 'Both HTTP 404', async () => {
  const a = await S.anon.req('GET', '/api/produce/99999'), b = await S.anon.req('GET', '/api/produce/abc'); return chk(a.status === 404 && b.status === 404, `99999: HTTP ${a.status}; abc: HTTP ${b.status}`); });
add('CAT-10', 'Produce catalogue', 'Security', 'Wildcard characters in search are treated literally', 'GET /api/produce?q=%25 (a percent sign)', 'No results, not everything', async () => {
  const r = await S.anon.req('GET', '/api/produce?q=%25'); return chk(r.data.total === 0, `total=${r.data.total}`); });
add('CAT-11', 'Produce catalogue', 'Security', 'SQL injection in search', "GET /api/produce?q=x' OR '1'='1", 'HTTP 200, no results, no error', async () => {
  const r = await S.anon.req('GET', "/api/produce?q=" + encodeURIComponent("x' OR '1'='1")); return chk(r.status === 200 && r.data.total === 0, `HTTP ${r.status}, total=${r.data.total}`); });
add('CAT-12', 'Produce catalogue', 'Boundary', 'Listing price: 0 rejected, 0.01 accepted', 'Farmer creates a listing with price 0, then 0.01', 'Price 0 gives HTTP 400, 0.01 gives HTTP 201', async () => {
  const a = await S.mk({ name: 'Zero Price', price: '0', quantity: '5' }), b = await S.mk({ name: 'Min Price', price: '0.01', quantity: '5' }); return chk(a.status === 400 && b.status === 201, `price 0: HTTP ${a.status}; price 0.01: HTTP ${b.status}`); });
add('CAT-13', 'Produce catalogue', 'Boundary', 'Listing quantity: -1 rejected, 0 accepted', 'Farmer creates a listing with quantity -1, then 0', 'Quantity -1 gives HTTP 400, 0 gives HTTP 201', async () => {
  const a = await S.mk({ name: 'Neg Qty', price: '5', quantity: '-1' }), b = await S.mk({ name: 'Zero Qty', price: '5', quantity: '0' }); return chk(a.status === 400 && b.status === 201, `qty -1: HTTP ${a.status}; qty 0: HTTP ${b.status}`); });
add('CAT-14', 'Produce catalogue', 'Security', 'Photo links are limited to Unsplash and a fake image upload is refused', 'Create a listing with a photo link on another site; upload a text file named .png', 'Both HTTP 400', async () => {
  const f1 = new FormData(); Object.entries({ name: 'Link', category_id: '1', price: '5', quantity: '5', location: 'X1', photo_url: 'https://evil.example.com/photo-1.jpg' }).forEach(([k, v]) => f1.append(k, v));
  const a = await S.farmer.req('POST', '/api/produce', f1, true);
  const f2 = new FormData(); Object.entries({ name: 'Fake', category_id: '1', price: '5', quantity: '5', location: 'X1' }).forEach(([k, v]) => f2.append(k, v)); f2.append('photo', new Blob([Buffer.from('<?php echo 1;')], { type: 'image/png' }), 'x.png');
  const b = await S.farmer.req('POST', '/api/produce', f2, true); return chk(a.status === 400 && b.status === 400, `foreign link: HTTP ${a.status}; fake image: HTTP ${b.status}`); });

/* ===================== CHECKOUT ===================== */
const stock = async id => (await S.anon.req('GET', `/api/produce/${id}`)).data.item.quantity;
add('CHK-01', 'Checkout and orders', 'Positive', 'Place a valid order', 'Buyer orders 2 Tomatoes (80 each) and 1 Mangoes (120)', 'HTTP 201; total KES 280, status placed', async () => {
  const r = await S.buyer.req('POST', '/api/orders', { items: [{ id: S.ids.tomatoes, qty: 2 }, { id: S.ids.mangoes, qty: 1 }] }); S.order1 = r.data.id;
  const o = (await S.buyer.req('GET', '/api/orders/mine')).data.orders[0]; return chk(r.status === 201 && o.total === 280 && o.status === 'placed', `HTTP ${r.status}, total=${o.total}, status=${o.status}`); });
add('CHK-02', 'Checkout and orders', 'Positive', 'Stock decreases after an order', 'Read stock of Tomatoes and Mangoes after CHK-01', 'Tomatoes 48, Mangoes 99', async () => {
  const t = await stock(S.ids.tomatoes), m = await stock(S.ids.mangoes); return chk(t === 48 && m === 99, `Tomatoes ${t}, Mangoes ${m}`); });
add('CHK-03', 'Checkout and orders', 'Boundary', 'Ordering exactly the remaining stock is accepted', 'Order all 3 units of "Last Ones"', 'HTTP 201; item then disappears from the catalogue', async () => {
  const r = await S.buyer.req('POST', '/api/orders', { items: [{ id: S.ids.last, qty: 3 }] }); const l = await S.anon.req('GET', '/api/produce?q=Last'); return chk(r.status === 201 && l.data.total === 0, `HTTP ${r.status}, still listed: ${l.data.total > 0}`); });
add('CHK-04', 'Checkout and orders', 'Boundary', 'Ordering one more than the stock is refused', 'Order 49 Tomatoes when 48 remain', 'HTTP 409 with a message naming the item', async () => {
  const r = await S.buyer.req('POST', '/api/orders', { items: [{ id: S.ids.tomatoes, qty: 49 }] }); return chk(r.status === 409 && /Tomatoes/.test(r.data.error), `HTTP ${r.status}, "${r.data.error}"`); });
add('CHK-05', 'Checkout and orders', 'Boundary', 'Quantity 0 and negative quantity refused', 'Order quantity 0, then -1', 'Both HTTP 400', async () => {
  const a = await S.buyer.req('POST', '/api/orders', { items: [{ id: S.ids.tomatoes, qty: 0 }] }), b = await S.buyer.req('POST', '/api/orders', { items: [{ id: S.ids.tomatoes, qty: -1 }] }); return chk(a.status === 400 && b.status === 400, `qty 0: HTTP ${a.status}; qty -1: HTTP ${b.status}`); });
add('CHK-06', 'Checkout and orders', 'Negative', 'Empty cart refused', 'POST /api/orders with no items', 'HTTP 400', async () => {
  const r = await S.buyer.req('POST', '/api/orders', { items: [] }); return chk(r.status === 400, `HTTP ${r.status}`); });
add('CHK-07', 'Checkout and orders', 'Security', 'Price tampering is ignored', 'Order 1 Tomatoes while sending price 1 in the request', 'Total is KES 80 (database price)', async () => {
  const r = await S.buyer.req('POST', '/api/orders', { items: [{ id: S.ids.tomatoes, qty: 1, price: 1 }], total: 1 }); const o = (await S.buyer.req('GET', `/api/orders/${r.data.id}`)).data.order; return chk(o.total === 80, `HTTP ${r.status}, total=${o.total}`); });
add('CHK-08', 'Checkout and orders', 'Negative', 'Guests and farmers cannot order', 'Order as a guest and as a farmer', 'Guest HTTP 401, farmer HTTP 403', async () => {
  const a = await S.anon.req('POST', '/api/orders', { items: [{ id: S.ids.tomatoes, qty: 1 }] }), b = await S.farmer.req('POST', '/api/orders', { items: [{ id: S.ids.tomatoes, qty: 1 }] }); return chk(a.status === 401 && b.status === 403, `guest: HTTP ${a.status}; farmer: HTTP ${b.status}`); });
add('CHK-09', 'Checkout and orders', 'Negative', 'Unknown product in the cart', 'Order product id 99999', 'HTTP 409 no longer available', async () => {
  const r = await S.buyer.req('POST', '/api/orders', { items: [{ id: 99999, qty: 1 }] }); return chk(r.status === 409, `HTTP ${r.status}`); });
add('CHK-10', 'Checkout and orders', 'Positive', 'Duplicate cart lines are merged', 'Order Red onions twice in one request (1 and 2)', 'One order line with quantity 3', async () => {
  const r = await S.buyer.req('POST', '/api/orders', { items: [{ id: S.ids.onions, qty: 1 }, { id: S.ids.onions, qty: 2 }] }); const o = (await S.buyer.req('GET', `/api/orders/${r.data.id}`)).data.order; return chk(o.items.length === 1 && o.items[0].quantity === 3, `lines=${o.items.length}, qty=${o.items[0].quantity}`); });
add('CHK-11', 'Checkout and orders', 'Positive', 'PDF receipt', 'GET /api/orders/{id}/receipt.pdf as the buyer', 'HTTP 200, application/pdf, file starts with %PDF', async () => {
  const r = await S.buyer.req('GET', `/api/orders/${S.order1}/receipt.pdf`); return chk(r.status === 200 && r.type.includes('pdf') && r.data.slice(0, 4).toString() === '%PDF', `HTTP ${r.status}, ${r.type}, ${r.data.length} bytes`); });
add('CHK-12', 'Checkout and orders', 'Security', "Another buyer cannot read someone else's order", 'Buyer 2 requests buyer 1 order', 'HTTP 404', async () => {
  const r = await S.buyer2.req('GET', `/api/orders/${S.order1}`); return chk(r.status === 404, `HTTP ${r.status}`); });
add('CHK-13', 'Checkout and orders', 'Positive', 'Order lifecycle: placed, confirmed, dispatched, delivered', 'Admin advances the order three times', 'Statuses in that exact order', async () => {
  const s = []; for (let i = 0; i < 3; i++) s.push((await S.admin.req('POST', `/api/admin/orders/${S.order1}/advance`)).data.status); return chk(s.join() === 'confirmed,dispatched,delivered', s.join(' > ')); });
add('CHK-14', 'Checkout and orders', 'Negative', 'Delivered order cannot advance; buyer cannot advance', 'Advance the delivered order as admin; advance as buyer', 'Admin HTTP 409; buyer HTTP 403', async () => {
  const a = await S.admin.req('POST', `/api/admin/orders/${S.order1}/advance`), b = await S.buyer.req('POST', `/api/admin/orders/${S.order1}/advance`); return chk(a.status === 409 && b.status === 403, `admin: HTTP ${a.status}; buyer: HTTP ${b.status}`); });
add('CHK-15', 'Checkout and orders', 'Negative', 'A failed order changes nothing (rollback)', 'Order 1 valid Tomato plus 9999 Mangoes in one request', 'HTTP 409 and Tomatoes stock unchanged', async () => {
  const before = await stock(S.ids.tomatoes); const r = await S.buyer.req('POST', '/api/orders', { items: [{ id: S.ids.tomatoes, qty: 1 }, { id: S.ids.mangoes, qty: 9999 }] }); const after = await stock(S.ids.tomatoes); return chk(r.status === 409 && before === after, `HTTP ${r.status}, Tomatoes stock ${before} before, ${after} after`); });
add('CHK-16', 'Checkout and orders', 'Positive', 'Order totals match their line items (data integrity)', 'SQL: count orders whose total differs from the sum of quantity x unit_price', '0 mismatched orders', async () => {
  const n = (await S.db.query('SELECT count(*)::int n FROM orders o WHERE o.total <> (SELECT sum(quantity*unit_price) FROM order_items WHERE order_id=o.id)')).rows[0].n; return chk(n === 0, `mismatched orders: ${n}`); });

/* ===================== REPORT ===================== */
const manual = [
  ['MAN-01', 'Login and security', 'Security', 'Brute-force lockout', 'On the running dev server (not the test run) submit 11 wrong passwords for one account within 15 minutes', 'The 11th attempt returns HTTP 429 "Too many login attempts"'],
  ['MAN-02', 'Login and security', 'Usability', 'Inline validation messages', 'On the Register form leave fields empty or type "abc" in Email and press Create account', 'Each wrong field shows a message under it and nothing is submitted'],
  ['MAN-03', 'Produce catalogue', 'Usability', 'Catalogue works at 390 px and 1440 px', 'Open /catalogue at both widths (see 04-usability-compatibility.md)', 'No sideways scrolling; cards reflow; Add button reachable'],
  ['MAN-04', 'Checkout and orders', 'Usability', 'Cart to receipt journey in the browser', 'Add two items, open the cart, change a quantity, place the order, open the receipt, download the PDF', 'Each step works and the totals agree on every screen'],
];
const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
function catalogueMd() {
  const v = cases.filter(c => !c.hidden);
  let o = '# Test case catalogue\n\nGenerated by `node tests/report.js --catalogue`. These are the cases the test runner executes (`npm run test:report`). Every case is run against a clean test database, so results do not depend on earlier runs.\n\n';
  for (const m of ['Registration', 'Login and security', 'Produce catalogue', 'Checkout and orders']) {
    o += `## ${m}\n\n| ID | Type | Test | Steps | Expected result |\n|---|---|---|---|---|\n` + v.filter(c => c.module === m).map(c => `| ${c.id} | ${c.type} | ${esc(c.title)} | ${esc(c.steps)} | ${esc(c.expected)} |`).join('\n') + '\n\n';
  }
  o += '## Manual cases (you run these in the browser or terminal and record the result)\n\n| ID | Module | Type | Test | Steps | Expected result |\n|---|---|---|---|---|---|\n' + manual.map(m => `| ${m.map(esc).join(' | ')} |`).join('\n') + '\n';
  return o;
}

async function main() {
  const dir = path.join(__dirname, '..', 'docs', 'testing');
  fs.mkdirSync(path.join(dir, 'results'), { recursive: true });
  if (CATALOGUE_ONLY) { fs.writeFileSync(path.join(dir, '03-test-case-catalogue.md'), catalogueMd()); return console.log('Wrote docs/testing/03-test-case-catalogue.md'); }

  process.env.NODE_ENV = 'test'; require('dotenv').config();
  process.env.ADMIN_EMAIL = 'admin@cropdrop.local'; process.env.ADMIN_PASSWORD = 'Admin@1234';
  if (!/_test(\?|$)/.test(process.env.DATABASE_URL || '')) { console.error('Refusing to run: DATABASE_URL must point at a database whose name ends in _test, because this run wipes its tables.'); process.exit(1); }
  const app = require('../server'), db = require('../db'); await app.ready;
  await db.query('TRUNCATE order_items, orders, produce, messages, users RESTART IDENTITY CASCADE'); await db.init();
  const server = app.listen(0), base = 'http://localhost:' + server.address().port;
  class Client {
    constructor() { this.cookie = ''; this.token = ''; }
    async req(method, url, body, raw) {
      const headers = { cookie: this.cookie }; if (method !== 'GET' && this.token) headers['x-csrf-token'] = this.token; if (body && !raw) headers['content-type'] = 'application/json';
      const r = await fetch(base + url, { method, headers, body: raw ? body : body ? JSON.stringify(body) : undefined });
      const cookies = r.headers.getSetCookie ? r.headers.getSetCookie() : []; cookies.forEach(c => { if (c.startsWith('cd.sid=')) this.cookie = c.split(';')[0]; });
      const type = r.headers.get('content-type') || ''; const data = type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
      return { status: r.status, data, type, cookies, headers: Object.fromEntries(r.headers) };
    }
    async csrf() { this.token = (await this.req('GET', '/api/auth/csrf')).data.token; }
    async login(e, p) { await this.csrf(); const r = await this.req('POST', '/api/auth/login', { email: e, password: p }); await this.csrf(); return r; }
  }
  S = { db, Client, anon: new Client(), admin: new Client(), farmer: new Client(), buyer: new Client(), buyer2: new Client() };
  await S.anon.csrf();
  const results = [], t0 = Date.now();
  for (const c of cases) {
    try { const r = await c.fn(); if (!c.hidden) results.push({ ...c, ...r }); else console.log('  setup: ' + c.title); }
    catch (e) { if (c.hidden) { console.error('SETUP FAILED: ' + c.title + ' - ' + e.message); process.exit(1); } results.push({ ...c, pass: false, actual: 'Error: ' + e.message }); }
    if (!c.hidden) console.log(`  ${results[results.length - 1].pass ? 'PASS' : 'FAIL'}  ${c.id}  ${c.title}`);
  }
  const pg = (await db.query('SHOW server_version')).rows[0].server_version;
  const stamp = new Date(), when = stamp.toISOString().replace('T', ' ').slice(0, 19) + ' UTC', file = stamp.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const pass = results.filter(r => r.pass).length, fail = results.length - pass;
  const mods = ['Registration', 'Login and security', 'Produce catalogue', 'Checkout and orders'];
  let md = `# Test execution report\n\n| | |\n|---|---|\n| Run date | ${when} |\n| Environment | Node ${process.version}, PostgreSQL ${pg}, ${process.platform} |\n| Target | Local API against a clean test database |\n| Duration | ${((Date.now() - t0) / 1000).toFixed(1)} s |\n| Result | **${pass} passed, ${fail} failed** of ${results.length} automated cases |\n\n## Summary by module\n\n| Module | Cases | Passed | Failed |\n|---|---|---|---|\n` + mods.map(m => { const r = results.filter(x => x.module === m); return `| ${m} | ${r.length} | ${r.filter(x => x.pass).length} | ${r.filter(x => !x.pass).length} |`; }).join('\n');
  md += '\n\n## Summary by test type\n\n| Type | Cases | Passed |\n|---|---|---|\n' + [...new Set(results.map(r => r.type))].map(t => { const r = results.filter(x => x.type === t); return `| ${t} | ${r.length} | ${r.filter(x => x.pass).length} |`; }).join('\n');
  md += '\n\n## Results\n\n| ID | Type | Test | Expected | Actual | Result |\n|---|---|---|---|---|---|\n' + results.map(r => `| ${r.id} | ${r.type} | ${esc(r.title)} | ${esc(r.expected)} | ${esc(r.actual)} | ${r.pass ? 'PASS' : '**FAIL**'} |`).join('\n');
  if (fail) md += '\n\n## Failed cases (log each one in the defect report)\n\n' + results.filter(r => !r.pass).map(r => `* **${r.id}** ${r.title}. Expected: ${r.expected}. Actual: ${r.actual}`).join('\n');
  md += '\n\n## Manual cases still to run\n\n| ID | Module | Test | Result (fill in) |\n|---|---|---|---|\n' + manual.map(m => `| ${m[0]} | ${m[1]} | ${esc(m[3])} | |`).join('\n') + '\n';
  const out = path.join(dir, 'results', `test-results-${file}`);
  fs.writeFileSync(out + '.md', md);
  fs.writeFileSync(out + '.csv', 'ID,Module,Type,Test,Expected,Actual,Result\n' + results.map(r => [r.id, r.module, r.type, r.title, r.expected, r.actual, r.pass ? 'PASS' : 'FAIL'].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n'));
  console.log(`\n${pass} passed, ${fail} failed. Report: docs/testing/results/test-results-${file}.md`);
  server.close(); await db.pool.end(); process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
