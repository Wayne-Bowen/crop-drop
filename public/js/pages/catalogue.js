import { $, api, esc, mountLayout, productCard, skeletons, reveal } from '/js/core.js';
await mountLayout('market');

const form = $('#filters'), grid = $('#grid'), more = $('#more'), count = $('#count');
const LIMIT = 12; let offset = 0, shown = 0, ticket = 0;

const { items: cats } = await api('/categories');
const qs = new URLSearchParams(location.search);
['q', 'category', 'location', 'sort'].forEach(k => { if (qs.get(k)) form.elements[k].value = qs.get(k); });
$('#chips').innerHTML = [{ id: '', name: 'All' }, ...cats].map(c => `<button type="button" class="chip ${String(c.id) === form.elements.category.value ? 'on' : ''}" data-c="${c.id}">${esc(c.name)}</button>`).join('');
$('#chips').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  form.elements.category.value = b.dataset.c;
  document.querySelectorAll('#chips .chip').forEach(x => x.classList.toggle('on', x === b)); load();
});

const params = () => { const p = new URLSearchParams(); ['q', 'category', 'location', 'sort'].forEach(k => { const v = form.elements[k].value.trim(); if (v) p.set(k, v); }); return p; };

async function load(append = false) {
  const my = ++ticket;
  if (!append) { offset = 0; shown = 0; grid.innerHTML = skeletons(6); more.hidden = true; }
  const p = params(); history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
  p.set('limit', LIMIT); p.set('offset', offset);
  try {
    const { items, total } = await api('/produce?' + p);
    if (my !== ticket) return;
    if (!append) grid.innerHTML = '';
    if (!total) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px 0"><h3 style="font-size:1.6rem;margin-bottom:8px">Nothing matches that.</h3><p class="muted" style="margin-bottom:22px">Even we can't grow it overnight.</p><button class="btn ghost" id="clear" type="button">Clear filters</button></div>`;
      $('#clear').onclick = () => { form.reset(); form.elements.category.value = ''; document.querySelectorAll('#chips .chip').forEach((x, i) => x.classList.toggle('on', i === 0)); load(); };
    } else grid.insertAdjacentHTML('beforeend', items.map(productCard).join(''));
    shown += items.length; offset += LIMIT;
    count.textContent = total ? `${total} item${total === 1 ? '' : 's'}` : '';
    more.hidden = shown >= total;
    reveal(grid);
  } catch (e) { if (my === ticket) grid.innerHTML = `<p class="alert bad" style="grid-column:1/-1">${esc(e.message)}</p>`; }
}
let t; const soon = () => { clearTimeout(t); t = setTimeout(() => load(), 280); };
['q', 'location'].forEach(k => form.elements[k].addEventListener('input', soon));
form.elements.sort.addEventListener('change', () => load());
more.addEventListener('click', () => load(true));
load();
