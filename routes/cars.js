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
    res.json(row);
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
  return null;
}

// Proprietarios and admins can publish cars. The proprietario can only list
// cars under their own ownership; admin can also assign owner_id explicitly.
router.post('/', requireRole('proprietario', 'admin'), async (req, res, next) => {
  try {
    const err = validatePayload(req.body || {});
    if (err) return res.status(400).json({ error: err });

    const dup = await db.one('SELECT id FROM cars WHERE slug = $1', [req.body.slug]);
    if (dup) return res.status(409).json({ error: 'slug_taken' });

    const ownerId = req.user.role === 'admin' && req.body.owner_id
      ? parseInt(req.body.owner_id, 10)
      : req.user.id;

    const row = await db.one(
      `INSERT INTO cars (slug, owner_id, brand, model, year, category, fuel, transmission,
        seats, range_km, power_hp, delivery_hours, hub, price_month, badge, description, stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        req.body.slug, ownerId, req.body.brand, req.body.model, req.body.year,
        req.body.category, req.body.fuel, req.body.transmission,
        req.body.seats, req.body.range_km || null, req.body.power_hp || null,
        req.body.delivery_hours || 48, req.body.hub, req.body.price_month,
        req.body.badge || null, req.body.description || null, req.body.stock ?? 1,
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
