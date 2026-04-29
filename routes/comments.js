const express = require('express');
const db = require('../db');
const { authRequired, blockRoles } = require('../middleware/auth');

const router = express.Router();

const MAX_BODY = 1000;

/* GET /api/comments/cars/:idOrSlug - publico, qualquer um pode ler */
router.get('/cars/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const car = /^\d+$/.test(idOrSlug)
      ? await db.one('SELECT id FROM cars WHERE id = $1', [parseInt(idOrSlug, 10)])
      : await db.one('SELECT id FROM cars WHERE slug = $1', [idOrSlug]);
    if (!car) return res.status(404).json({ error: 'not_found' });

    const items = await db.all(
      `SELECT cc.id, cc.body, cc.created_at,
              u.id AS user_id, u.name AS user_name, u.role AS user_role
         FROM car_comments cc
         JOIN users u ON u.id = cc.user_id
        WHERE cc.car_id = $1
        ORDER BY cc.created_at DESC`,
      [car.id],
    );
    res.json({ items });
  } catch (err) { next(err); }
});

/* POST /api/comments/cars/:idOrSlug - somente cliente (admin e proprietario nao comentam) */
router.post('/cars/:idOrSlug', authRequired, blockRoles('admin', 'proprietario'), async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const car = /^\d+$/.test(idOrSlug)
      ? await db.one('SELECT id FROM cars WHERE id = $1', [parseInt(idOrSlug, 10)])
      : await db.one('SELECT id FROM cars WHERE slug = $1', [idOrSlug]);
    if (!car) return res.status(404).json({ error: 'not_found' });

    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'empty_body' });
    if (body.length > MAX_BODY) return res.status(400).json({ error: 'body_too_long' });

    const row = await db.one(
      `INSERT INTO car_comments (car_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [car.id, req.user.id, body],
    );
    res.status(201).json({
      comment: {
        ...row,
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
      },
    });
  } catch (err) { next(err); }
});

/* DELETE /api/comments/:id - autor ou admin */
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await db.one('SELECT user_id FROM car_comments WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'not_found' });
    if (req.user.role !== 'admin' && row.user_id !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    await db.query('DELETE FROM car_comments WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
