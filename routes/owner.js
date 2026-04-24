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

module.exports = router;
