const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('admin'));

const ROLES = new Set(['admin', 'cliente', 'proprietario']);
const BOOKING_STATUSES = new Set(['active', 'scheduled', 'finished', 'cancelled']);

/* ============ STATS / DASHBOARD ============ */

router.get('/stats', async (_req, res, next) => {
  try {
    const usersByRole = await db.all(
      `SELECT role, COUNT(*)::int AS n FROM users GROUP BY role`,
    );
    const carsByOwner = await db.one(
      `SELECT
         COUNT(*) FILTER (WHERE owner_id IS NULL)::int AS platform,
         COUNT(*) FILTER (WHERE owner_id IS NOT NULL)::int AS owners,
         COUNT(*)::int AS total
       FROM cars`,
    );
    const bookingsByStatus = await db.all(
      `SELECT status, COUNT(*)::int AS n FROM bookings GROUP BY status`,
    );
    const mrr = await db.one(
      `SELECT COALESCE(SUM(monthly_price), 0)::int AS mrr
         FROM bookings WHERE status IN ('active','scheduled')`,
    );
    const invoicesAgg = await db.one(
      `SELECT
         COUNT(*) FILTER (WHERE paid = FALSE)::int AS open,
         COUNT(*) FILTER (WHERE paid = FALSE AND due_date < CURRENT_DATE)::int AS overdue,
         COALESCE(SUM(amount) FILTER (WHERE paid = FALSE AND due_date < CURRENT_DATE), 0)::int AS overdue_amount
       FROM invoices`,
    );
    const topCars = await db.all(
      `SELECT c.id, c.brand, c.model, c.year, c.slug, c.price_month,
              COUNT(b.id)::int AS bookings
         FROM cars c LEFT JOIN bookings b ON b.car_id = c.id
        GROUP BY c.id
        ORDER BY bookings DESC, c.price_month DESC
        LIMIT 5`,
    );
    const recent = await db.all(
      `SELECT b.id, b.code, b.status, b.monthly_price, b.created_at,
              u.name AS user_name, u.email AS user_email,
              c.brand, c.model
         FROM bookings b
         JOIN users u ON u.id = b.user_id
         JOIN cars  c ON c.id = b.car_id
        ORDER BY b.created_at DESC
        LIMIT 8`,
    );

    res.json({
      users: usersByRole.reduce((acc, r) => ({ ...acc, [r.role]: r.n }), { admin: 0, cliente: 0, proprietario: 0 }),
      cars: carsByOwner,
      bookings: bookingsByStatus.reduce((acc, r) => ({ ...acc, [r.status]: r.n }), { active: 0, scheduled: 0, finished: 0, cancelled: 0 }),
      mrr: mrr.mrr,
      invoices: invoicesAgg,
      topCars,
      recentBookings: recent,
    });
  } catch (err) { next(err); }
});

/* ============ USERS ============ */

router.get('/users', async (req, res, next) => {
  try {
    const { role, q, limit = 50, offset = 0 } = req.query;
    const where = [];
    const params = [];
    if (role && ROLES.has(role)) {
      params.push(role);
      where.push(`u.role = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const items = await db.all(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.cpf, u.cnh, u.created_at,
              (SELECT COUNT(*)::int FROM bookings WHERE user_id = u.id) AS bookings_count,
              (SELECT COUNT(*)::int FROM cars     WHERE owner_id = u.id) AS cars_count
         FROM users u ${whereSql}
        ORDER BY u.id ASC
        LIMIT ${lim} OFFSET ${off}`,
      params,
    );
    const { c: total } = await db.one(
      `SELECT COUNT(*)::int AS c FROM users u ${whereSql}`,
      params,
    );
    res.json({ items, total, limit: lim, offset: off });
  } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const target = await db.one('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!target) return res.status(404).json({ error: 'not_found' });

    const sets = [];
    const values = [];
    const allow = ['name', 'email', 'phone', 'role'];

    for (const f of allow) {
      if (req.body[f] === undefined) continue;
      if (f === 'role') {
        if (!ROLES.has(req.body.role)) return res.status(400).json({ error: 'invalid_role' });
        // Anti-suicidio: admin nao pode rebaixar a si mesmo
        if (id === req.user.id && req.body.role !== 'admin') {
          return res.status(400).json({ error: 'cannot_demote_self' });
        }
      }
      values.push(req.body[f]);
      sets.push(`${f} = $${values.length}`);
    }
    if (!sets.length) return res.json(target);

    values.push(id);
    const updated = await db.one(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length}
         RETURNING id, name, email, role, phone, cpf, cnh, created_at`,
      values,
    );
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) return res.status(400).json({ error: 'cannot_delete_self' });
    const r = await db.run('DELETE FROM users WHERE id = $1', [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ============ BOOKINGS ============ */

router.get('/bookings', async (req, res, next) => {
  try {
    const { status, user_id, car_id, q, limit = 50, offset = 0 } = req.query;
    const where = [];
    const params = [];
    if (status && BOOKING_STATUSES.has(status)) {
      params.push(status);
      where.push(`b.status = $${params.length}`);
    }
    if (user_id && /^\d+$/.test(user_id)) {
      params.push(parseInt(user_id, 10));
      where.push(`b.user_id = $${params.length}`);
    }
    if (car_id && /^\d+$/.test(car_id)) {
      params.push(parseInt(car_id, 10));
      where.push(`b.car_id = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(b.code ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const items = await db.all(
      `SELECT b.id, b.code, b.status, b.term_months, b.km_limit, b.start_date, b.end_date,
              b.monthly_price, b.total_price, b.payment_method, b.delivery_when, b.created_at,
              u.id AS user_id, u.name AS user_name, u.email AS user_email,
              c.id AS car_id, c.brand, c.model, c.year, c.slug
         FROM bookings b
         JOIN users u ON u.id = b.user_id
         JOIN cars  c ON c.id = b.car_id
        ${whereSql}
        ORDER BY b.created_at DESC
        LIMIT ${lim} OFFSET ${off}`,
      params,
    );
    const { c: total } = await db.one(
      `SELECT COUNT(*)::int AS c FROM bookings b JOIN users u ON u.id = b.user_id ${whereSql}`,
      params,
    );
    res.json({ items, total, limit: lim, offset: off });
  } catch (err) { next(err); }
});

router.patch('/bookings/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (!BOOKING_STATUSES.has(status)) return res.status(400).json({ error: 'invalid_status' });
    const updated = await db.one(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id],
    );
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json(updated);
  } catch (err) { next(err); }
});

/* ============ INVOICES ============ */

router.get('/invoices', async (req, res, next) => {
  try {
    const { paid, overdue, limit = 50, offset = 0 } = req.query;
    const where = [];
    const params = [];
    if (paid === 'true')  where.push(`i.paid = TRUE`);
    if (paid === 'false') where.push(`i.paid = FALSE`);
    if (overdue === 'true') where.push(`i.paid = FALSE AND i.due_date < CURRENT_DATE`);
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const items = await db.all(
      `SELECT i.id, i.amount, i.due_date, i.paid, i.paid_at, i.booking_id,
              b.code AS booking_code, b.status AS booking_status,
              u.id AS user_id, u.name AS user_name, u.email AS user_email,
              c.brand, c.model
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
      `SELECT COUNT(*)::int AS c FROM invoices i ${whereSql}`,
      params,
    );
    res.json({ items, total, limit: lim, offset: off });
  } catch (err) { next(err); }
});

router.patch('/invoices/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { paid } = req.body || {};
    if (typeof paid !== 'boolean') return res.status(400).json({ error: 'invalid_paid' });
    const updated = await db.one(
      `UPDATE invoices
          SET paid = $1,
              paid_at = CASE WHEN $1 THEN now() ELSE NULL END
        WHERE id = $2 RETURNING *`,
      [paid, id],
    );
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
