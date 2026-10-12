import { $, $$, api, esc, money, fdate, icon, media, photoSrc, mountLayout, requireRole, showFieldErrors, toast } from '/js/core.js';
const user = await requireRole('farmer');
if (!user) throw new Error('redirect');
await mountLayout('dash');

let listings = [], orders = [], tab = 'listings', editing = null;
const approved = user.status === 'approved';
const modal = $('#modal'), form = $('#pForm');

const { items: cats } = await api('/categories');
$('#pcat').innerHTML = '<option value="">Choose...</option>' + cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

async function load() {
  [listings, orders] = await Promise.all([api('/produce/mine').then(r => r.items), api('/orders/farmer').then(r => r.rows)]);
  draw();
}
function draw() {
  $('#banner').innerHTML = approved ? '' : '<div class="alert info" style="margin-top:24px">Your account is waiting for admin approval. You can add listings once it\'s approved.</div>';
  const live = listings.filter(l => l.status === 'approved').length;
  $('#stats').innerHTML = [[listings.length, 'Total listings'], [live, 'Live on the market'], [listings.length - live, 'Awaiting approval'], [orders.reduce((s, r) => s + r.quantity, 0), 'Units ordered']]
    .map(([n, l]) => `<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
  if (tab === 'listings') {
    $('#pane').innerHTML = listings.length ? `<div class="table-wrap"><table><thead><tr><th>Produce</th><th>Category</th><th class="r">Price</th><th class="r">Stock</th><th>Status</th><th></th></tr></thead><tbody>
      ${listings.map(l => `<tr><td><div class="cell"><div class="thumb">${media(l, 200)}</div><div><b>${esc(l.name)}</b><div class="muted small">${esc(l.location)}</div></div></div></td><td>${esc(l.category)}</td><td class="r">${money(l.price)}</td><td class="r">${l.quantity}</td>
      <td><span class="pill ${l.status}">${l.status}</span></td><td><div class="actions"><button class="btn ghost sm" data-edit="${l.id}">${icon('edit')}Edit</button><button class="btn danger sm" data-del="${l.id}" aria-label="Delete ${esc(l.name)}">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${icon('box')}<h2>Nothing listed yet.</h2><p class="muted">Add your first produce and buyers can start finding you.</p>${approved ? '<button class="btn" id="firstBtn" type="button">Add produce</button>' : ''}</div>`;
  } else {
    $('#pane').innerHTML = orders.length ? `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Produce</th><th class="r">Qty</th><th class="r">Value</th><th>Buyer</th><th>Status</th></tr></thead><tbody>
      ${orders.map(r => `<tr><td>#${r.order_id}<div class="muted small">${fdate(r.created_at)}</div></td><td>${esc(r.name)}</td><td class="r">${r.quantity}</td><td class="r">${money(r.quantity * r.unit_price)}</td><td>${esc(r.buyer)}</td><td><span class="pill ${r.status}">${r.status}</span></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${icon('truck')}<h2>No orders yet.</h2><p class="muted">When a buyer orders your produce, it shows up here.</p></div>`;
  }
}

$$('.dtab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.t; $$('.dtab').forEach(x => x.classList.toggle('on', x === b)); draw(); }));

function openModal(l) {
  if (!approved) return toast('Your account needs admin approval before you can list produce.');
  editing = l || null; form.reset(); showFieldErrors(form, {}); $('#pMsg').innerHTML = '';
  $('#mTitle').textContent = l ? 'Edit produce' : 'Add produce';
  $('#preview').innerHTML = l && l.photo ? `<img src="${esc(photoSrc(l.photo, 800))}" alt="">` : 'No photo yet';
  if (l) { form.name.value = l.name; form.category_id.value = l.category_id; form.location.value = l.location; form.price.value = l.price; form.quantity.value = l.quantity; form.description.value = l.description || ''; form.photo_url.value = ''; }
  modal.classList.add('open'); form.name.focus();
}
const close = () => modal.classList.remove('open');
$('#newBtn').addEventListener('click', () => openModal());
$('#mClose').addEventListener('click', close);
modal.addEventListener('click', e => { if (e.target === modal) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

$('#pane').addEventListener('click', async e => {
  if (e.target.closest('#firstBtn')) return openModal();
  const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (ed) openModal(listings.find(l => l.id == ed.dataset.edit));
  if (del && confirm('Delete this listing?')) {
    try { await api('/produce/' + del.dataset.del, { method: 'DELETE' }); toast('Listing deleted.', 'ok'); await load(); } catch (err) { toast(err.message); }
  }
});

$('#purl').addEventListener('input', e => {
  const v = e.target.value.trim();
  if (/^https:\/\/images\.unsplash\.com\/photo-/.test(v)) $('#preview').innerHTML = `<img src="${esc(photoSrc(v, 800))}" alt="">`;
});
$('#pphoto').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  $('#preview').innerHTML = ''; const img = new Image(); img.alt = ''; img.src = URL.createObjectURL(f); $('#preview').appendChild(img);
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const errs = {}, v = n => form.elements[n].value.trim(), file = form.photo.files[0];
  if (v('name').length < 2) errs.name = 'Enter a produce name.';
  if (!v('category_id')) errs.category_id = 'Choose a category.';
  if (!(Number(v('price')) > 0)) errs.price = 'Price must be more than 0.';
  if (!/^\d+$/.test(v('quantity'))) errs.quantity = 'Quantity must be a whole number, 0 or more.';
  if (v('location').length < 2) errs.location = 'Enter the location.';
  if (v('photo_url') && !/^https:\/\/images\.unsplash\.com\/photo-[\w-]+/.test(v('photo_url'))) errs.photo_url = 'Use an address that starts with https://images.unsplash.com/photo-';
  if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) errs.photo = 'Photos must be JPG, PNG or WEBP.';
  if (file && file.size > 2 * 1024 * 1024) errs.photo = 'Photo must be 2 MB or smaller.';
  showFieldErrors(form, errs); if (Object.keys(errs).length) return;
  const btn = $('#pSave'); btn.disabled = true;
  try {
    const body = new FormData(form); if (!file) body.delete('photo');
    await api(editing ? '/produce/' + editing.id : '/produce', { method: editing ? 'PUT' : 'POST', form: body });
    close(); toast(editing ? 'Updated. It goes back to approval.' : 'Listing created. Waiting for approval.', 'ok'); await load();
  } catch (err) { showFieldErrors(form, err.fields || {}); $('#pMsg').innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; }
  btn.disabled = false;
});

await load();
setInterval(() => { if (!document.hidden && !modal.classList.contains('open')) load().catch(() => {}); }, 30000);
