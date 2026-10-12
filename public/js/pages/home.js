import { $, api, esc, money, mountLayout, countUp, productCard, media, reveal, icon } from '/js/core.js';
await mountLayout('home');

const feedRow = (p, fresh) => `<a class="drop-row ${fresh ? 'fresh' : ''}" href="/product?id=${p.id}"><span class="thumb">${media(p)}</span>
  <span class="t"><b>${esc(p.name)}</b><span>${esc(p.location)} | ${esc(p.farmer)}</span></span><span class="price">${money(p.price)}</span></a>`;

function renderFeed(items, seen) {
  $('#feed').innerHTML = items.length ? items.slice(0, 5).map(p => feedRow(p, seen && !seen.has(p.id))).join('')
    : `<div style="padding:34px 22px"><b>Nothing listed yet.</b><p class="muted small" style="margin:6px 0 16px">Be the first farmer to post something.</p><a class="btn sm" href="/login#register">Start selling</a></div>`;
  const t = $('#ticker');
  if (items.length) {
    const one = '<span class="live"><i class="dot"></i>Live</span>' + items.map(p => `<span><b>${esc(p.name)}</b> ${esc(p.location)} <i>${money(p.price)}</i></span>`).join('');
    t.innerHTML = one + one; $('#tickerWrap').hidden = false;
  }
  $('#feedTime').textContent = 'updated ' + new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

let seen = null;
async function load() {
  const { items } = await api('/produce?limit=8');
  renderFeed(items, seen);
  if (!seen) {
    $('#fresh').innerHTML = items.length ? items.map(productCard).join('') : '<p class="muted">No produce on the market yet.</p>';
    reveal();
  }
  seen = new Set(items.map(p => p.id));
}

(async () => {
  try {
    const s = await api('/stats');
    document.querySelectorAll('#proof [data-k]').forEach(el => countUp(el, s[el.dataset.k] || 0));
  } catch {}
  try {
    const { items } = await api('/categories');
    $('#cats').innerHTML = items.map(c => `<a class="cat" href="/catalogue?category=${c.id}">${icon('box')}${esc(c.name)}</a>`).join('');
  } catch {}
  try { await load(); } catch { $('#feed').innerHTML = '<p class="muted" style="padding:24px">Could not load listings.</p>'; }
  setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 15000); // keeps the feed live
})();
