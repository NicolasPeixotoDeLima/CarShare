const express = require('express');
const db = require('../db');
const { authRequired, blockRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);
// Reservar/alugar carro é exclusivo de cliente. Admin nao opera como usuario;
// proprietario possui carros — nao deve aluga-los como cliente.
router.use(blockRoles('admin', 'proprietario'));

const EXTRAS_PRICES = {
  seguro_plus:       190,
  manutencao_premium: 120,
  motorista_extra:    60,
  wallbox:            90,
};

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

    // Valida km_limit contra as opcoes oferecidas pelo proprietario do carro
    const carKmOptions = Array.isArray(car.km_options) ? car.km_options : [];
    const chosen = carKmOptions.find(o => String(o.value) === String(km_limit));
    if (!chosen) return res.status(400).json({ error: 'invalid_km' });

    const extraList = Array.isArray(extras) ? extras.filter(e => EXTRAS_PRICES[e] !== undefined) : [];
    const extrasCost = extraList.reduce((s, k) => s + EXTRAS_PRICES[k], 0);
    const kmCost = Number(chosen.surcharge) || 0;

    // Preco por prazo definido pelo proprietario (term_prices). Fallback histo-
    // rico (descontos fixos) caso o carro nao tenha o JSON setado por algum motivo.
    const tp = car.term_prices || {};
    const baseForTerm = Number(tp[String(term)]);
    let monthlyPrice;
    if (Number.isFinite(baseForTerm) && baseForTerm > 0) {
      monthlyPrice = baseForTerm + extrasCost + kmCost;
    } else {
      monthlyPrice = car.price_month + extrasCost + kmCost;
      if (term === 3)  monthlyPrice = Math.round(monthlyPrice * 0.95);
      if (term === 6)  monthlyPrice = Math.round(monthlyPrice * 0.92);
      if (term === 12) monthlyPrice = Math.round(monthlyPrice * 0.88);
    }

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

/** Calcula multa de quebra de contrato:
 *  30% sobre os meses restantes (arredondado pra cima) × mensalidade. */
function calcCancellationFee(booking) {
  const start = new Date(booking.start_date).getTime();
  const today = Date.now();
  const monthMs = 1000 * 60 * 60 * 24 * 30;
  const elapsedMonths = Math.max(0, Math.floor((today - start) / monthMs));
  const remaining = Math.max(0, booking.term_months - elapsedMonths);
  return Math.round(remaining * booking.monthly_price * 0.3);
}

/* PATCH /api/bookings/:code — acoes do cliente:
   - confirm_delivery : confirma que recebeu o carro (transita scheduled→active)
   - cancel           : quebra contrato e calcula multa */
router.patch('/:code', async (req, res, next) => {
  try {
    const { action, reason } = req.body || {};
    const row = await db.one(
      'SELECT * FROM bookings WHERE code = $1 AND user_id = $2',
      [req.params.code, req.user.id],
    );
    if (!row) return res.status(404).json({ error: 'not_found' });

    if (action === 'confirm_delivery') {
      if (!row.delivered_at) return res.status(400).json({ error: 'not_yet_delivered' });
      if (row.delivery_confirmed_at) return res.status(400).json({ error: 'already_confirmed' });
      const updated = await db.one(
        `UPDATE bookings
            SET delivery_confirmed_at = now(), status = 'active'
          WHERE id = $1 RETURNING *`,
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

    return res.status(400).json({ error: 'invalid_action' });
  } catch (err) { next(err); }
});

module.exports = router;
