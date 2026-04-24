const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'carshare-dev-secret-change-me';

const ROLES = ['admin', 'cliente', 'proprietario'];

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '30d' },
  );
}

function readToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

async function authOptional(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, SECRET);
    const user = await db.one(
      'SELECT id, name, email, role, phone, cpf, cnh, birthdate FROM users WHERE id = $1',
      [payload.id],
    );
    if (user) req.user = user;
  } catch (_) { /* invalid token → anon */ }
  next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
    next();
  });
}

/** Middleware factory: requireRole('admin'), requireRole('admin', 'proprietario'), … */
function requireRole(...allowed) {
  return (req, res, next) => {
    authOptional(req, res, () => {
      if (!req.user)                       return res.status(401).json({ error: 'not_authenticated' });
      if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
      next();
    });
  };
}

module.exports = { signToken, authOptional, authRequired, requireRole, ROLES, SECRET };
