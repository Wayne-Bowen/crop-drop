require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const path = require('path');
const db = require('./db');
const { csrfGuard } = require('./src/security');

const prod = process.env.NODE_ENV === 'production';
const secret = process.env.SESSION_SECRET || (prod ? null : 'dev-only-secret-change-me');
if (!secret) { console.error('SESSION_SECRET must be set in production.'); process.exit(1); }

const app = express();
app.disable('x-powered-by');
if (prod) app.set('trust proxy', 1); // hosts put a proxy in front of the app

app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:'], fontSrc: ["'self'"], connectSrc: ["'self'"],
    objectSrc: ["'none'"], frameAncestors: ["'none'"], formAction: ["'self'"], upgradeInsecureRequests: null,
  } },
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  name: 'cd.sid', secret, resave: false, saveUninitialized: false,
  store: new pgSession({ pool: db.pool, createTableIfMissing: true }), // sessions survive restarts
  cookie: { httpOnly: true, sameSite: 'lax', secure: prod, maxAge: 1000 * 60 * 60 * 8 },
}));

app.use('/api', csrfGuard);
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/produce', require('./src/routes/produce'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api', require('./src/routes/public'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') err = Object.assign(new Error('Photo must be 2 MB or smaller.'), { status: 400 });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side.' : err.message });
});

app.ready = db.init();
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.ready.then(() => app.listen(PORT, () => console.log(`CropDrop running on http://localhost:${PORT}`)))
    .catch(e => { console.error('Could not start:', e.message); process.exit(1); });
}
module.exports = app;
