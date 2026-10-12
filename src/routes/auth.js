const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../../db');
const { HttpError, clean, isEmail, isPhone, strongPw, wrap } = require('../util');
const { csrfToken } = require('../security');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 1000 : 10, standardHeaders: true, legacyHeaders: false,
  handler: (req, res, next) => next(new HttpError(429, 'Too many login attempts. Try again in 15 minutes.')) });
const DUMMY = bcrypt.hashSync('not-a-real-password', 12); // keeps timing the same for unknown emails
const publicUser = u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, status: u.status });

router.get('/csrf', (req, res) => res.json({ token: csrfToken(req) }));

router.get('/me', wrap(async (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  const { rows } = await db.query('SELECT id, full_name, email, role, status FROM users WHERE id = $1', [req.session.user.id]);
  res.json({ user: rows[0] || null });
}));

router.post('/register', wrap(async (req, res) => {
  const full_name = clean(req.body.full_name, 100), email = clean(req.body.email, 150).toLowerCase();
  const phone = clean(req.body.phone, 20), role = clean(req.body.role, 10), password = req.body.password;
  const errors = {};
  if (full_name.length < 2) errors.full_name = 'Enter your full name.';
  if (!isEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isPhone(phone)) errors.phone = 'Use a Kenyan number like 0712345678.';
  if (!['farmer', 'buyer'].includes(role)) errors.role = 'Choose farmer or buyer.'; // admin can never self-register
  if (!strongPw(password)) errors.password = 'Use 8+ characters with at least one letter and one number.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });

  const hash = await bcrypt.hash(password, 12);
  const status = role === 'farmer' ? 'pending' : 'approved';
  try {
    await db.query('INSERT INTO users (full_name,email,password_hash,phone,role,status) VALUES ($1,$2,$3,$4,$5,$6)', [full_name, email, hash, phone, role, status]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That email is already registered.', fields: { email: 'Already registered.' } });
    throw e;
  }
  res.status(201).json({ ok: true, status });
}));

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const email = clean(req.body.email, 150).toLowerCase(), password = String(req.body.password ?? '');
  const { rows } = await db.query('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const u = rows[0];
  const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY);
  if (!u || !ok) throw new HttpError(401, 'Incorrect email or password.');
  await new Promise((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve())); // stops session fixation
  req.session.user = { id: u.id, role: u.role };
  res.json({ user: publicUser(u) });
}));

router.post('/logout', (req, res) => req.session.destroy(() => { res.clearCookie('cd.sid'); res.json({ ok: true }); }));
module.exports = router;
