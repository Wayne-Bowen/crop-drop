import { $, $$, api, esc, me, mountLayout, resetToken, showFieldErrors, validators } from '/js/core.js';
const u = await me();
if (u) location.replace(u.role === 'admin' ? '/admin' : u.role === 'farmer' ? '/dashboard' : '/catalogue');
await mountLayout('login');

const lf = $('#loginForm'), rf = $('#registerForm');
function show(which) {
  $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.t === which));
  $('#loginPane').classList.toggle('hide-m', which !== 'login');
  $('#registerPane').classList.toggle('hide-m', which !== 'register');
}
$$('.tab').forEach(t => t.addEventListener('click', () => show(t.dataset.t)));
if (location.hash === '#register') { show('register'); }

lf.addEventListener('submit', async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(lf)), errs = {};
  if (validators.email(d.email.trim()) !== true) errs.email = 'Enter a valid email address.';
  if (!d.password) errs.password = 'Enter your password.';
  showFieldErrors(lf, errs); if (Object.keys(errs).length) return;
  const btn = lf.querySelector('button'); btn.disabled = true;
  try {
    const { user } = await api('/auth/login', { method: 'POST', body: d });
    resetToken();
    const next = new URLSearchParams(location.search).get('next');
    location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : user.role === 'admin' ? '/admin' : user.role === 'farmer' ? '/dashboard' : '/catalogue';
  } catch (err) { $('#lMsg').innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; btn.disabled = false; }
});

rf.addEventListener('submit', async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(rf)), errs = {};
  if (d.full_name.trim().length < 2) errs.full_name = 'Enter your full name.';
  if (validators.email(d.email.trim()) !== true) errs.email = validators.email(d.email.trim());
  if (validators.phone(d.phone.trim()) !== true) errs.phone = validators.phone(d.phone.trim());
  if (validators.password(d.password) !== true) errs.password = validators.password(d.password);
  showFieldErrors(rf, errs); if (Object.keys(errs).length) return;
  const btn = rf.querySelector('button'); btn.disabled = true;
  try {
    const r = await api('/auth/register', { method: 'POST', body: d });
    rf.reset(); show('login'); lf.elements.email.value = d.email;
    $('#lMsg').innerHTML = `<div class="alert ok">${r.status === 'pending' ? 'Account created. An administrator needs to approve it before you can list produce. You can log in now.' : 'Account created. Log in to start ordering.'}</div>`;
    $('#rMsg').innerHTML = '';
  } catch (err) { showFieldErrors(rf, err.fields || {}); $('#rMsg').innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; }
  btn.disabled = false;
});
