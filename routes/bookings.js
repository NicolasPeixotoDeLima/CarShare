const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const EXTRAS_PRICES = {
  seguro_plus:       190,
  manutencao_premium: 120,
  motorista_extra:    60,
  wallbox:            90,
};

const KM_SURCHARGE = { '1500': 0, '2500': 180, 'livre': 420 };

function genCode() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `CS-${n}`;
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

router.post('/', async (req, res, next) => {
  try {
    const {
      car_id, term_months, km_limit, extras = [],
      start_date, delivery_addr, delivery_when, payment_method,
      personal,
    } = req.body || {};

    const car = await db.one('SELECT * FROM cars WHERE id = $1', [parseInt(car_id, 10)]);
    if (!car) return res.status(400).json({ error: 'invalid_car' });

    const term = parseInt(term_months, 10);
    if (![1, 3, 6, 12].includes(term)) return res.status(400).json({ error: 'invalid_term' });
    if (!['1500', '2500', 'livre'].includes(String(km_limit))) return res.status(400).json({ error: 'invalid_km' });

    const extraList = Array.isArray(extras) ? extras.filter(e => EXTRAS_PRICES[e] !== undefined) : [];
    const extrasCost = extraList.reduce((s, k) => s + EXTRAS_PRICES[k], 0);
    const kmCost = KM_SURCHARGE[String(km_limit)] || 0;

    let monthlyPrice = car.price_month + extrasCost + kmCost;
    if (term === 3)  monthlyPrice = Math.round(monthlyPrice * 0.95);
    if (term === 6)  monthlyPrice = Math.round(monthlyPrice * 0.92);
    if (term === 12) monthlyPrice = Math.round(monthlyPrice * 0.88);

    const totalPrice = monthlyPrice * term;
    const start = start_date || new Date().toISOString().slice(0, 10);
    const end   = addMonths(start, term);
    const code  = genCode();

    // Booking + invoices atomically.
    const booking = await db.tx(async (client) => {
      if (personal) {
        await client.query(
          `UPDATE users SET
             name      = COALESCE(NULLIF($1,''), name),
             cpf       = COALESCE(NULLIF($2,''), cpf),
             cnh       = COALESCE(NULLIF($3,''), cnh),
             phone     = COALESCE(NULLIF($4,''), phone),
             birthdate = CASE WHEN $5 = '' OR $5 IS NULL THEN birthdate ELSE $5::date END
           WHERE id = $6`,
          [
            personal.name || '', personal.cpf || '', personal.cnh || '',
            personal.phone || '', personal.birthdate || '', req.user.id,
          ],
        );
      }

      const { rows } = await client.query(
        `INSERT INTO bookings (code, user_id, car_id, term_months, km_limit, extras,
           start_date, end_date, monthly_price, total_price,
           delivery_addr, delivery_when, payment_method, status)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,'scheduled')
         RETURNING *`,
        [
          code, req.user.id, car.id, term, String(km_limit),
          JSON.stringify(extraList),
          start, end, monthlyPrice, totalPrice,
          delivery_addr || null, delivery_when || null, payment_method || null,
        ],
      );
      const b = rows[0];

      for (let i = 0; i < term; i++) {
        await client.query(
          'INSERT INTO invoices (booking_id, amount, due_date) VALUES ($1, $2, $3)',
          [b.id, monthlyPrice, addMonths(start, i)],
        );
      }
      return b;
    });

    booking.car = car;
    res.status(201).json({ booking });
  } catch (err) { next(err); }
});

router.get('/:code', async (req, res, next) => {
  try {
    const row = await db.one(
      `SELECT b.*, c.brand, c.model, c.year, c.category, c.slug
       FROM bookings b JOIN cars c ON c.id = b.car_id
       WHERE b.code = $1 AND b.user_id = $2`,
      [req.params.code, req.user.id],
    );
    if (!row) return res.status(404).json({ error: 'not_found' });
    const invoices = await db.all(
      'SELECT * FROM invoices WHERE booking_id = $1 ORDER BY due_date ASC',
      [row.id],
    );
    res.json({ booking: row, invoices });
  } catch (err) { next(err); }
});

module.exports = router;
