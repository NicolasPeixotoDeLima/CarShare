const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// Only these roles may be chosen at signup. `admin` must be promoted manually
// (SQL editor or via an admin endpoint), never self-assigned.
const SELF_ASSIGNABLE_ROLES = new Set(['cliente', 'proprietario']);

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'missing_fields' });
    if (String(password).length < 8)  return res.status(400).json({ error: 'weak_password' });

    const chosenRole = role || 'cliente';
    if (!SELF_ASSIGNABLE_ROLES.has(chosenRole)) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    const existing = await db.one('SELECT id FROM users WHERE email = $1', [String(email).toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'email_taken' });

    const hash = bcrypt.hashSync(password, 10);
    const inserted = await db.one(
      `INSERT INTO users (name, email, password, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, phone`,
      [name.trim(), String(email).toLowerCase(), hash, chosenRole, phone || null],
    );

    const token = signToken(inserted);
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user: inserted, token });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });

    const row = await db.one('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
    if (!row) return res.status(401).json({ error: 'invalid_credentials' });
    if (!bcrypt.compareSync(password, row.password)) return res.status(401).json({ error: 'invalid_credentials' });

    const user = { id: row.id, name: row.name, email: row.email, role: row.role, phone: row.phone };
    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user, token });
  } catch (err) { next(err); }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
