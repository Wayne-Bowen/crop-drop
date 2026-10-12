const crypto = require('crypto');
const { HttpError } = require('./util');

// Every state-changing request must carry the session's CSRF token in X-CSRF-Token.
function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  return req.session.csrf;
}
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = req.get('x-csrf-token') || '';
  const real = req.session.csrf || '';
  const ok = sent.length === real.length && real && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(real));
  if (!ok) return next(new HttpError(403, 'Security token missing or expired. Refresh the page and try again.'));
  next();
}
const requireAuth = (req, res, next) => req.session.user ? next() : next(new HttpError(401, 'Please log in first.'));
const requireRole = (...roles) => (req, res, next) => {
  if (!req.session.user) return next(new HttpError(401, 'Please log in first.'));
  if (!roles.includes(req.session.user.role)) return next(new HttpError(403, 'You do not have access to that.'));
  next();
};
module.exports = { csrfToken, csrfGuard, requireAuth, requireRole };
