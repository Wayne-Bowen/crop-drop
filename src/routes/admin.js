const router = require('express').Router();
const db = require('../../db');
const { HttpError, wrap } = require('../util');
const { requireRole } = require('../security');

router.use(requireRole('admin'));
const FLOW = { placed: 'confirmed', confirmed: 'dispatched', dispatched: 'delivered' };
const idOf = req => parseInt(req.params.id, 10) || 0;

router.get('/overview', wrap(async (req, res) => {
  const q = async (sql) => (await db.query(sql)).rows;
  res.json({
    farmers: await q("SELECT id, full_name, email, phone, created_at FROM users WHERE role='farmer' AND status='pending' ORDER BY id"),
    listings: await q(`SELECT p.id, p.name, p.price, p.quantity, p.location, p.photo, u.full_name AS farmer, c.name AS category
      FROM produce p JOIN users u ON u.id = p.farmer_id JOIN categories c ON c.id = p.category_id WHERE p.status='pending' ORDER BY p.id`),
    orders: await q('SELECT o.id, o.total, o.status, o.created_at, b.full_name AS buyer FROM orders o JOIN users b ON b.id = o.buyer_id ORDER BY o.id DESC LIMIT 100'),
    messages: await q('SELECT id, name, email, message, created_at FROM messages ORDER BY id DESC LIMIT 30'),
  });
}));
router.post('/farmers/:id/approve', wrap(async (req, res) => {
  const r = await db.query("UPDATE users SET status='approved' WHERE id = $1 AND role='farmer'", [idOf(req)]);
  if (!r.rowCount) throw new HttpError(404, 'Farmer not found.');
  res.json({ ok: true });
}));
router.post('/produce/:id/approve', wrap(async (req, res) => {
  const r = await db.query("UPDATE produce SET status='approved' WHERE id = $1", [idOf(req)]);
  if (!r.rowCount) throw new HttpError(404, 'Listing not found.');
  res.json({ ok: true });
}));
router.post('/orders/:id/advance', wrap(async (req, res) => {
  const o = (await db.query('SELECT status FROM orders WHERE id = $1', [idOf(req)])).rows[0];
  if (!o) throw new HttpError(404, 'Order not found.');
  if (!FLOW[o.status]) throw new HttpError(409, 'That order is already delivered.');
  await db.query('UPDATE orders SET status = $1 WHERE id = $2', [FLOW[o.status], idOf(req)]);
  res.json({ status: FLOW[o.status] });
}));
module.exports = router;
