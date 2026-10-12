// Demo data so the site is not empty on first run:  npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const photos = require('./seed-photos.json');
const db = require('./db');

const farmers = [
  ['Mary Wanjiru', 'mary@cropdrop.local', '0711000001'], ['Peter Kamau', 'peter@cropdrop.local', '0711000002'],
  ['John Kiprop', 'john@cropdrop.local', '0711000003'], ['Grace Mutua', 'grace@cropdrop.local', '0711000004'],
  ['Samuel Otieno', 'samuel@cropdrop.local', '0711000005'], ['Jane Njeri', 'jane@cropdrop.local', '0711000006'],
];
// [farmer index, category, name, slug, price, qty, location, description]
const produce = [
  [0, 'Vegetables', 'Tomatoes', 'tomatoes', 80, 120, 'Nakuru', 'Ripe red tomatoes, picked the morning they ship. Priced per kg.'],
  [1, 'Vegetables', 'Kale (sukuma wiki)', 'kale', 30, 200, 'Kiambu', 'Washed and tied bunches. Priced per bunch.'],
  [2, 'Cereals', 'Maize', 'maize', 55, 900, 'Eldoret', 'Dry maize, sorted and bagged. Priced per kg.'],
  [3, 'Fruits', 'Mangoes', 'mangoes', 120, 150, 'Machakos', 'Sweet apple mangoes. Priced per kg.'],
  [4, 'Poultry and eggs', 'Eggs (tray of 30)', 'eggs', 420, 60, 'Thika', 'Free-range eggs, collected daily.'],
  [5, 'Dairy', 'Fresh milk', 'milk', 65, 300, 'Nyeri', 'Raw milk, delivered chilled. Priced per litre.'],
  [2, 'Legumes', 'Green grams (ndengu)', 'green-grams', 150, 250, 'Eldoret', 'Cleaned green grams. Priced per kg.'],
  [0, 'Vegetables', 'Red onions', 'onions', 90, 400, 'Nakuru', 'Dry, firm red onions. Priced per kg.'],
  [3, 'Fruits', 'Bananas', 'bananas', 60, 180, 'Machakos', 'Sweet bananas sold per bunch.'],
  [1, 'Legumes', 'Rosecoco beans', 'beans', 140, 350, 'Kiambu', 'Cleaned rosecoco beans. Priced per kg.'],
  [5, 'Cereals', 'Wheat flour (2 kg)', 'wheat-flour', 130, 80, 'Nyeri', 'Stone-ground wheat flour, 2 kg packs.'],
  [4, 'Poultry and eggs', 'Free-range chicken', 'chicken', 650, 40, 'Thika', 'Free-range chicken, ready to cook. Price per bird.'],
];

(async () => {
  await db.init();
  const ids = [];
  for (const [name, email, phone] of farmers) {
    const ex = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (ex.rowCount) { ids.push(ex.rows[0].id); continue; }
    const r = await db.query("INSERT INTO users (full_name,email,password_hash,phone,role,status) VALUES ($1,$2,$3,$4,'farmer','approved') RETURNING id",
      [name, email, await bcrypt.hash('Farmer@1234', 12), phone]);
    ids.push(r.rows[0].id);
  }
  if (!(await db.query("SELECT 1 FROM users WHERE email = 'buyer@cropdrop.local'")).rowCount)
    await db.query("INSERT INTO users (full_name,email,password_hash,phone,role,status) VALUES ('Demo Buyer','buyer@cropdrop.local',$1,'0722000001','buyer','approved')", [await bcrypt.hash('Buyer@1234', 12)]);

  let added = 0;
  for (const [fi, cat, name, slug, price, qty, loc, desc] of produce) {
    const photo = (photos[slug] || '').split('?')[0] || (fs.existsSync(path.join(__dirname, 'public', 'img', 'products', slug + '.jpg')) ? `/img/products/${slug}.jpg` : null);
    if ((await db.query('SELECT 1 FROM produce WHERE name = $1 AND farmer_id = $2', [name, ids[fi]])).rowCount) {
      if (photo) await db.query("UPDATE produce SET photo = $1 WHERE name = $2 AND farmer_id = $3 AND (photo IS NULL OR photo NOT LIKE '/uploads/%')", [photo, name, ids[fi]]);
      continue;
    }
    const c = (await db.query('SELECT id FROM categories WHERE name = $1', [cat])).rows[0];
    await db.query("INSERT INTO produce (farmer_id,category_id,name,description,price,quantity,photo,location,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved')",
      [ids[fi], c.id, name, desc, price, qty, photo, loc]);
    added++;
  }
  console.log(`Seed done. ${added} produce added.\nFarmers: mary@cropdrop.local ... (password Farmer@1234)\nBuyer: buyer@cropdrop.local (password Buyer@1234)`);
  await db.pool.end();
})().catch(e => { console.error(e); process.exit(1); });
