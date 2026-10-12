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
});

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
  const { rowCount } = await query("SELECT 1 FROM users WHERE role = 'admin'");
  if (!rowCount) {
    const email = process.env.ADMIN_EMAIL || 'admin@cropdrop.local';
    const pass = process.env.ADMIN_PASSWORD || 'Admin@1234';
    await query("INSERT INTO users (full_name,email,password_hash,phone,role,status) VALUES ($1,$2,$3,$4,'admin','approved')",
      ['CropDrop Admin', email, await bcrypt.hash(pass, 12), '0700000000']);
    console.log(`Admin created: ${email}  (set ADMIN_PASSWORD in .env, then change it after first login)`);
  }
}

module.exports = { query, tx, init, pool };
