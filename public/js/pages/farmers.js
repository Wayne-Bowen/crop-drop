import { $, api, esc, fdate, icon, mountLayout, reveal } from '/js/core.js';
await mountLayout('farmers');
try {
  const { items } = await api('/farmers');
  $('#farmerGrid').innerHTML = items.length ? items.map(f => `<a class="panel fcard rv" href="/farmer?id=${f.id}">
      <div class="avatar">${esc(f.full_name[0])}</div><h3>${esc(f.full_name)}</h3>
      <div class="meta">${icon('pin')}${esc(f.locations || 'No listings yet')}</div>
      <div class="stock-note">${f.listings} item${f.listings === 1 ? '' : 's'} on the market | since ${fdate(f.created_at)}</div></a>`).join('')
    : '<p class="muted">No approved farmers yet.</p>';
  reveal();
} catch (e) { $('#farmerGrid').innerHTML = `<p class="alert bad">${esc(e.message)}</p>`; }
