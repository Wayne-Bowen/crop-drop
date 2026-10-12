import { $, api, esc, money, icon, me, media, mountLayout, getCart, setCart, toast } from '/js/core.js';
await mountLayout('');
const root = $('#cartRoot');
let items = [];

async function load() {
  const cart = getCart(), ids = Object.keys(cart);
  if (!ids.length) { items = []; return draw(); }
  try {
    const r = await api('/produce/batch?ids=' + ids.join(','));
    items = r.items;
    const live = new Set(items.map(p => String(p.id)));
    const gone = ids.filter(id => !live.has(id));
    if (gone.length) { gone.forEach(id => delete cart[id]); toast('An item in your cart is no longer available and was removed.'); }
    items.forEach(p => { if (cart[p.id] > p.quantity) cart[p.id] = p.quantity; });
    setCart(cart);
  } catch (e) { root.innerHTML = `<p class="alert bad" style="margin:40px 0">${esc(e.message)}</p>`; return; }
  draw();
}

function draw() {
  const cart = getCart();
  if (!items.length) {
    root.innerHTML = `<div class="empty">${icon('cart')}<h2>Your cart is empty.</h2><p class="muted">Bold strategy.</p><a class="btn" href="/catalogue">Browse produce</a></div>`;
    return;
  }
  const total = items.reduce((s, p) => s + p.price * cart[p.id], 0), count = items.reduce((s, p) => s + cart[p.id], 0);
  root.innerHTML = `<div class="cart-grid"><div class="panel">${items.map(p => `<div class="line">
      <div class="thumb">${media(p, 200)}</div>
      <div><a href="/product?id=${p.id}" style="font-weight:600;text-decoration:none">${esc(p.name)}</a><div class="meta">${esc(p.farmer)} | ${money(p.price)} each</div></div>
      <div class="ctl" style="display:flex;align-items:center;gap:14px;justify-content:flex-end;flex-wrap:wrap">
        <div class="qty"><button type="button" data-d="-1" data-id="${p.id}" aria-label="Less">-</button><input type="number" min="1" max="${p.quantity}" value="${cart[p.id]}" data-q="${p.id}" aria-label="Quantity for ${esc(p.name)}"><button type="button" data-d="1" data-id="${p.id}" aria-label="More">+</button></div>
        <b style="min-width:92px;text-align:right">${money(p.price * cart[p.id])}</b>
        <button class="btn danger sm" data-rm="${p.id}" aria-label="Remove ${esc(p.name)}">${icon('trash')}</button>
      </div></div>`).join('')}</div>
    <aside class="panel summary"><h3 style="margin-bottom:14px">Order summary</h3>
      <div class="sum"><span>Items</span><span>${count}</span></div>
      <div class="sum total"><span>Total</span><span>${money(total)}</span></div>
      <div id="oMsg" style="margin:16px 0 0"></div>
      <button class="btn" id="place" type="button" style="width:100%;margin-top:16px">Place order</button>
      <p class="muted small" style="margin-top:12px">You'll need a buyer account to place the order. Prices are confirmed at checkout.</p>
      <a class="btn ghost" href="/catalogue" style="width:100%;margin-top:12px">Keep shopping</a></aside></div>`;
}

root.addEventListener('click', async e => {
  const cart = getCart();
  const step = e.target.closest('[data-d]'), rm = e.target.closest('[data-rm]');
  if (step) { const p = items.find(x => x.id == step.dataset.id); cart[p.id] = Math.min(Math.max(cart[p.id] + +step.dataset.d, 1), p.quantity); setCart(cart); draw(); }
  if (rm) { delete cart[rm.dataset.rm]; setCart(cart); items = items.filter(x => x.id != rm.dataset.rm); draw(); }
  if (e.target.closest('#place')) {
    const btn = e.target.closest('#place'), u = await me();
    if (!u) return void (location.href = '/login?next=/cart');
    if (u.role !== 'buyer') return void ($('#oMsg').innerHTML = '<div class="alert bad">Only buyer accounts can place orders.</div>');
    btn.disabled = true; btn.textContent = 'Placing order...';
    try {
      const { id } = await api('/orders', { method: 'POST', body: { items: Object.entries(cart).map(([id, qty]) => ({ id: +id, qty })) } });
      setCart({}); location.href = '/receipt?id=' + id;
    } catch (err) { $('#oMsg').innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; btn.disabled = false; btn.textContent = 'Place order'; if (err.status === 409) load(); }
  }
});
root.addEventListener('change', e => {
  const q = e.target.closest('[data-q]'); if (!q) return;
  const p = items.find(x => x.id == q.dataset.q), cart = getCart();
  cart[p.id] = Math.min(Math.max(parseInt(q.value, 10) || 1, 1), p.quantity); setCart(cart); draw();
});
load();
