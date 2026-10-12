import { $, api, esc, money, fdatetime, icon, LOGO, mountLayout, requireRole } from '/js/core.js';
const u = await requireRole('buyer', 'admin');
if (!u) throw new Error('redirect');
await mountLayout('orders');
const id = new URLSearchParams(location.search).get('id');
try {
  const { order: o } = await api('/orders/' + encodeURIComponent(id));
  document.title = `Receipt #${o.id} | CropDrop`;
  $('#receipt').innerHTML = `<div class="head"><div><div class="logo" style="margin-bottom:6px">${LOGO}<span>Crop<b>Drop</b></span></div><div class="muted small">Receipt</div></div>
      <div style="text-align:right"><b>Order #${o.id}</b><div class="muted small">${fdatetime(o.created_at)}</div><span class="pill ${o.status}" style="margin-top:6px">${o.status}</span></div></div>
    <div class="muted small" style="margin-bottom:22px">Buyer: <b style="color:var(--text)">${esc(o.full_name)}</b><br>${esc(o.email)} | ${esc(o.phone)}</div>
    <div class="table-wrap"><table><thead><tr><th>Item</th><th>Farmer</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Subtotal</th></tr></thead><tbody>
      ${o.items.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.farmer)}</td><td class="r">${i.quantity}</td><td class="r">${money(i.unit_price)}</td><td class="r">${money(i.quantity * i.unit_price)}</td></tr>`).join('')}
      <tr><td colspan="4" class="r"><b>Total</b></td><td class="r"><b>${money(o.total)}</b></td></tr></tbody></table></div>
    <p class="muted small" style="margin-top:22px">Thank you for buying direct from the farm.</p>
    <div class="actions no-print" style="justify-content:flex-start;margin-top:22px"><button class="btn" id="print" type="button">${icon('print')}Print</button>
      <a class="btn ghost" href="/api/orders/${o.id}/receipt.pdf">${icon('dl')}Download PDF</a><a class="btn ghost" href="${u.role === 'admin' ? '/admin' : '/orders'}">Back</a></div>`;
  $('#print').onclick = () => window.print();
} catch (e) { $('#receipt').innerHTML = `<div class="empty"><h2>Receipt not found.</h2><p class="muted">${esc(e.message)}</p><a class="btn" href="/orders">My orders</a></div>`; }
