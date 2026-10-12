import { $, api, esc, mountLayout, countUp, productCard, reveal } from '/js/core.js';
await mountLayout('home');

let cat = '', last = '';
async function loadRail(force) {
  const { items } = await api('/produce?limit=10' + (cat ? '&category=' + cat : ''));
  const sig = items.map(i => i.id + ':' + i.quantity).join();
  if (!force && sig === last) return;
  last = sig;
  $('#rail').innerHTML = items.length ? items.map(productCard).join('')
    : '<div style="padding:30px 24px"><b>Nothing here yet.</b><p class="muted small" style="margin:6px 0 16px">Be the first farmer to post something in this category.</p><a class="btn sm" href="/login#register">Start selling</a></div>';
  reveal($('#rail'));
}

(async () => {
  try {
    const s = await api('/stats');
    document.querySelectorAll('#proof [data-k]').forEach(el => countUp(el, s[el.dataset.k] || 0));
    countUp($('#liveFarmers'), s.farmers, 900);
  } catch {}
  try {
    const { items } = await api('/farmers');
    if (items.length) {
      const one = items.map(f => `<span>${esc(f.full_name)}${f.locations ? ', ' + esc(f.locations.split(',')[0]) : ''}</span>`).join('');
      $('#marquee').innerHTML = one + one + one + one; $('#marqueeWrap').hidden = false;
    }
  } catch {}
  try {
    const { items } = await api('/categories');
    $('#chips').innerHTML = [{ id: '', name: 'All' }, ...items].map(c => `<button type="button" class="chip ${c.id === '' ? 'on' : ''}" data-c="${c.id}">${esc(c.name)}</button>`).join('');
    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      cat = b.dataset.c; document.querySelectorAll('#chips .chip').forEach(x => x.classList.toggle('on', x === b)); loadRail(true).catch(() => {});
    });
  } catch {}
  try { await loadRail(true); } catch { $('#rail').innerHTML = '<p class="muted" style="padding:24px">Could not load listings.</p>'; }
  setInterval(() => { if (!document.hidden) loadRail(false).catch(() => {}); }, 20000); // stays live without a refresh
})();
