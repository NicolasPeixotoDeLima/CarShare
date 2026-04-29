const express = require('express');
const db = require('../db');
const { authRequired, blockRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);
// Admin nao opera no chat (nao tem reservas) — bloqueia leitura e escrita.
// Proprietario PARTICIPA do chat como dono do carro alugado, entao nao bloqueia.
router.use(blockRoles('admin'));

const MAX_MSG_LEN = 2000;

/**
 * Carrega a reserva e valida que o usuario corrente eh ou cliente ou
 * proprietario do carro. Retorna { booking, role } ou null se nao tem acesso.
 */
async function resolveThread(bookingCode, userId) {
  const booking = await db.one(
    `SELECT b.id, b.code, b.user_id AS client_id, b.status,
            c.id AS car_id, c.owner_id, c.brand, c.model, c.year, c.slug,
            cu.name AS client_name, cu.email AS client_email,
            ou.name AS owner_name, ou.email AS owner_email
       FROM bookings b
       JOIN cars  c  ON c.id = b.car_id
       JOIN users cu ON cu.id = b.user_id
       LEFT JOIN users ou ON ou.id = c.owner_id
      WHERE b.code = $1`,
    [bookingCode],
  );
  if (!booking) return null;
  if (!booking.owner_id) return null;
  if (booking.client_id !== userId && booking.owner_id !== userId) return null;

  const role = booking.client_id === userId ? 'cliente' : 'proprietario';
  return { booking, role };
}

/* GET /api/chat/threads - lista todas as conversas que envolvem o usuario */
router.get('/threads', async (req, res, next) => {
  try {
    const items = await db.all(
      `SELECT
         b.code,
         b.id AS booking_id,
         b.status,
         c.brand, c.model, c.year, c.slug,
         CASE WHEN b.user_id = $1 THEN 'cliente' ELSE 'proprietario' END AS role,
         CASE WHEN b.user_id = $1 THEN ou.id    ELSE cu.id    END AS peer_id,
         CASE WHEN b.user_id = $1 THEN ou.name  ELSE cu.name  END AS peer_name,
         CASE WHEN b.user_id = $1 THEN ou.email ELSE cu.email END AS peer_email,
         (SELECT body FROM messages m WHERE m.booking_id = b.id
            ORDER BY m.created_at DESC LIMIT 1) AS last_body,
         (SELECT created_at FROM messages m WHERE m.booking_id = b.id
            ORDER BY m.created_at DESC LIMIT 1) AS last_at,
         (SELECT COUNT(*)::int FROM messages m
            WHERE m.booking_id = b.id AND m.sender_id <> $1 AND m.read_at IS NULL) AS unread
       FROM bookings b
       JOIN cars  c  ON c.id = b.car_id
       JOIN users cu ON cu.id = b.user_id
       LEFT JOIN users ou ON ou.id = c.owner_id
      WHERE c.owner_id IS NOT NULL
        AND (b.user_id = $1 OR c.owner_id = $1)
      ORDER BY COALESCE(
        (SELECT created_at FROM messages m WHERE m.booking_id = b.id
           ORDER BY m.created_at DESC LIMIT 1),
        b.created_at
      ) DESC`,
      [req.user.id],
    );
    res.json({ items });
  } catch (err) { next(err); }
});

/* GET /api/chat/:code - mensagens da reserva + contexto */
router.get('/:code', async (req, res, next) => {
  try {
    const ctx = await resolveThread(req.params.code, req.user.id);
    if (!ctx) return res.status(404).json({ error: 'not_found' });

    const messages = await db.all(
      `SELECT m.id, m.sender_id, m.body, m.read_at, m.created_at,
              u.name AS sender_name, u.role AS sender_role
         FROM messages m
         JOIN users u ON u.id = m.sender_id
        WHERE m.booking_id = $1
        ORDER BY m.created_at ASC`,
      [ctx.booking.id],
    );

    // Marca como lidas as mensagens do peer.
    await db.query(
      `UPDATE messages SET read_at = now()
        WHERE booking_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
      [ctx.booking.id, req.user.id],
    );

    const peer = ctx.role === 'cliente'
      ? { id: ctx.booking.owner_id, name: ctx.booking.owner_name, email: ctx.booking.owner_email, role: 'proprietario' }
      : { id: ctx.booking.client_id, name: ctx.booking.client_name, email: ctx.booking.client_email, role: 'cliente' };

    res.json({
      booking: {
        code: ctx.booking.code,
        status: ctx.booking.status,
        car: {
          brand: ctx.booking.brand, model: ctx.booking.model,
          year: ctx.booking.year, slug: ctx.booking.slug,
        },
      },
      role: ctx.role,
      peer,
      messages,
    });
  } catch (err) { next(err); }
});

/* POST /api/chat/:code - envia mensagem */
router.post('/:code', async (req, res, next) => {
  try {
    const ctx = await resolveThread(req.params.code, req.user.id);
    if (!ctx) return res.status(404).json({ error: 'not_found' });

    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'empty_body' });
    if (body.length > MAX_MSG_LEN) return res.status(400).json({ error: 'body_too_long' });

    const row = await db.one(
      `INSERT INTO messages (booking_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, body, read_at, created_at`,
      [ctx.booking.id, req.user.id, body],
    );
    res.status(201).json({
      message: { ...row, sender_name: req.user.name, sender_role: req.user.role },
    });
  } catch (err) { next(err); }
});

module.exports = router;
