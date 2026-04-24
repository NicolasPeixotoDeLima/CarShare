// Load env vars first — DATABASE_URL and JWT_SECRET must be set before any
// module that reads process.env is required.
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/cars',      require('./routes/cars'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/profile',   require('./routes/profile'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/owner',     require('./routes/owner'));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const CLIENT_DIST = path.join(__dirname, 'client', 'dist');
const HAS_BUILD   = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

if (HAS_BUILD) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback — any non-API route returns index.html and the React router handles it.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.status(503).send(
      '<h1>Client not built</h1>' +
      '<p>Run <code>npm run build:client</code> (or <code>npm run dev</code> during development).</p>',
    );
  });
}

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'internal_error' });
});

(async () => {
  try {
    await db.migrate();   // runs schema.sql — DDL + seed, both idempotent
    app.listen(PORT, () => {
      console.log(`\n  CarShare API + client → http://localhost:${PORT}\n`);
      if (!HAS_BUILD) console.log('  ⚠  client/dist not found — run `npm run build:client`.\n');
    });
  } catch (err) {
    console.error('[boot] failed to initialize database:', err.message || err);
    process.exit(1);
  }
})();
