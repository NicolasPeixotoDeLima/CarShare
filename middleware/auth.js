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
      'SELECT id, name, email, role, phone, cpf, cnh, birthdate, status FROM users WHERE id = $1',
      [payload.id],
    );
    if (user && user.status !== 'banned') req.user = user;
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
      if (req.user.status && req.user.status !== 'active') {
        return res.status(403).json({ error: 'account_' + req.user.status });
      }
      if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
      next();
    });
  };
}

/**
 * Factory: bloqueia contas das roles passadas. Retorna 403 com mensagem clara.
 * Use pra impor separacao estrita de responsabilidades por role
 * (ex: admin nao opera como usuario; proprietario nao aluga carro).
 */
function blockRoles(...roles) {
  return (req, res, next) => {
    const apply = () => {
      if (req.user && roles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'role_cannot_perform_action',
          message: 'Esta operação não está disponível para sua conta.',
        });
      }
      next();
    };
    if (req.user) return apply();
    authOptional(req, res, apply);
  };
}

/** Compatibilidade com chamadas antigas — bloqueia apenas admin. */
const blockAdminFromUserActions = blockRoles('admin');

/**
 * Grava uma linha em admin_audit_log. Callable das rotas admin apos a acao
 * principal ter sucesso. Falha silenciosa pra nao derrubar a request.
 */
async function recordAudit(req, action, targetEntity, targetId, payload = {}) {
  if (!req.user || req.user.role !== 'admin') return;
  try {
    await db.query(
      `INSERT INTO admin_audit_log
         (admin_id, admin_email, action, target_entity, target_id, payload, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        req.user.id,
        req.user.email,
        action,
        targetEntity || null,
        targetId || null,
        JSON.stringify(payload || {}),
        req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0] || null,
        req.headers['user-agent'] || null,
      ],
    );
  } catch (err) {
    console.error('[audit] failed to record', err.message || err);
  }
}

module.exports = {
  signToken, authOptional, authRequired, requireRole,
  blockRoles, blockAdminFromUserActions, recordAudit,
  ROLES, SECRET,
};
