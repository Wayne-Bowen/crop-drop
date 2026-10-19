const router = require('express').Router();
const PDFDocument = require('pdfkit');
const db = require('../../db');
const { HttpError, money, wrap } = require('../util');
const { requireRole } = require('../security');

const ITEMS = `SELECT oi.produce_id, oi.quantity, oi.unit_price, p.name, f.full_name AS farmer
  FROM order_items oi JOIN produce p ON p.id = oi.produce_id JOIN users f ON f.id = p.farmer_id WHERE oi.order_id = $1 ORDER BY oi.id`;

router.post('/', requireRole('buyer'), wrap(async (req, res) => {
  const raw = Array.isArray(req.body.items) ? req.body.items : [];
  if (!raw.length || raw.length > 50) throw new HttpError(400, 'Your cart is empty.');
  const merged = new Map();
  for (const it of raw) {
    const id = parseInt(it.id, 10), qty = parseInt(it.qty, 10);
    if (!id || !qty || qty < 1 || qty > 100000) throw new HttpError(400, 'One of the cart items is invalid.');
    merged.set(id, (merged.get(id) || 0) + qty);
  }
  const ids = [...merged.keys()].sort((a, b) => a - b); // fixed lock order avoids deadlocks
  const orderId = await db.tx(async c => {
    let total = 0; const lines = [];
    for (const id of ids) {
      const qty = merged.get(id);
      const p = (await c.query(`SELECT p.id, p.name, p.price, p.quantity, p.status, u.status AS fstatus
        FROM produce p JOIN users u ON u.id = p.farmer_id WHERE p.id = $1 FOR UPDATE OF p`, [id])).rows[0];
      if (!p || p.status !== 'approved' || p.fstatus !== 'approved') throw new HttpError(409, 'An item in your cart is no longer available.');
      if (p.quantity < qty) throw new HttpError(409, `Only ${p.quantity} of ${p.name} left. Lower the quantity to continue.`);
      total += p.price * qty; lines.push({ id, qty, price: p.price }); // price comes from the database, never from the browser
    }
    const o = (await c.query('INSERT INTO orders (buyer_id, total) VALUES ($1, $2) RETURNING id', [req.session.user.id, money(total)])).rows[0];
    for (const l of lines) {
      await c.query('INSERT INTO order_items (order_id, produce_id, quantity, unit_price) VALUES ($1,$2,$3,$4)', [o.id, l.id, l.qty, l.price]);
      await c.query('UPDATE produce SET quantity = quantity - $1 WHERE id = $2', [l.qty, l.id]);
    }
    return o.id;
  });
  res.status(201).json({ id: orderId });
}));

router.get('/mine', requireRole('buyer'), wrap(async (req, res) => {
  const orders = (await db.query('SELECT id, total, status, created_at FROM orders WHERE buyer_id = $1 ORDER BY id DESC', [req.session.user.id])).rows;
  for (const o of orders) o.items = (await db.query(ITEMS, [o.id])).rows;
  res.json({ orders });
}));

router.get('/farmer', requireRole('farmer'), wrap(async (req, res) => {
  const rows = (await db.query(`SELECT o.id AS order_id, o.status, o.created_at, oi.quantity, oi.unit_price, p.name, split_part(b.full_name, ' ', 1) AS buyer
    FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN produce p ON p.id = oi.produce_id JOIN users b ON b.id = o.buyer_id
    WHERE p.farmer_id = $1 ORDER BY o.id DESC LIMIT 100`, [req.session.user.id])).rows;
  res.json({ rows });
}));

async function loadOrder(req) {
  const o = (await db.query('SELECT o.*, b.full_name, b.email, b.phone FROM orders o JOIN users b ON b.id = o.buyer_id WHERE o.id = $1', [parseInt(req.params.id, 10) || 0])).rows[0];
  const u = req.session.user;
  if (!o || (u.role === 'buyer' && o.buyer_id !== u.id)) throw new HttpError(404, 'Order not found.');
  o.items = (await db.query(ITEMS, [o.id])).rows;
  return o;
}
router.get('/:id', requireRole('buyer', 'admin'), wrap(async (req, res) => res.json({ order: await loadOrder(req) })));

router.get('/:id/receipt.pdf', requireRole('buyer', 'admin'), wrap(async (req, res) => {
  const o = await loadOrder(req);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cropdrop-order-${o.id}.pdf"`);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);
  const kes = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.fontSize(24).fillColor('#1a1816').text('Crop', { continued: true }).fillColor('#f04e30').text('Drop', { continued: true }).fillColor('#1a1816').text('  receipt');
  doc.moveDown(.5).fontSize(10).fillColor('#555').text(`Order #${o.id}   |   ${new Date(o.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC   |   Status: ${o.status}`);
  doc.moveDown().fillColor('#1a1816').fontSize(11).text(`Buyer: ${o.full_name}`).text(`${o.email}   ${o.phone}`);
  doc.moveDown();
  const col = [50, 250, 380, 430, 500]; let y = doc.y;
  doc.fontSize(10).fillColor('#f04e30');
  ['Item', 'Farmer', 'Qty', 'Price', 'Subtotal'].forEach((h, i) => doc.text(h, col[i], y, { width: i === 0 ? 190 : i === 1 ? 120 : 70 }));
  doc.moveTo(50, y + 16).lineTo(545, y + 16).strokeColor('#cccccc').stroke();
  y += 24; doc.fillColor('#1a1816');
  o.items.forEach(it => {
    doc.text(it.name, col[0], y, { width: 190 }).text(it.farmer, col[1], y, { width: 120 }).text(String(it.quantity), col[2], y, { width: 40 })
      .text(kes(it.unit_price), col[3] - 20, y, { width: 90 }).text(kes(it.quantity * it.unit_price), col[4] - 20, y, { width: 75 });
    y += 22;
  });
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
  doc.fontSize(13).text(`Total: ${kes(o.total)}`, 50, y + 12, { width: 495, align: 'right' });
  doc.fontSize(9).fillColor('#777').text('Thank you for buying direct from the farm.', 50, y + 60);
  doc.end();
}));
module.exports = router;
