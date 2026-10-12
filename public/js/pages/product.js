import { $, api, esc, money, icon, mountLayout, addToCart, media, productCard, reveal } from '/js/core.js';
await mountLayout('market');

const id = new URLSearchParams(location.search).get('id');
const root = $('#product');
try {
  const { item: p, related } = await api('/produce/' + encodeURIComponent(id));
  document.title = `${p.name} | CropDrop`; $('#crumb').textContent = p.name;
  const low = p.quantity <= 20;
  root.innerHTML = `<div class="product">
    <div class="media">${media(p, 1200)}</div>
    <div>
      <span class="eyebrow">${esc(p.category)}</span>
      <h1 style="margin-top:10px;font-size:clamp(1.8rem,4vw,2.8rem)">${esc(p.name)}</h1>
      <div class="big-price">${money(p.price)}</div>
      <p class="muted">${esc(p.description || 'No description from the farmer yet.')}</p>
      <div class="buy">
        <div class="qty"><button type="button" id="minus" aria-label="Less">-</button><input id="qty" type="number" min="1" max="${p.quantity}" value="1" aria-label="Quantity"><button type="button" id="plus" aria-label="More">+</button></div>
        <button class="btn" id="add" type="button">${icon('cart')}Add to cart</button>
        <button class="btn ghost" id="buy" type="button">Buy now</button>
      </div>
      <div class="stock-note ${low ? 'low' : ''}" style="margin:-10px 0 22px">${low ? `Only ${p.quantity} left` : `${p.quantity} in stock`}</div>
      <div class="info-list">
        <div><span>Farmer</span><a href="/farmer?id=${p.farmer_id}" style="color:var(--red-hi);font-weight:600">${esc(p.farmer)}</a></div>
        <div><span>Location</span><b>${esc(p.location)}</b></div>
        <div><span>Category</span><b>${esc(p.category)}</b></div>
        <div><span>Listed</span><b>${new Date(p.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</b></div>
      </div></div></div>`;
  const q = $('#qty');
  const clamp = () => { q.value = Math.min(Math.max(parseInt(q.value, 10) || 1, 1), p.quantity); return +q.value; };
  $('#minus').onclick = () => { q.value = +q.value - 1; clamp(); };
  $('#plus').onclick = () => { q.value = +q.value + 1; clamp(); };
  q.onchange = clamp;
  $('#add').onclick = e => addToCart(p.id, clamp(), p.quantity, e.currentTarget);
  $('#buy').onclick = async () => { await addToCart(p.id, clamp(), p.quantity); location.href = '/cart'; };
  if (related.length) { $('#related').innerHTML = related.map(productCard).join(''); $('#relatedWrap').hidden = false; reveal(); }
} catch (e) {
  root.innerHTML = `<div class="empty"><h2>That one's gone.</h2><p class="muted">${esc(e.message)}</p><a class="btn" href="/catalogue">Back to the market</a></div>`;
}
