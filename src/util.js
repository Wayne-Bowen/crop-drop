class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const isEmail = v => v.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = v => /^(\+254|0)[17]\d{8}$/.test(v);
const strongPw = v => typeof v === 'string' && v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v);
const money = n => Math.round(n * 100) / 100;
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { HttpError, clean, isEmail, isPhone, strongPw, money, wrap };
