import { $, $$, api, esc, money, fdate, fdatetime, icon, media, mountLayout, requireRole, toast } from '/js/core.js';
if (!(await requireRole('admin'))) throw new Error('redirect');
await mountLayout('admin');

let data = { farmers: [], listings: [], orders: [], messages: [] }, tab = 'farmers';
const NEXT = { placed: 'confirmed', confirmed: 'dispatched', dispatched: 'delivered' };

async function load() { data = await api('/admin/overview'); draw(); }
function draw() {
  const open = data.orders.filter(o => o.status !== 'delivered').length;
  $('#stats').innerHTML = [[data.farmers.length, 'Farmers to approve'], [data.listings.length, 'Listings to approve'], [open, 'Open orders'], [data.messages.length, 'Messages']]
    .map(([n, l]) => `<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
  $('#dtabs').innerHTML = [['farmers', 'Farmers', data.farmers.length], ['listings', 'Listings', data.listings.length], ['orders', 'Orders', open], ['messages', 'Messages', data.messages.length]]
    .map(([k, l, n]) => `<button class="dtab ${tab === k ? 'on' : ''}" data-t="${k}">${l}${n ? `<em>${n}</em>` : ''}</button>`).join('');
  const empty = (ic, t) => `<div class="empty">${icon(ic)}<h2>${t}</h2></div>`;
  const pane = $('#pane');
  if (tab === 'farmers') pane.innerHTML = data.farmers.length ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th></th></tr></thead><tbody>
    ${data.farmers.map(f => `<tr><td><b>${esc(f.full_name)}</b></td><td>${esc(f.email)}</td><td>${esc(f.phone)}</td><td>${fdate(f.created_at)}</td><td class="r"><button class="btn sm" data-af="${f.id}">${icon('check')}Approve</button></td></tr>`).join('')}</tbody></table></div>` : empty('shield', 'No farmers waiting.');
  if (tab === 'listings') pane.innerHTML = data.listings.length ? `<div class="table-wrap"><table><thead><tr><th>Produce</th><th>Farmer</th><th>Category</th><th class="r">Price</th><th class="r">Qty</th><th></th></tr></thead><tbody>
    ${data.listings.map(l => `<tr><td><div class="cell"><div class="thumb">${media(l, 200)}</div><div><b>${esc(l.name)}</b><div class="muted small">${esc(l.location)}</div></div></div></td><td>${esc(l.farmer)}</td><td>${esc(l.category)}</td><td class="r">${money(l.price)}</td><td class="r">${l.quantity}</td>
    <td><div class="actions"><button class="btn sm" data-al="${l.id}">${icon('check')}Approve</button><button class="btn danger sm" data-rl="${l.id}">Reject</button></div></td></tr>`).join('')}</tbody></table></div>` : empty('shield', 'No listings waiting.');
  if (tab === 'orders') pane.innerHTML = data.orders.length ? `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Buyer</th><th>Date</th><th class="r">Total</th><th>Status</th><th></th></tr></thead><tbody>
    ${data.orders.map(o => `<tr><td>#${o.id}</td><td>${esc(o.buyer)}</td><td>${fdate(o.created_at)}</td><td class="r">${money(o.total)}</td><td><span class="pill ${o.status}">${o.status}</span></td>
    <td><div class="actions"><a class="btn ghost sm" href="/receipt?id=${o.id}">Receipt</a>${NEXT[o.status] ? `<button class="btn sm" data-ao="${o.id}">Mark ${NEXT[o.status]}</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>` : empty('truck', 'No orders yet.');
  if (tab === 'messages') pane.innerHTML = data.messages.length ? data.messages.map(m => `<div class="panel" style="padding:18px 20px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><b>${esc(m.name)}</b><span class="muted small">${fdatetime(m.created_at)}</span></div>
    <a class="muted small" href="mailto:${esc(m.email)}">${esc(m.email)}</a><p style="margin-top:10px">${esc(m.message)}</p></div>`).join('') : empty('file', 'No messages yet.');
}

async function act(path, ok, method = 'POST') {
  try { await api(path, { method }); toast(ok, 'ok'); await load(); } catch (e) { toast(e.message); }
}
document.addEventListener('click', e => {
  const t = e.target.closest('.dtab'); if (t) { tab = t.dataset.t; return draw(); }
  const a = e.target.closest('[data-af],[data-al],[data-rl],[data-ao]'); if (!a) return;
  if (a.dataset.af) act(`/admin/farmers/${a.dataset.af}/approve`, 'Farmer approved.');
  if (a.dataset.al) act(`/admin/produce/${a.dataset.al}/approve`, 'Listing approved. It is live now.');
  if (a.dataset.rl && confirm('Reject and delete this listing?')) act(`/produce/${a.dataset.rl}`, 'Listing rejected.', 'DELETE');
  if (a.dataset.ao) act(`/admin/orders/${a.dataset.ao}/advance`, 'Order status updated.');
});
await load();
setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 20000);
