const express = require('express');
const db = require('../db');
const { authRequired, blockRoles } = require('../middleware/auth');

const router = express.Router();

const MAX_BODY = 800;

/* GET /api/reviews/users/:id - publico, lista feedbacks recebidos */
router.get('/users/:id', async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (!targetId) return res.status(400).json({ error: 'invalid_id' });

    const target = await db.one(
      'SELECT id, name, role FROM users WHERE id = $1',
      [targetId],
    );
    if (!target) return res.status(404).json({ error: 'not_found' });

    const summary = await db.one(
      `SELECT COUNT(*)::int AS total,
              COALESCE(AVG(rating), 0)::float AS avg
         FROM profile_reviews WHERE target_id = $1`,
      [targetId],
    );

    const items = await db.all(
      `SELECT pr.id, pr.rating, pr.body, pr.created_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role
         FROM profile_reviews pr
         JOIN users u ON u.id = pr.author_id
        WHERE pr.target_id = $1
        ORDER BY pr.created_at DESC`,
      [targetId],
    );
    res.json({ target, summary, items });
  } catch (err) { next(err); }
});

/* GET /api/reviews/me - feedbacks recebidos pelo usuario logado */
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const summary = await db.one(
      `SELECT COUNT(*)::int AS total,
              COALESCE(AVG(rating), 0)::float AS avg
         FROM profile_reviews WHERE target_id = $1`,
      [req.user.id],
    );
    const items = await db.all(
      `SELECT pr.id, pr.rating, pr.body, pr.created_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role
         FROM profile_reviews pr
         JOIN users u ON u.id = pr.author_id
        WHERE pr.target_id = $1
        ORDER BY pr.created_at DESC`,
      [req.user.id],
    );
    res.json({ summary, items });
  } catch (err) { next(err); }
});

/* POST /api/reviews/users/:id - logado (exceto admin), exige reserva entre as partes.
   Proprietario PODE avaliar o cliente que alugou seu carro — eh acao do lado dono. */
router.post('/users/:id', authRequired, blockRoles('admin'), async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (!targetId) return res.status(400).json({ error: 'invalid_id' });
    if (targetId === req.user.id) return res.status(400).json({ error: 'cannot_self_review' });

    const rating = parseInt(req.body?.rating, 10);
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'invalid_rating' });

    const body = String(req.body?.body || '').trim();
    if (body.length > MAX_BODY) return res.status(400).json({ error: 'body_too_long' });

    // Exige uma reserva onde as duas partes participam
    // (cliente de um lado, proprietario do carro do outro, em qualquer direcao).
    const link = await db.one(
      `SELECT 1 FROM bookings b JOIN cars c ON c.id = b.car_id
        WHERE (b.user_id = $1 AND c.owner_id = $2)
           OR (b.user_id = $2 AND c.owner_id = $1)
        LIMIT 1`,
      [req.user.id, targetId],
    );
    if (!link) return res.status(403).json({ error: 'no_relationship' });

    const row = await db.one(
      `INSERT INTO profile_reviews (target_id, author_id, rating, body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (target_id, author_id) DO UPDATE
         SET rating = EXCLUDED.rating,
             body   = EXCLUDED.body,
             created_at = now()
       RETURNING id, rating, body, created_at`,
      [targetId, req.user.id, rating, body || null],
    );
    res.status(201).json({
      review: {
        ...row,
        author_id: req.user.id,
        author_name: req.user.name,
        author_role: req.user.role,
      },
    });
  } catch (err) { next(err); }
});

/* DELETE /api/reviews/:id - autor ou admin */
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await db.one('SELECT author_id FROM profile_reviews WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'not_found' });
    if (req.user.role !== 'admin' && row.author_id !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    await db.query('DELETE FROM profile_reviews WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
