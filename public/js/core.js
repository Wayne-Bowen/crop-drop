// Shared helpers: API client, auth state, cart, layout, toasts, animations.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => 'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const fdate = d => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
export const fdatetime = d => new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------- icons ---------- */
const I = {
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  print: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
};
export const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;

const G = {
  Vegetables: '<path d="M8 40C8 20 20 10 40 8c0 20-10 32-30 32z"/><path d="M8 40L26 22"/>',
  Fruits: '<circle cx="24" cy="28" r="14"/><path d="M24 14c0-5 3-8 8-9"/>',
  Cereals: '<path d="M24 44V14"/><path d="M24 14c-5-1-8-4-8-9 5 0 8 3 8 9zM24 14c5-1 8-4 8-9-5 0-8 3-8 9zM24 26c-5-1-8-4-8-9 5 0 8 3 8 9zM24 26c5-1 8-4 8-9-5 0-8 3-8 9zM24 38c-5-1-8-4-8-9 5 0 8 3 8 9zM24 38c5-1 8-4 8-9-5 0-8 3-8 9z"/>',
  Dairy: '<path d="M19 6h10v8l5 8v20H14V22l5-8z"/><path d="M14 28h20"/>',
  'Poultry and eggs': '<path d="M24 6c8 0 14 12 14 22a14 14 0 0 1-28 0C10 18 16 6 24 6z"/>',
  Legumes: '<path d="M10 38C6 24 18 8 40 8 38 30 24 42 10 38z"/><circle cx="20" cy="26" r="2.5"/><circle cx="27" cy="20" r="2.5"/><circle cx="32" cy="13" r="2"/>',
};
export const glyph = (cat, cls = '') => `<svg class="${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[cat] || G.Vegetables}</svg>`;
export const LOGO = '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 5C30 5 12 25 12 37A18 18 0 0 0 48 37C48 25 30 5 30 5Z" fill="#f04e30"/><path d="M30 46V31" stroke="#1a1816" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M30 38C24 38 21 34 21 29C26 29 30 32 30 38Z" fill="#1a1816"/><path d="M30 34C30 29 33 26 38 26C38 31 35 34 30 34Z" fill="#1a1816"/></svg>';

/* ---------- api ---------- */
let csrf = null;
async function token(force) {
  if (!csrf || force) csrf = (await (await fetch('/api/auth/csrf')).json()).token;
  return csrf;
}
export function resetToken() { csrf = null; }
export async function api(path, { method = 'GET', body, form } = {}, retry = true) {
  const headers = {};
  if (method !== 'GET') headers['x-csrf-token'] = await token();
  let payload;
  if (form) payload = form; else if (body) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch('/api' + path, { method, headers, body: payload });
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json() : null;
  if (res.status === 403 && retry && data && /token/i.test(data.error || '')) { await token(true); return api(path, { method, body, form }, false); }
  if (!res.ok) { const e = new Error((data && data.error) || 'Request failed.'); e.status = res.status; e.fields = data && data.fields; throw e; }
  return data;
}

/* ---------- auth ---------- */
let _user;
export async function me() {
  if (_user === undefined) { try { _user = (await api('/auth/me')).user; } catch { _user = null; } }
  return _user;
}
export async function requireRole(...roles) {
  const u = await me();
  if (!u) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); return null; }
  if (!roles.includes(u.role)) { location.href = '/'; return null; }
  return u;
}

/* ---------- cart (browser storage; prices are always re-read on the server) ---------- */
export const getCart = () => { try { return JSON.parse(localStorage.getItem('cd_cart')) || {}; } catch { return {}; } };
export const setCart = c => { localStorage.setItem('cd_cart', JSON.stringify(c)); refreshCount(true); };
export const cartCount = () => Object.values(getCart()).reduce((a, b) => a + b, 0);
function refreshCount(bump) {
  $$('.cart-count').forEach(el => { el.textContent = cartCount(); if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } });
}
export async function addToCart(id, qty, max, from) {
  const u = await me();
  if (u && u.role !== 'buyer') return toast(u.role === 'farmer' ? 'Farmer accounts list produce. Use a buyer account to order.' : 'Admin accounts can\'t place orders.');
  const cart = getCart(), have = cart[id] || 0;
  if (have >= max) return toast(`You already have all ${max} in your cart.`);
  cart[id] = Math.min(have + qty, max);
  setCart(cart);
  toast(cart[id] === max && have + qty > max ? `Only ${max} available. Cart set to the maximum.` : 'Added to cart.', 'ok');
  if (from) fly(from);
}
function fly(from) {
  const to = $('.cart-btn'); if (!to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = LOGO.replace('<svg', '<svg width="18" height="18"');
  el.style.left = a.left + a.width / 2 - 9 + 'px'; el.style.top = a.top + a.height / 2 - 9 + 'px';
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - a.left - a.width / 2, dy = b.top + b.height / 2 - a.top - a.height / 2;
  el.animate([{ transform: 'translate(0,0) scale(1.4)', opacity: 1 }, { transform: `translate(${dx * .5}px,${dy * .5 - 60}px) scale(1)`, opacity: 1, offset: .5 }, { transform: `translate(${dx}px,${dy}px) scale(.4)`, opacity: .2 }], { duration: 700, easing: 'cubic-bezier(.5,0,.7,1)' }).onfinish = () => el.remove();
}

/* ---------- toasts ---------- */
export function toast(msg, type = '') {
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

/* ---------- layout ---------- */
export async function mountLayout(active = '') {
  document.body.insertAdjacentHTML('afterbegin', '<div class="topbar"></div>');
  const u = await me();
  const L = (href, label, key) => `<a href="${href}" class="${active === key ? 'on' : ''}">${label}</a>`;
  const showCart = !u || u.role === 'buyer';
  $('#header').innerHTML = `<div class="wrap nav">
    <a class="logo" href="/" aria-label="CropDrop home">${LOGO}<span>Crop<b>Drop</b></span></a>
    <button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">${icon('menu')}</button>
    <nav class="nav-links" id="navLinks">
      ${L('/catalogue', 'Market', 'market')}${L('/farmers', 'Farmers', 'farmers')}${L('/about', 'About', 'about')}${L('/contact', 'Contact', 'contact')}
      ${u && u.role === 'farmer' ? L('/dashboard', 'My listings', 'dash') : ''}${u && u.role === 'buyer' ? L('/orders', 'My orders', 'orders') : ''}${u && u.role === 'admin' ? L('/admin', 'Admin', 'admin') : ''}
      ${u ? '<a href="#" id="logout">Log out</a>' : L('/login', 'Log in', 'login')}
      ${showCart ? `<a href="/cart" class="cart-btn">${icon('cart')}<span>Cart</span><span class="cart-count">${cartCount()}</span></a>` : ''}
    </nav></div>`;
  $('#footer').innerHTML = `<div class="wrap"><div class="foot">
    <div><a class="logo" href="/">${LOGO}<span>Crop<b>Drop</b></span></a><p class="muted small" style="margin-top:14px;max-width:26em">Farmers list it. You buy it. Built in Kenya, no middlemen were consulted.</p></div>
    <div><h4>Shop</h4><a href="/catalogue">The market</a><a href="/farmers">Farmers</a><a href="/cart">Cart</a></div>
    <div><h4>Company</h4><a href="/about">About</a><a href="/contact">Contact</a><a href="/login#register">Sell as a farmer</a></div>
    <div><h4>Account</h4><a href="/login">Log in</a><a href="/orders">My orders</a></div>
  </div><div class="foot-b"><span>&copy; ${new Date().getFullYear()} CropDrop</span><span>info@cropdrop.example | +254 700 000 000</span></div></div>`;
  $('#menuBtn').addEventListener('click', e => { const o = $('#navLinks').classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); });
  const lo = $('#logout');
  if (lo) lo.addEventListener('click', async e => { e.preventDefault(); await api('/auth/logout', { method: 'POST' }); resetToken(); localStorage.removeItem('cd_cart'); location.href = '/'; });
  initFx();
  return u;
}

/* ---------- animation helpers ---------- */
let io;
export function reveal(root = document) {
  if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.rv:not(.in)', root).forEach(el => io.observe(el));
}
function initFx() {
  reveal();
  // soft red glow that follows the cursor on cards
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.card'); if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    e.preventDefault(); addToCart(+b.dataset.add, 1, +b.dataset.max, b);
  });
}
export function countUp(el, to, ms = 1200) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !to) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = t => { const p = Math.min((t - t0) / ms, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/* ---------- product card ---------- */
export function media(p, cls = '') {
  return p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy" data-cat="${esc(p.category)}">` : glyph(p.category, cls);
}
// If a photo file is missing, swap in the category glyph instead of a broken image.
document.addEventListener('error', e => {
  const t = e.target; if (t.tagName === 'IMG' && t.dataset.cat) { t.replaceWith(Object.assign(document.createElement('span'), { innerHTML: glyph(t.dataset.cat) }).firstChild); }
}, true);
export function productCard(p) {
  const low = p.quantity <= 20;
  return `<article class="card rv"><div class="media">${media(p)}<span class="chip">${esc(p.category)}</span></div>
    <div class="body"><h3><a href="/product?id=${p.id}">${esc(p.name)}</a></h3>
      <div class="meta">${icon('pin')}${esc(p.location)}<span class="dim">|</span>${esc(p.farmer)}</div>
      <div class="stock" aria-hidden="true"><i style="--p:${Math.min(p.quantity / 120, 1).toFixed(2)}"></i></div>
      <div class="stock-note ${low ? 'low' : ''}">${low ? `Only ${p.quantity} left` : `${p.quantity} in stock`}</div>
      <div class="row"><span class="price">${money(p.price)}</span><button class="btn sm" data-add="${p.id}" data-max="${p.quantity}">${icon('plus')}Add</button></div>
    </div></article>`;
}
export const skeletons = n => Array.from({ length: n }, () => '<div class="skel"></div>').join('');

/* ---------- forms ---------- */
export function showFieldErrors(form, fields = {}) {
  $$('.fg', form).forEach(g => { g.classList.remove('bad'); const e = $('.err', g); if (e) e.textContent = ''; });
  Object.entries(fields).forEach(([k, msg]) => {
    const inp = form.elements[k]; const g = inp && (inp.closest ? inp.closest('.fg') : inp[0] && inp[0].closest('.fg'));
    if (g) { g.classList.add('bad'); let e = $('.err', g); if (!e) { e = document.createElement('div'); e.className = 'err'; g.appendChild(e); } e.textContent = msg; }
  });
}
export const validators = {
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address.',
  phone: v => /^(\+254|0)[17]\d{8}$/.test(v) || 'Use a Kenyan number like 0712345678.',
  password: v => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use 8+ characters with at least one letter and one number.',
  required: v => v.trim().length > 0 || 'This field is required.',
};
