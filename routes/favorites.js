const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.post('/:carId/toggle', async (req, res, next) => {
  try {
    const carId = parseInt(req.params.carId, 10);
    const car = await db.one('SELECT id FROM cars WHERE id = $1', [carId]);
    if (!car) return res.status(404).json({ error: 'car_not_found' });

    const existing = await db.one(
      'SELECT 1 AS x FROM favorites WHERE user_id = $1 AND car_id = $2',
      [req.user.id, carId],
    );
    if (existing) {
      await db.query('DELETE FROM favorites WHERE user_id = $1 AND car_id = $2', [req.user.id, carId]);
      return res.json({ favored: false });
    }
    await db.query('INSERT INTO favorites (user_id, car_id) VALUES ($1, $2)', [req.user.id, carId]);
    res.json({ favored: true });
  } catch (err) { next(err); }
});

module.exports = router;
