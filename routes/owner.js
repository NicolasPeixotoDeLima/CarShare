const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('proprietario', 'admin'));

const BOOKING_STATUSES = new Set(['active', 'scheduled', 'finished', 'cancelled']);

/* ============ STATS / DASHBOARD ============ */

router.get('/stats', async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    const cars = await db.one(
      `SELECT
         COUNT(*)::int AS total,
         COALESCE(SUM(stock), 0)::int AS units,
         COALESCE(AVG(price_month), 0)::int AS avg_price
       FROM cars WHERE owner_id = $1`,
      [ownerId],
    );

    const bookingAgg = await db.one(
      `SELECT
         COUNT(*) FILTER (WHERE b.status IN ('active','scheduled'))::int AS active,
         COUNT(*) FILTER (WHERE b.status = 'finished')::int  AS finished,
         COUNT(*) FILTER (WHERE b.status = 'cancelled')::int AS cancelled,
         COALESCE(SUM(b.monthly_price) FILTER (WHERE b.status IN ('active','scheduled')), 0)::int AS mrr
       FROM bookings b
       JOIN cars c ON c.id = b.car_id
       WHERE c.owner_id = $1`,
      [ownerId],
    );

    const topCars = await db.all(
      `SELECT c.id, c.brand, c.model, c.slug, c.price_month,
              COUNT(b.id)::int AS bookings,
              COALESCE(SUM(b.monthly_price) FILTER (WHERE b.status IN ('active','scheduled')), 0)::int AS mrr
         FROM cars c
         LEFT JOIN bookings b ON b.car_id = c.id
        WHERE c.owner_id = $1
        GROUP BY c.id
        ORDER BY bookings DESC, c.price_month DESC
        LIMIT 5`,
      [ownerId],
    );

    res.json({
      cars,
      bookings: bookingAgg,
      topCars,
    });
  } catch (err) { next(err); }
});

/* ============ BOOKINGS DOS MEUS CARROS ============ */

router.get('/bookings', async (req, res, next) => {
  try {
    const { status, q, limit = 50, offset = 0 } = req.query;
    const where = ['c.owner_id = $1'];
    const params = [req.user.id];

    if (status && BOOKING_STATUSES.has(status)) {
      params.push(status);
      where.push(`b.status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(b.code ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    const whereSql = 'WHERE ' + where.join(' AND ');
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const items = await db.all(
      `SELECT b.id, b.code, b.status, b.term_months, b.start_date, b.end_date,
              b.monthly_price, b.total_price, b.created_at,
              b.delivered_at, b.delivery_confirmed_at,
              b.cancelled_at, b.cancellation_fee, b.cancellation_reason,
              u.id AS user_id, u.name AS user_name, u.email AS user_email,
              c.id AS car_id, c.brand, c.model, c.year, c.slug
         FROM bookings b
         JOIN cars  c ON c.id = b.car_id
         JOIN users u ON u.id = b.user_id
        ${whereSql}
        ORDER BY b.created_at DESC
        LIMIT ${lim} OFFSET ${off}`,
      params,
    );
    const { c: total } = await db.one(
      `SELECT COUNT(*)::int AS c
         FROM bookings b
         JOIN cars c  ON c.id = b.car_id
         JOIN users u ON u.id = b.user_id
        ${whereSql}`,
      params,
    );
    res.json({ items, total, limit: lim, offset: off });
  } catch (err) { next(err); }
});

/** Mesma logica de multa do bookings.js — duplicada aqui pra nao expor o helper. */
function calcCancellationFee(booking) {
  const start = new Date(booking.start_date).getTime();
  const today = Date.now();
  const monthMs = 1000 * 60 * 60 * 24 * 30;
  const elapsedMonths = Math.max(0, Math.floor((today - start) / monthMs));
  const remaining = Math.max(0, booking.term_months - elapsedMonths);
  return Math.round(remaining * booking.monthly_price * 0.3);
}

/* PATCH /api/owner/bookings/:code — acoes do proprietario:
   - mark_delivered : marca que entregou o carro (cliente precisa confirmar)
   - cancel         : quebra o contrato com multa
   - finish         : encerra o contrato no fim do prazo (ou antecipado) */
router.patch('/bookings/:code', async (req, res, next) => {
  try {
    const { action, reason } = req.body || {};
    const row = await db.one(
      `SELECT b.* FROM bookings b
         JOIN cars c ON c.id = b.car_id
        WHERE b.code = $1 AND c.owner_id = $2`,
      [req.params.code, req.user.id],
    );
    if (!row) return res.status(404).json({ error: 'not_found' });

    if (action === 'mark_delivered') {
      if (row.delivered_at) return res.status(400).json({ error: 'already_marked' });
      if (row.status === 'cancelled' || row.status === 'finished') {
        return res.status(400).json({ error: 'booking_closed' });
      }
      const updated = await db.one(
        `UPDATE bookings SET delivered_at = now() WHERE id = $1 RETURNING *`,
        [row.id],
      );
      return res.json({ booking: updated });
    }

    if (action === 'cancel') {
      if (row.status === 'cancelled' || row.status === 'finished') {
        return res.status(400).json({ error: 'already_closed' });
      }
      const fee = calcCancellationFee(row);
      const updated = await db.one(
        `UPDATE bookings
            SET status = 'cancelled',
                cancelled_at = now(),
                cancelled_by = $2,
                cancellation_fee = $3,
                cancellation_reason = $4
          WHERE id = $1 RETURNING *`,
        [row.id, req.user.id, fee, String(reason || '').slice(0, 500) || null],
      );
      return res.json({ booking: updated, fee });
    }

    if (action === 'finish') {
      if (row.status === 'cancelled' || row.status === 'finished') {
        return res.status(400).json({ error: 'already_closed' });
      }
      const updated = await db.one(
        `UPDATE bookings SET status = 'finished' WHERE id = $1 RETURNING *`,
        [row.id],
      );
      return res.json({ booking: updated });
    }

    return res.status(400).json({ error: 'invalid_action' });
  } catch (err) { next(err); }
});

/* ============ FATURAS DOS CLIENTES (read-only) ============
   Lista as faturas dos bookings nos carros do proprietario corrente.
   Permite verificar se o cliente pagou a mensalidade.
   Filtros: paid (true/false), overdue (true), q (busca por codigo/email/nome). */
router.get('/invoices', async (req, res, next) => {
  try {
    const { paid, overdue, q, limit = 50, offset = 0 } = req.query;
    const where = ['c.owner_id = $1'];
    const params = [req.user.id];

    if (paid === 'true')    where.push('i.paid = TRUE');
    if (paid === 'false')   where.push('i.paid = FALSE');
    if (overdue === 'true') where.push('i.paid = FALSE AND i.due_date < CURRENT_DATE');
    if (q) {
      params.push(`%${q}%`);
      where.push(`(b.code ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    const whereSql = 'WHERE ' + where.join(' AND ');
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const items = await db.all(
      `SELECT i.id, i.amount, i.due_date, i.paid, i.paid_at, i.booking_id,
              b.code AS booking_code, b.status AS booking_status,
              u.id AS user_id, u.name AS user_name, u.email AS user_email,
              c.id AS car_id, c.brand, c.model, c.slug
         FROM invoices i
         JOIN bookings b ON b.id = i.booking_id
         JOIN users    u ON u.id = b.user_id
         JOIN cars     c ON c.id = b.car_id
        ${whereSql}
        ORDER BY i.due_date ASC, i.id ASC
        LIMIT ${lim} OFFSET ${off}`,
      params,
    );
    const { c: total } = await db.one(
      `SELECT COUNT(*)::int AS c
         FROM invoices i
         JOIN bookings b ON b.id = i.booking_id
         JOIN users    u ON u.id = b.user_id
         JOIN cars     c ON c.id = b.car_id
        ${whereSql}`,
      params,
    );
    res.json({ items, total, limit: lim, offset: off });
  } catch (err) { next(err); }
});

module.exports = router;
