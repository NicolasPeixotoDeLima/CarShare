const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res, next) => {
  try {
    const user = await db.one(
      `SELECT id, name, email, role, phone, cpf, cnh, birthdate, created_at
         FROM users WHERE id = $1`,
      [req.user.id],
    );

    const active = await db.one(
      `SELECT b.*, c.brand, c.model, c.year, c.category, c.slug, c.range_km, c.power_hp
         FROM bookings b JOIN cars c ON c.id = b.car_id
        WHERE b.user_id = $1 AND b.status IN ('active','scheduled')
        ORDER BY b.created_at DESC LIMIT 1`,
      [req.user.id],
    );

    const upcomingInvoices = active
      ? await db.all(
          `SELECT * FROM invoices WHERE booking_id = $1 AND paid = FALSE
             ORDER BY due_date ASC LIMIT 3`,
          [active.id],
        )
      : [];

    const bookings = await db.all(
      `SELECT b.id, b.code, b.start_date, b.end_date, b.status, b.term_months, b.monthly_price,
              c.brand, c.model, c.year, c.category
         FROM bookings b JOIN cars c ON c.id = b.car_id
        WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id],
    );

    const favorites = await db.all(
      `SELECT c.id, c.slug, c.brand, c.model, c.year, c.category, c.price_month
         FROM favorites f JOIN cars c ON c.id = f.car_id
        WHERE f.user_id = $1 ORDER BY f.created_at DESC LIMIT 6`,
      [req.user.id],
    );

    res.json({ user, active, upcomingInvoices, bookings, favorites });
  } catch (err) { next(err); }
});

/* PATCH /api/profile — edita os proprios dados pessoais (nao role/email) */
router.patch('/', async (req, res, next) => {
  try {
    const allow = ['name', 'phone', 'cpf', 'cnh', 'birthdate'];
    const sets = [];
    const values = [];
    for (const f of allow) {
      if (req.body[f] === undefined) continue;
      const v = req.body[f] === '' ? null : req.body[f];
      values.push(v);
      sets.push(`${f} = $${values.length}`);
    }
    if (!sets.length) {
      const u = await db.one(
        `SELECT id, name, email, role, phone, cpf, cnh, birthdate FROM users WHERE id = $1`,
        [req.user.id],
      );
      return res.json({ user: u });
    }
    values.push(req.user.id);
    const updated = await db.one(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length}
         RETURNING id, name, email, role, phone, cpf, cnh, birthdate`,
      values,
    );
    res.json({ user: updated });
  } catch (err) { next(err); }
});

/* GET /api/profile/bookings — lista completa de bookings do cliente */
router.get('/bookings', async (req, res, next) => {
  try {
    const items = await db.all(
      `SELECT b.id, b.code, b.status, b.term_months, b.km_limit, b.start_date, b.end_date,
              b.monthly_price, b.total_price, b.payment_method, b.delivery_when, b.created_at,
              c.id AS car_id, c.brand, c.model, c.year, c.slug, c.category
         FROM bookings b JOIN cars c ON c.id = b.car_id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC`,
      [req.user.id],
    );
    res.json({ items });
  } catch (err) { next(err); }
});

/* GET /api/profile/invoices — todas as faturas do cliente, com info da reserva */
router.get('/invoices', async (req, res, next) => {
  try {
    const items = await db.all(
      `SELECT i.id, i.amount, i.due_date, i.paid, i.paid_at, i.booking_id,
              b.code AS booking_code, b.status AS booking_status,
              c.brand, c.model
         FROM invoices i
         JOIN bookings b ON b.id = i.booking_id
         JOIN cars     c ON c.id = b.car_id
        WHERE b.user_id = $1
        ORDER BY i.due_date ASC, i.id ASC`,
      [req.user.id],
    );
    res.json({ items });
  } catch (err) { next(err); }
});

/* GET /api/profile/favorites — todos favoritos */
router.get('/favorites', async (req, res, next) => {
  try {
    const items = await db.all(
      `SELECT c.*
         FROM favorites f JOIN cars c ON c.id = f.car_id
        WHERE f.user_id = $1
        ORDER BY f.created_at DESC`,
      [req.user.id],
    );
    res.json({ items });
  } catch (err) { next(err); }
});

module.exports = router;
