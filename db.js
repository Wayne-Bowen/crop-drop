require('dotenv').config();
const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

types.setTypeParser(1700, parseFloat); // NUMERIC -> number (prices, totals)

const url = process.env.DATABASE_URL || 'postgres://cropdrop:cropdrop@localhost:5432/cropdrop';
const pool = new Pool({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false, // hosted databases usually need SSL
  max: 10,
  connectionTimeoutMillis: 20000, // hosted databases can take a few seconds to wake up
  idleTimeoutMillis: 30000,
});
// Hosted databases drop idle connections. Without this handler that would crash the whole app.
pool.on('error', e => console.error('Database connection error (will reconnect):', e.message));

const query = (text, params) => pool.query(text, params);

async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Creates tables if missing, then seeds categories and the first admin.
async function init() {
  await query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  for (const c of ['Vegetables', 'Fruits', 'Cereals', 'Dairy', 'Poultry and eggs', 'Legumes']) {
    await query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [c]);
  }
  const adminEmail = (process.env.ADMIN_EMAIL || 'bowenwayne44@gmail.com').toLowerCase();
  // If an older default admin exists, move it to the configured email (keeps its password).
  await query("UPDATE users SET email = $1 WHERE role = 'admin' AND email = 'admin@cropdrop.local' AND NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = $1)", [adminEmail]);
  const { rowCount } = await query("SELECT 1 FROM users WHERE role = 'admin'");
  if (!rowCount) {
    // No password in the environment? Generate one and print it once instead of using a guessable default.
    const generated = !process.env.ADMIN_PASSWORD;
    const pass = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(9).toString('base64url');
    await query("INSERT INTO users (full_name,email,password_hash,phone,role,status) VALUES ($1,$2,$3,$4,'admin','approved')",
      ['Wayne Bowen', adminEmail, await bcrypt.hash(pass, 12), '0700000000']);
    console.log(`Admin account created for ${adminEmail}` + (generated ? `\n  Generated password (shown once, save it): ${pass}` : ''));
  }
}

module.exports = { query, tx, init, pool };
