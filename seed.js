// Demo data so the site is not empty on first run: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const photos = require('./seed-photos.json');
const db = require('./db');

const farmers = [
  ['Rashid "Dockside" Omwamba', 'rashid@cropdrop.local', '0711000001'], 
  ['Aketch "The Delta" Onyango', 'aketch@cropdrop.local', '0711000002'],
  ['Mutugi "Meru Prime" Karimi', 'mutugi@cropdrop.local', '0711000003'], 
  ['Kipkorir "Lakebed" Rutto', 'kipkorir@cropdrop.local', '0711000004'],
  ['Mogaka "The Basin" Nyabuto', 'mogaka@cropdrop.local', '0711000005'], 
  ['Wanyama "The Plateau" Barasa', 'wanyama@cropdrop.local', '0711000006'],
];

// [farmer index, category, name, slug, price, qty, location, description]
const produce = [
  [0, 'Vegetables', 'Tomatoes', 'tomatoes', 80, 120, 'Mombasa // Port Gate 04', 'Ripe red tomatoes, rushed straight from coastal transit. Priced per kg.'],
  [1, 'Vegetables', 'Kale (sukuma wiki)', 'kale', 30, 200, 'Kisumu // Lakeside Basin', 'Freshly harvested lake-basin greens. Priced per bunch.'],
  [2, 'Cereals', 'Maize', 'maize', 55, 900, 'Meru // Volcanic Slopes', 'High-altitude volcanic-soil maize, bagged and sealed. Priced per kg.'],
  [3, 'Fruits', 'Mangoes', 'mangoes', 120, 150, 'Naivasha // Rift Geothermal', 'Sun-ripened Rift Valley mangoes. Priced per kg.'],
  [4, 'Poultry and eggs', 'Eggs (tray of 30)', 'eggs', 420, 60, 'Kisii // Highland Terrace', 'Free-range highland eggs, gathered daily.'],
  [5, 'Dairy', 'Fresh milk', 'milk', 65, 300, 'Nanyuki // Frontier Outpost', 'Raw mountain-chilled milk. Priced per litre.'],
  [2, 'Legumes', 'Green grams (ndengu)', 'green-grams', 150, 250, 'Meru // Volcanic Slopes', 'Sorted volcanic-slope green grams. Priced per kg.'],
  [0, 'Vegetables', 'Red onions', 'onions', 90, 400, 'Mombasa // Port Gate 04', 'Dry, firm coastal-grade red onions. Priced per kg.'],
  [3, 'Fruits', 'Bananas', 'bananas', 60, 180, 'Naivasha // Rift Geothermal', 'Valley-harvested sweet bananas sold per bunch.'],
  [1, 'Legumes', 'Rosecoco beans', 'beans', 140, 350, 'Kisumu // Lakeside Basin', 'Cleaned lakeside rosecoco beans. Priced per kg.'],
  [5, 'Cereals', 'Wheat flour (2 kg)', 'wheat-flour', 130, 80, 'Nanyuki // Frontier Outpost', 'Frontier stone-ground wheat flour, 2 kg packs.'],
  [4, 'Poultry and eggs', 'Free-range chicken', 'chicken', 650, 40, 'Kisii // Highland Terrace', 'Free-range highland chicken, ready to dispatch. Price per bird.'],
];

(async () => {
  await db.init();
  
  // Clean out all old demo produce and users to prevent duplicates
  console.log('Purging old ledger entries...');
  await db.query("DELETE FROM produce WHERE farmer_id IN (SELECT id FROM users WHERE email LIKE '%@cropdrop.local')");
  await db.query("DELETE FROM users WHERE email LIKE '%@cropdrop.local'");

  const ids = [];
  for (const [name, email, phone] of farmers) {
    const r = await db.query("INSERT INTO users (full_name,email,password_hash,phone,role,status) VALUES ($1,$2,$3,$4,'farmer','approved') RETURNING id",
      [name, email, await bcrypt.hash('Farmer@1234', 12), phone]);
    ids.push(r.rows[0].id);
  }

  // Re-add demo buyer
  await db.query("INSERT INTO users (full_name,email,password_hash,phone,role,status) VALUES ('Demo Buyer','buyer@cropdrop.local',$1,'0722000001','buyer','approved')", [await bcrypt.hash('Buyer@1234', 12)]);

  let added = 0;
  for (const [fi, cat, name, slug, price, qty, loc, desc] of produce) {
    const photo = (photos[slug] || '').split('?')[0] || (fs.existsSync(path.join(__dirname, 'public', 'img', 'products', slug + '.jpg')) ? `/img/products/${slug}.jpg` : null);
    const c = (await db.query('SELECT id FROM categories WHERE name = $1', [cat])).rows[0];
    
    await db.query("INSERT INTO produce (farmer_id,category_id,name,description,price,quantity,photo,location,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved')",
      [ids[fi], c.id, name, desc, price, qty, photo, loc]);
    added++;
  }
  
  console.log(`Database sanitized. Exactly ${added} clean syndicate entries loaded.`);
  await db.pool.end();
})().catch(e => { console.error(e); process.exit(1); });