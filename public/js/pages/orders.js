import { $, api, esc, money, fdatetime, icon, mountLayout, requireRole } from '/js/core.js';
if (!(await requireRole('buyer'))) throw new Error('redirect');
await mountLayout('orders');
const root = $('#ordersRoot'), STEPS = ['placed', 'confirmed', 'dispatched', 'delivered'];
let last = '';

function draw(orders) {
  if (!orders.length) { root.innerHTML = `<div class="empty">${icon('box')}<h2>No orders yet.</h2><p class="muted">Your first one is a few clicks away.</p><a class="btn" href="/catalogue">Browse produce</a></div>`; return; }
  root.innerHTML = orders.map(o => {
    const at = STEPS.indexOf(o.status);
    return `<div class="order"><div class="order-h"><div><b>Order #${o.id}</b><div class="muted small">${fdatetime(o.created_at)}</div></div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="pill ${o.status}">${o.status}</span><b>${money(o.total)}</b></div></div>
      <div class="order-b"><div class="timeline">${STEPS.map((s, i) => `<div class="${i <= at ? 'done' : ''} ${i === at ? 'now' : ''}">${s[0].toUpperCase() + s.slice(1)}</div>`).join('')}</div>
      <div class="info-list" style="margin-bottom:18px">${o.items.map(i => `<div><span>${i.quantity} x ${esc(i.name)} <span class="dim">by ${esc(i.farmer)}</span></span><b>${money(i.quantity * i.unit_price)}</b></div>`).join('')}</div>
      <div class="actions" style="justify-content:flex-start"><a class="btn ghost sm" href="/receipt?id=${o.id}">${icon('file')}View receipt</a><a class="btn ghost sm" href="/api/orders/${o.id}/receipt.pdf">${icon('dl')}PDF</a></div></div></div>`;
  }).join('');
}
async function load() {
  try { const { orders } = await api('/orders/mine'); const s = JSON.stringify(orders); if (s !== last) { last = s; draw(orders); } }
  catch (e) { root.innerHTML = `<p class="alert bad">${esc(e.message)}</p>`; }
}
await load();
setInterval(() => { if (!document.hidden) load(); }, 20000); // picks up status changes without a refresh
