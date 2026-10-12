import { $, api, esc, fdate, mountLayout, productCard, reveal } from '/js/core.js';
await mountLayout('farmers');
const id = new URLSearchParams(location.search).get('id');
try {
  const { farmer: f, items } = await api('/farmers/' + encodeURIComponent(id));
  document.title = `${f.full_name} | CropDrop`; $('#crumb').textContent = f.full_name;
  $('#profile').innerHTML = `<div style="display:flex;gap:22px;align-items:center;margin-bottom:40px;flex-wrap:wrap">
      <div class="thumb" style="width:84px;height:84px;border-radius:50%;font:600 2rem var(--display);color:var(--red)">${esc(f.full_name[0])}</div>
      <div><span class="eyebrow">Approved farmer</span><h1 style="font-size:clamp(1.8rem,4vw,2.8rem);margin-top:8px">${esc(f.full_name)}</h1>
      <p class="muted">On CropDrop since ${fdate(f.created_at)} | ${items.length} item${items.length === 1 ? '' : 's'} on the market</p></div></div>
    <div class="grid">${items.length ? items.map(p => productCard({ ...p, farmer: f.full_name })).join('') : '<p class="muted">Nothing listed right now. Check back soon.</p>'}</div>`;
  reveal();
} catch (e) { $('#profile').innerHTML = `<div class="empty"><h2>Farmer not found.</h2><p class="muted">${esc(e.message)}</p><a class="btn" href="/farmers">All farmers</a></div>`; }
