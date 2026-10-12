// End-to-end check of the API against a real Postgres. Run: DATABASE_URL=... npm test
process.env.NODE_ENV = 'test';
require('dotenv').config();
process.env.ADMIN_EMAIL = 'admin@cropdrop.local';
process.env.ADMIN_PASSWORD = 'Admin@1234';
if (!/_test(\?|$)/.test(process.env.DATABASE_URL || '')) {
  console.error('Refusing to run: DATABASE_URL must point at a database whose name ends in _test, because this test wipes its tables.');
  process.exit(1);
}
const app = require('../server');
const db = require('../db');
let base, pass = 0, fail = 0;

class Client {
  constructor() { this.cookie = ''; this.token = ''; }
  async req(method, url, body, raw) {
    const headers = { cookie: this.cookie };
    if (method !== 'GET' && this.token) headers['x-csrf-token'] = this.token;
    if (body && !raw) headers['content-type'] = 'application/json';
    const r = await fetch(base + url, { method, headers, body: raw ? body : body ? JSON.stringify(body) : undefined });
    const sc = r.headers.getSetCookie?.() || [];
    sc.forEach(c => { if (c.startsWith('cd.sid=')) this.cookie = c.split(';')[0]; });
    const type = r.headers.get('content-type') || '';
    const data = type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
    return { status: r.status, data, type };
  }
  async csrf() { this.token = (await this.req('GET', '/api/auth/csrf')).data.token; }
  async login(email, password) { await this.csrf(); const r = await this.req('POST', '/api/auth/login', { email, password }); await this.csrf(); return r; }
}
function ok(name, cond, extra = '') { cond ? pass++ : fail++; console.log((cond ? '  ok   ' : '  FAIL ') + name + (cond ? '' : '  ' + extra)); }

(async () => {
  await app.ready;
  await db.query('TRUNCATE order_items, orders, produce, messages, users RESTART IDENTITY CASCADE');
  await db.init();
  const server = app.listen(0); base = 'http://localhost:' + server.address().port;
  const anon = new Client(), admin = new Client(), farmer = new Client(), buyer = new Client(), buyer2 = new Client();

  let r = await anon.req('GET', '/api/health'); ok('health check', r.status === 200 && r.data.db === 'up');
  r = await anon.req('POST', '/api/auth/login', { email: 'a@b.co', password: 'x' }); ok('state change without CSRF token is blocked', r.status === 403);

  await anon.csrf();
  r = await anon.req('POST', '/api/auth/register', { full_name: 'Test Farmer', email: 'f@test.co', phone: '0712345678', role: 'farmer', password: 'Passw0rdX' }); ok('register farmer', r.status === 201 && r.data.status === 'pending');
  r = await anon.req('POST', '/api/auth/register', { full_name: 'Test Farmer', email: 'F@test.co', phone: '0712345678', role: 'farmer', password: 'Passw0rdX' }); ok('duplicate email (any case) rejected', r.status === 409);
  r = await anon.req('POST', '/api/auth/register', { full_name: 'X Y', email: 'x@test.co', phone: '0712345678', role: 'buyer', password: 'short' }); ok('weak password rejected', r.status === 400 && r.data.fields.password);
  r = await anon.req('POST', '/api/auth/register', { full_name: 'X Y', email: 'x@test.co', phone: '12345', role: 'buyer', password: 'Passw0rdX' }); ok('bad phone rejected', r.status === 400 && r.data.fields.phone);
  r = await anon.req('POST', '/api/auth/register', { full_name: 'Evil', email: 'e@test.co', phone: '0712345678', role: 'admin', password: 'Passw0rdX' }); ok('cannot self-register as admin', r.status === 400);
  await anon.req('POST', '/api/auth/register', { full_name: 'Test Buyer', email: 'b@test.co', phone: '0722345678', role: 'buyer', password: 'Passw0rdX' });
  await anon.req('POST', '/api/auth/register', { full_name: 'Other Buyer', email: 'b2@test.co', phone: '0722345679', role: 'buyer', password: 'Passw0rdX' });

  r = await anon.req('POST', '/api/auth/login', { email: "admin@cropdrop.local' OR '1'='1", password: "' OR '1'='1" }); ok('SQL injection login attempt fails safely', r.status === 401);
  r = await admin.login('admin@cropdrop.local', 'Admin@1234'); ok('admin login', r.status === 200 && r.data.user.role === 'admin');
  r = await farmer.login('f@test.co', 'Passw0rdX'); ok('pending farmer can log in', r.status === 200);

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const form = (over = {}) => { const f = new FormData(); Object.entries({ name: 'Tomatoes', category_id: '1', price: '80', quantity: '50', location: 'Nakuru', description: 'Ripe.', ...over }).forEach(([k, v]) => f.append(k, v)); f.append('photo', new Blob([png], { type: 'image/png' }), 'a.png'); return f; };
  r = await farmer.req('POST', '/api/produce', form(), true); ok('pending farmer cannot list produce', r.status === 403);
  const ov = (await admin.req('GET', '/api/admin/overview')).data; ok('admin sees pending farmer', ov.farmers.length === 1);
  r = await admin.req('POST', `/api/admin/farmers/${ov.farmers[0].id}/approve`); ok('admin approves farmer', r.status === 200);

  r = await farmer.req('POST', '/api/produce', (() => { const f = new FormData(); Object.entries({ name: 'Linked', category_id: '1', price: '10', quantity: '5', location: 'Nakuru', photo_url: 'https://evil.example.com/photo-1.jpg' }).forEach(([k, v]) => f.append(k, v)); return f; })(), true); ok('photo link from another site is rejected', r.status === 400);
  r = await farmer.req('POST', '/api/produce', (() => { const f = new FormData(); Object.entries({ name: 'Linked', category_id: '1', price: '10', quantity: '5', location: 'Nakuru', photo_url: 'https://images.unsplash.com/photo-1513791053024-3b50799fdd7b?w=999' }).forEach(([k, v]) => f.append(k, v)); return f; })(), true); ok('Unsplash photo link accepted (query stripped)', r.status === 201);
  const lk = (await farmer.req('GET', '/api/produce/mine')).data.items.find(i => i.name === 'Linked'); ok('stored link has no query string', lk && lk.photo === 'https://images.unsplash.com/photo-1513791053024-3b50799fdd7b');
  if (lk) await farmer.req('DELETE', `/api/produce/${lk.id}`);
  r = await farmer.req('POST', '/api/produce', form({ price: '-5' }), true); ok('negative price rejected', r.status === 400 && r.data.fields.price);
  const fake = new FormData(); ['name','category_id','price','quantity','location'].forEach((k, i) => fake.append(k, ['Fake','1','10','5','Nakuru'][i])); fake.append('photo', new Blob([Buffer.from('<?php echo 1; ?>')], { type: 'image/png' }), 'x.png');
  r = await farmer.req('POST', '/api/produce', fake, true); ok('fake image (wrong file signature) rejected', r.status === 400);
  r = await farmer.req('POST', '/api/produce', form(), true); ok('farmer creates listing with photo', r.status === 201 && r.data.id);
  const pid = r.data.id;
  r = await anon.req('GET', '/api/produce'); ok('pending listing hidden from public', r.data.total === 0);
  r = await admin.req('POST', `/api/admin/produce/${pid}/approve`); ok('admin approves listing', r.status === 200);
  r = await anon.req('GET', '/api/produce?q=toma&category=1&sort=low'); ok('search and filter find it', r.data.total === 1 && r.data.items[0].farmer === 'Test Farmer');
  r = await anon.req('GET', "/api/produce?q=%25'%3B%20DROP%20TABLE%20users%3B--"); ok('SQL injection in search is harmless', r.status === 200 && r.data.total === 0);
  r = await anon.req('GET', `/api/produce/${pid}`); ok('product detail', r.status === 200 && r.data.item.name === 'Tomatoes');
  r = await anon.req('GET', `/api/produce/batch?ids=${pid},9999`); ok('cart batch lookup returns only live items', r.data.items.length === 1);
  r = await anon.req('GET', '/api/farmers'); ok('farmer profiles list', r.data.items.length === 1 && r.data.items[0].listings === 1);
  r = await anon.req('GET', '/api/stats'); ok('live stats', r.data.farmers === 1 && r.data.listings === 1);

  r = await farmer.req('PUT', `/api/produce/${pid}`, form({ quantity: '60' }), true); ok('farmer edits own listing (goes back to pending)', r.status === 200);
  await admin.req('POST', `/api/admin/produce/${pid}/approve`);

  await buyer.login('b@test.co', 'Passw0rdX'); await buyer2.login('b2@test.co', 'Passw0rdX');
  r = await anon.req('POST', '/api/orders', { items: [{ id: pid, qty: 1 }] }); ok('guest cannot order', r.status === 401);
  r = await farmer.req('POST', '/api/orders', { items: [{ id: pid, qty: 1 }] }); ok('farmer cannot order', r.status === 403);
  r = await buyer.req('POST', '/api/orders', { items: [{ id: pid, qty: 999 }] }); ok('over-stock order refused', r.status === 409);
  r = await buyer.req('POST', '/api/orders', { items: [{ id: pid, qty: 10 }, { id: pid, qty: 5 }], price: 1 }); ok('buyer places order (price ignored from client)', r.status === 201);
  const oid = r.data.id;
  r = await buyer.req('GET', '/api/orders/mine'); ok('order total uses database price', r.data.orders[0].total === 1200 && r.data.orders[0].status === 'placed', JSON.stringify(r.data));
  r = await anon.req('GET', `/api/produce/${pid}`); ok('stock decreased', r.data.item.quantity === 45);
  r = await buyer.req('GET', `/api/orders/${oid}/receipt.pdf`); ok('PDF receipt', r.status === 200 && r.type.includes('pdf') && r.data.slice(0, 4).toString() === '%PDF');
  r = await buyer2.req('GET', `/api/orders/${oid}`); ok("another buyer cannot read it", r.status === 404);
  r = await farmer.req('GET', '/api/orders/farmer'); ok('farmer sees orders for their produce', r.data.rows.length === 1 && r.data.rows[0].buyer === 'Test');
  r = await buyer.req('GET', '/api/admin/overview'); ok('buyer blocked from admin API', r.status === 403);

  for (const s of ['confirmed', 'dispatched', 'delivered']) { r = await admin.req('POST', `/api/admin/orders/${oid}/advance`); ok('order -> ' + s, r.data.status === s); }
  r = await admin.req('POST', `/api/admin/orders/${oid}/advance`); ok('delivered order cannot advance', r.status === 409);
  r = await farmer.req('DELETE', `/api/produce/${pid}`); ok('listing in an order cannot be deleted', r.status === 409);

  r = await anon.req('POST', '/api/contact', { name: 'Sam', email: 'sam@x.co', message: 'Hello there, quick question.' }); ok('contact form', r.status === 201);
  r = await anon.req('POST', '/api/contact', { name: '', email: 'bad', message: 'x' }); ok('contact validation', r.status === 400);
  r = await anon.req('GET', '/api/nothing'); ok('unknown API route is JSON 404', r.status === 404 && r.data.error);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close(); await db.pool.end(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
