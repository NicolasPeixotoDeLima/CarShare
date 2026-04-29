const express = require('express');
const db = require('../db');
const { authOptional, requireRole } = require('../middleware/auth');

const router = express.Router();

/* =============== PUBLIC LIST + DETAIL =============== */

router.get('/', authOptional, async (req, res, next) => {
  try {
    const {
      q, category, fuel, transmission, seats, hub,
      price_min, price_max, sort, limit, offset, owner,
    } = req.query;

    const where = [];
    const params = [];
    const push = (sqlFrag, value) => { params.push(value); where.push(sqlFrag.replace('$?', '$' + params.length)); };
    const pushIn = (col, csv) => {
      const values = String(csv).split(',').map(s => s.trim()).filter(Boolean);
      if (!values.length) return;
      const placeholders = values.map(v => { params.push(v); return '$' + params.length; });
      where.push(`${col} IN (${placeholders.join(',')})`);
    };

    if (q) {
      params.push(`%${q}%`);
      where.push(`(brand ILIKE $${params.length} OR model ILIKE $${params.length})`);
    }
    if (category)     pushIn('category', category);
    if (fuel)         pushIn('fuel', fuel);
    if (transmission) pushIn('transmission', transmission);
    if (hub)          pushIn('hub', hub);
    if (seats)        push('seats = $?', parseInt(seats, 10));
    if (price_min)    push('price_month >= $?', parseInt(price_min, 10));
    if (price_max)    push('price_month <= $?', parseInt(price_max, 10));

    // owner=me returns only cars owned by the caller (requires auth)
    if (owner === 'me') {
      if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
      push('owner_id = $?', req.user.id);
    } else if (owner === 'platform') {
      where.push('owner_id IS NULL');
    } else if (owner && /^\d+$/.test(owner)) {
      push('owner_id = $?', parseInt(owner, 10));
    }

    let order = 'ORDER BY created_at DESC, id DESC';
    if (sort === 'price_asc')  order = 'ORDER BY price_month ASC';
    if (sort === 'price_desc') order = 'ORDER BY price_month DESC';
    if (sort === 'newest')     order = 'ORDER BY year DESC, id DESC';
    if (sort === 'popular')    order = `ORDER BY (badge = 'popular') DESC, id DESC`;

    const lim = Math.min(parseInt(limit || '60', 10), 200);
    const off = Math.max(parseInt(offset || '0', 10), 0);
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const items = await db.all(
      `SELECT * FROM cars ${whereSql} ${order} LIMIT ${lim} OFFSET ${off}`,
      params,
    );
    const { c: total } = await db.one(
      `SELECT COUNT(*)::int AS c FROM cars ${whereSql}`,
      params,
    );
    res.json({ items, total, limit: lim, offset: off });
  } catch (err) { next(err); }
});

router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const row = /^\d+$/.test(idOrSlug)
      ? await db.one('SELECT * FROM cars WHERE id = $1', [parseInt(idOrSlug, 10)])
      : await db.one('SELECT * FROM cars WHERE slug = $1', [idOrSlug]);
    if (!row) return res.status(404).json({ error: 'not_found' });

    // Enriquece com rating real do proprietario (avg + total) calculado dinamicamente
    // a partir de profile_reviews. Pra carros sem owner (frota da plataforma)
    // fica { avg: 0, total: 0 }.
    let owner_rating = { avg: 0, total: 0 };
    if (row.owner_id) {
      const r = await db.one(
        `SELECT COUNT(*)::int AS total,
                COALESCE(AVG(rating), 0)::float AS avg
           FROM profile_reviews WHERE target_id = $1`,
        [row.owner_id],
      );
      owner_rating = { avg: r.avg, total: r.total };
    }
    res.json({ ...row, owner_rating });
  } catch (err) { next(err); }
});

/* =============== OWNER / ADMIN WRITES =============== */

const REQUIRED_FIELDS = [
  'slug', 'brand', 'model', 'year', 'category', 'fuel', 'transmission',
  'seats', 'hub', 'price_month',
];
const ALLOWED_CATEGORIES    = ['urbano','seda','suv','pickup','eletrico','luxo'];
const ALLOWED_FUELS         = ['flex','hibrido','eletrico','diesel'];
const ALLOWED_TRANSMISSIONS = ['automatico','cvt','manual'];
const ALLOWED_HUBS          = ['sao-paulo','rio','bh','curitiba','poa'];

function validatePayload(body) {
  for (const f of REQUIRED_FIELDS) {
    if (body[f] === undefined || body[f] === '' || body[f] === null) {
      return `missing_${f}`;
    }
  }
  if (!ALLOWED_CATEGORIES.includes(body.category))       return 'invalid_category';
  if (!ALLOWED_FUELS.includes(body.fuel))                return 'invalid_fuel';
  if (!ALLOWED_TRANSMISSIONS.includes(body.transmission))return 'invalid_transmission';
  if (!ALLOWED_HUBS.includes(body.hub))                  return 'invalid_hub';
  if (!/^[a-z0-9-]{3,}$/.test(body.slug))                return 'invalid_slug';

  // km_options: aceita undefined (usa default do schema) ou array nao-vazio.
  if (body.km_options !== undefined) {
    const err = validateKmOptions(body.km_options);
    if (err) return err;
  }
  return null;
}

/** Valida lista de franquias mensais. Retorna codigo de erro ou null. */
function validateKmOptions(opts) {
  if (!Array.isArray(opts) || opts.length === 0) return 'km_options_empty';
  const seen = new Set();
  for (const o of opts) {
    if (!o || typeof o !== 'object') return 'invalid_km_option';
    const v = String(o.value || '').trim();
    if (!v) return 'invalid_km_value';
    if (v !== 'livre' && !/^\d{2,6}$/.test(v)) return 'invalid_km_value';
    if (seen.has(v)) return 'duplicate_km_value';
    seen.add(v);
    const s = Number(o.surcharge);
    if (!Number.isFinite(s) || s < 0) return 'invalid_km_surcharge';
  }
  return null;
}

/** Normaliza km_options para gravacao: garante shape consistente. */
function normalizeKmOptions(opts) {
  return opts.map(o => ({
    value: String(o.value).trim(),
    surcharge: Math.round(Number(o.surcharge)),
  }));
}

const TERMS = ['1', '3', '6', '12'];

/** Valida term_prices: objeto com chaves '1','3','6','12' e valores numericos > 0. */
function validateTermPrices(tp) {
  if (!tp || typeof tp !== 'object' || Array.isArray(tp)) return 'invalid_term_prices';
  for (const t of TERMS) {
    if (tp[t] === undefined) return 'missing_term_price';
    const n = Number(tp[t]);
    if (!Number.isFinite(n) || n <= 0) return 'invalid_term_price';
  }
  return null;
}

function normalizeTermPrices(tp) {
  return TERMS.reduce((acc, t) => ({ ...acc, [t]: Math.round(Number(tp[t])) }), {});
}

// Apenas proprietarios anunciam carros. Admin nao opera como locador
// — pode editar/remover (moderacao) via PUT/DELETE abaixo.
router.post('/', requireRole('proprietario'), async (req, res, next) => {
  try {
    const err = validatePayload(req.body || {});
    if (err) return res.status(400).json({ error: err });

    const dup = await db.one('SELECT id FROM cars WHERE slug = $1', [req.body.slug]);
    if (dup) return res.status(409).json({ error: 'slug_taken' });

    const ownerId = req.user.id;
    const km = req.body.km_options
      ? normalizeKmOptions(req.body.km_options)
      : null;

    // term_prices: valida se enviado, senao deriva do price_month com descontos historicos
    let termPrices = null;
    if (req.body.term_prices !== undefined) {
      const tpErr = validateTermPrices(req.body.term_prices);
      if (tpErr) return res.status(400).json({ error: tpErr });
      termPrices = normalizeTermPrices(req.body.term_prices);
    } else {
      const base = Number(req.body.price_month);
      termPrices = {
        '1':  base,
        '3':  Math.round(base * 0.95),
        '6':  Math.round(base * 0.92),
        '12': Math.round(base * 0.88),
      };
    }

    const row = await db.one(
      `INSERT INTO cars (slug, owner_id, brand, model, year, category, fuel, transmission,
        seats, range_km, power_hp, delivery_hours, hub, price_month, badge, description, stock,
        km_options, term_prices)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
         COALESCE($18::jsonb, '[
           {"value":"1500","surcharge":0},
           {"value":"2500","surcharge":180},
           {"value":"livre","surcharge":420}
         ]'::jsonb),
         $19::jsonb)
       RETURNING *`,
      [
        req.body.slug, ownerId, req.body.brand, req.body.model, req.body.year,
        req.body.category, req.body.fuel, req.body.transmission,
        req.body.seats, req.body.range_km || null, req.body.power_hp || null,
        req.body.delivery_hours || 48, req.body.hub, req.body.price_month,
        req.body.badge || null, req.body.description || null, req.body.stock ?? 1,
        km ? JSON.stringify(km) : null,
        JSON.stringify(termPrices),
      ],
    );
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// Owner of the car OR admin. Fields are patch-style — undefined keeps old value.
router.put('/:id', requireRole('proprietario', 'admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const car = await db.one('SELECT * FROM cars WHERE id = $1', [id]);
    if (!car) return res.status(404).json({ error: 'not_found' });

    if (req.user.role !== 'admin' && car.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const patchable = [
      'brand','model','year','category','fuel','transmission','seats',
      'range_km','power_hp','delivery_hours','hub','price_month',
      'badge','description','stock',
    ];
    const sets = [];
    const values = [];
    for (const f of patchable) {
      if (req.body[f] !== undefined) {
        values.push(req.body[f]);
        sets.push(`${f} = $${values.length}`);
      }
    }

    if (req.body.km_options !== undefined) {
      const errCode = validateKmOptions(req.body.km_options);
      if (errCode) return res.status(400).json({ error: errCode });
      values.push(JSON.stringify(normalizeKmOptions(req.body.km_options)));
      sets.push(`km_options = $${values.length}::jsonb`);
    }

    if (req.body.term_prices !== undefined) {
      const errCode = validateTermPrices(req.body.term_prices);
      if (errCode) return res.status(400).json({ error: errCode });
      values.push(JSON.stringify(normalizeTermPrices(req.body.term_prices)));
      sets.push(`term_prices = $${values.length}::jsonb`);
    }

    if (!sets.length) return res.json(car);

    values.push(id);
    const updated = await db.one(
      `UPDATE cars SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('proprietario', 'admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const car = await db.one('SELECT owner_id FROM cars WHERE id = $1', [id]);
    if (!car) return res.status(404).json({ error: 'not_found' });
    if (req.user.role !== 'admin' && car.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    await db.query('DELETE FROM cars WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
