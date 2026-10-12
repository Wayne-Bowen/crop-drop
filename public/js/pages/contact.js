import { $, api, esc, mountLayout, showFieldErrors, validators } from '/js/core.js';
await mountLayout('contact');
const f = $('#contactForm');
f.addEventListener('submit', async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  const errs = {};
  if (d.name.trim().length < 2) errs.name = 'Enter your name.';
  if (validators.email(d.email.trim()) !== true) errs.email = validators.email(d.email.trim());
  if (d.message.trim().length < 10) errs.message = 'Write at least 10 characters.';
  showFieldErrors(f, errs);
  if (Object.keys(errs).length) return;
  const btn = f.querySelector('button'); btn.disabled = true;
  try { await api('/contact', { method: 'POST', body: d }); f.reset(); $('#cMsg').innerHTML = '<div class="alert ok">Message sent. We\'ll reply by email.</div>'; }
  catch (err) { showFieldErrors(f, err.fields || {}); $('#cMsg').innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; }
  btn.disabled = false;
});
