import { $, api, esc, fdate, icon, mountLayout, reveal } from '/js/core.js';
await mountLayout('farmers');
try {
  const { items } = await api('/farmers');
  $('#farmerGrid').innerHTML = items.length ? items.map(f => `<a class="card rv" href="/farmer?id=${f.id}" style="text-decoration:none"><div class="body" style="padding:22px;gap:10px">
      <div class="thumb" style="width:52px;height:52px;border-radius:50%;font:600 1.2rem var(--display);color:var(--red)">${esc(f.full_name[0])}</div>
      <h3>${esc(f.full_name)}</h3>
      <div class="meta">${icon('pin')}${esc(f.locations || 'No listings yet')}</div>
      <div class="stock-note">${f.listings} item${f.listings === 1 ? '' : 's'} on the market | since ${fdate(f.created_at)}</div></div></a>`).join('')
    : '<p class="muted">No approved farmers yet.</p>';
  reveal();
} catch (e) { $('#farmerGrid').innerHTML = `<p class="alert bad">${esc(e.message)}</p>`; }
