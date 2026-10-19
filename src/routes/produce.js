const router = require('express').Router();
const fs = require('fs');
const db = require('../../db');
const { HttpError, clean, wrap } = require('../util');
const { requireRole } = require('../security');
const { upload, looksLikeImage, removeUpload } = require('../upload');

const BASE = `SELECT p.id, p.name, p.description, p.price, p.quantity, p.photo, p.location, p.status, p.created_at,
  c.id AS category_id, c.name AS category, u.id AS farmer_id, u.full_name AS farmer
  FROM produce p JOIN categories c ON c.id = p.category_id JOIN users u ON u.id = p.farmer_id`;
const LIVE = `p.status = 'approved' AND u.status = 'approved' AND p.quantity > 0`;

router.get('/', wrap(async (req, res) => {
  const where = [LIVE], args = [];
  const add = v => { args.push(v); return '$' + args.length; };
  const like = s => '%' + s.replace(/[\\%_]/g, '\\$&') + '%';
  const q = clean(req.query.q, 60), loc = clean(req.query.location, 60), cat = parseInt(req.query.category, 10);
  if (q) where.push(`p.name ILIKE ${add(like(q))}`);
  if (loc) where.push(`p.location ILIKE ${add(like(loc))}`);
  if (cat) where.push(`p.category_id = ${add(cat)}`);
  const order = { low: 'p.price ASC', high: 'p.price DESC', stock: 'p.quantity ASC' }[req.query.sort] || 'p.created_at DESC, p.id DESC';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 60);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const w = ' WHERE ' + where.join(' AND ');
  const total = (await db.query(`SELECT COUNT(*)::int AS n FROM produce p JOIN users u ON u.id = p.farmer_id${w}`, args)).rows[0].n;
  const items = (await db.query(`${BASE}${w} ORDER BY ${order} LIMIT ${add(limit)} OFFSET ${add(offset)}`, args)).rows;
  res.json({ items, total });
}));

router.get('/mine', requireRole('farmer'), wrap(async (req, res) => {
  res.json({ items: (await db.query(`${BASE} WHERE p.farmer_id = $1 ORDER BY p.created_at DESC, p.id DESC`, [req.session.user.id])).rows });
}));

// Cart helper: current details for a list of ids (?ids=1,2,3)
router.get('/batch', wrap(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(n => parseInt(n, 10)).filter(Boolean).slice(0, 50);
  if (!ids.length) return res.json({ items: [] });
  res.json({ items: (await db.query(`${BASE} WHERE p.id = ANY($1::int[]) AND ${LIVE}`, [ids])).rows });
}));

router.get('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const p = (await db.query(`${BASE} WHERE p.id = $1 AND p.status = 'approved' AND u.status = 'approved'`, [id])).rows[0];
  if (!p) throw new HttpError(404, 'That produce is not available.');
  const related = (await db.query(`${BASE} WHERE ${LIVE} AND p.category_id = $1 AND p.id <> $2 ORDER BY p.created_at DESC LIMIT 3`, [p.category_id, p.id])).rows;
  res.json({ item: p, related });
}));

async function readBody(req) {
  const name = clean(req.body.name, 100), description = clean(req.body.description, 600), location = clean(req.body.location, 100);
  const category_id = parseInt(req.body.category_id, 10), price = Number(req.body.price);
  const qtyRaw = String(req.body.quantity ?? '').trim(), quantity = Number(qtyRaw);
  const f = {};
  if (name.length < 2) f.name = 'Enter a produce name.';
  if (!category_id || !(await db.query('SELECT 1 FROM categories WHERE id = $1', [category_id])).rowCount) f.category_id = 'Choose a category.';
  if (!(price > 0 && price <= 1000000)) f.price = 'Price must be more than 0.';
  if (!qtyRaw || !(Number.isInteger(quantity) && quantity >= 0 && quantity <= 1000000)) f.quantity = 'Quantity must be a whole number, 0 or more.';
  if (location.length < 2) f.location = 'Enter the location.';
  return { name, description, location, category_id, price, quantity, f };
}
async function requireApprovedFarmer(req) {
  const { rows } = await db.query('SELECT status FROM users WHERE id = $1', [req.session.user.id]);
  if (!rows[0] || rows[0].status !== 'approved') throw new HttpError(403, 'Your farmer account is waiting for admin approval.');
}
// Farmers may paste an Unsplash image link instead of uploading. Only images.unsplash.com photo URLs are accepted.
function unsplashUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.hostname !== 'images.unsplash.com' || !/^\/photo-[\w-]+$/.test(u.pathname)) throw 0;
    return u.origin + u.pathname; // drop the query string; the front end adds sizing
  } catch { throw new HttpError(400, 'Photo links must be an images.unsplash.com photo address.'); }
}
const dropFile = req => { if (req.file) fs.unlink(req.file.path, () => {}); };
function checkPhoto(req) {
  if (req.file && !looksLikeImage(req.file)) throw new HttpError(400, 'That file is not a real image.');
}

router.post('/', requireRole('farmer'), upload.single('photo'), wrap(async (req, res) => {
  try {
    await requireApprovedFarmer(req);
    const b = await readBody(req);
    if (Object.keys(b.f).length) { dropFile(req); return res.status(400).json({ error: 'Check the highlighted fields.', fields: b.f }); }
    checkPhoto(req);
    const photo = req.file ? '/uploads/' + req.file.filename : unsplashUrl(req.body.photo_url);
    const r = await db.query('INSERT INTO produce (farmer_id,category_id,name,description,price,quantity,photo,location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [req.session.user.id, b.category_id, b.name, b.description, b.price, b.quantity, photo, b.location]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { dropFile(req); throw e; }
}));

router.put('/:id', requireRole('farmer'), upload.single('photo'), wrap(async (req, res) => {
  try {
    await requireApprovedFarmer(req);
    const id = parseInt(req.params.id, 10) || 0;
    const row = (await db.query('SELECT photo FROM produce WHERE id = $1 AND farmer_id = $2', [id, req.session.user.id])).rows[0];
    if (!row) throw new HttpError(404, 'Listing not found.');
    const b = await readBody(req);
    if (Object.keys(b.f).length) { dropFile(req); return res.status(400).json({ error: 'Check the highlighted fields.', fields: b.f }); }
    checkPhoto(req);
    const link = unsplashUrl(req.body.photo_url);
    const photo = req.file ? '/uploads/' + req.file.filename : (link || row.photo);
    // Any edit sends the listing back for admin approval.
    await db.query(`UPDATE produce SET category_id=$1, name=$2, description=$3, price=$4, quantity=$5, location=$6, photo=$7, status='pending' WHERE id=$8 AND farmer_id=$9`,
      [b.category_id, b.name, b.description, b.price, b.quantity, b.location, photo, id, req.session.user.id]);
    if (photo !== row.photo) removeUpload(row.photo); // only deletes files we stored ourselves
    res.json({ ok: true });
  } catch (e) { dropFile(req); throw e; }
}));

router.delete('/:id', requireRole('farmer', 'admin'), wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0, u = req.session.user;
  const row = (u.role === 'admin'
    ? await db.query('SELECT photo FROM produce WHERE id = $1', [id])
    : await db.query('SELECT photo FROM produce WHERE id = $1 AND farmer_id = $2', [id, u.id])).rows[0];
  if (!row) throw new HttpError(404, 'Listing not found.');
  try { await db.query('DELETE FROM produce WHERE id = $1', [id]); }
  catch (e) {
    if (e.code === '23503') throw new HttpError(409, 'This produce is part of an order and cannot be removed. Set its quantity to 0 instead.');
    throw e;
  }
  removeUpload(row.photo);
  res.json({ ok: true });
}));
module.exports = router;
