const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const db = require('../../db');
const { HttpError, clean, isEmail, wrap } = require('../util');

const LIVE = `p.status = 'approved' AND u.status = 'approved' AND p.quantity > 0`;
const contactLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 1000 : 5, standardHeaders: true, legacyHeaders: false,
  handler: (req, res, next) => next(new HttpError(429, 'Too many messages. Try again later.')) });

// Used by the host's health check and by monitoring.
router.get('/health', wrap(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true, db: 'up', uptime: Math.round(process.uptime()) });
}));

router.get('/categories', wrap(async (req, res) => res.json({ items: (await db.query('SELECT id, name FROM categories ORDER BY name')).rows })));

router.get('/stats', wrap(async (req, res) => {
  const n = async sql => (await db.query(sql)).rows[0].n;
  res.json({
    farmers: await n("SELECT COUNT(*)::int n FROM users WHERE role='farmer' AND status='approved'"),
    listings: await n(`SELECT COUNT(*)::int n FROM produce p JOIN users u ON u.id = p.farmer_id WHERE ${LIVE}`),
    orders: await n('SELECT COUNT(*)::int n FROM orders'),
    delivered: await n("SELECT COUNT(*)::int n FROM orders WHERE status='delivered'"),
  });
}));

router.get('/farmers', wrap(async (req, res) => {
  const items = (await db.query(`SELECT u.id, u.full_name, u.created_at, COUNT(p.id)::int AS listings, STRING_AGG(DISTINCT p.location, ', ') AS locations
    FROM users u LEFT JOIN produce p ON p.farmer_id = u.id AND p.status='approved' AND p.quantity > 0
    WHERE u.role='farmer' AND u.status='approved' GROUP BY u.id ORDER BY listings DESC, u.full_name`)).rows;
  res.json({ items });
}));
router.get('/farmers/:id', wrap(async (req, res) => {
  const f = (await db.query("SELECT id, full_name, created_at FROM users WHERE id = $1 AND role='farmer' AND status='approved'", [parseInt(req.params.id, 10) || 0])).rows[0];
  if (!f) throw new HttpError(404, 'Farmer not found.');
  const items = (await db.query(`SELECT p.id, p.name, p.price, p.quantity, p.photo, p.location, c.name AS category
    FROM produce p JOIN categories c ON c.id = p.category_id WHERE p.farmer_id = $1 AND p.status='approved' AND p.quantity > 0 ORDER BY p.id DESC`, [f.id])).rows;
  res.json({ farmer: f, items });
}));

router.post('/contact', contactLimiter, wrap(async (req, res) => {
  const name = clean(req.body.name, 100), email = clean(req.body.email, 150), message = clean(req.body.message, 1000);
  const f = {};
  if (name.length < 2) f.name = 'Enter your name.';
  if (!isEmail(email)) f.email = 'Enter a valid email address.';
  if (message.length < 10) f.message = 'Write at least 10 characters.';
  if (Object.keys(f).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields: f });
  await db.query('INSERT INTO messages (name,email,message) VALUES ($1,$2,$3)', [name, email, message]);
  res.status(201).json({ ok: true });
}));
module.exports = router;
