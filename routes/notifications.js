const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

/**
 * Agregador leve de notificacoes para o usuario logado:
 *   - mensagens nao lidas (1 por thread)
 *   - novas reservas em carros do proprietario (ultimos 7 dias)
 *   - faturas vencendo nos proximos 7 dias para o cliente
 *
 * Tudo deduzido das tabelas existentes — sem store dedicada.
 */
router.get('/', async (req, res, next) => {
  try {
    const me = req.user.id;
    const items = [];

    // 1) mensagens nao lidas (por thread)
    const msgs = await db.all(
      `SELECT b.code, c.brand, c.model,
              (SELECT m.body FROM messages m
                 WHERE m.booking_id = b.id AND m.sender_id <> $1 AND m.read_at IS NULL
                 ORDER BY m.created_at DESC LIMIT 1) AS body,
              (SELECT m.created_at FROM messages m
                 WHERE m.booking_id = b.id AND m.sender_id <> $1 AND m.read_at IS NULL
                 ORDER BY m.created_at DESC LIMIT 1) AS at,
              (SELECT u.name FROM messages m JOIN users u ON u.id = m.sender_id
                 WHERE m.booking_id = b.id AND m.sender_id <> $1 AND m.read_at IS NULL
                 ORDER BY m.created_at DESC LIMIT 1) AS sender,
              (SELECT COUNT(*)::int FROM messages m
                 WHERE m.booking_id = b.id AND m.sender_id <> $1 AND m.read_at IS NULL) AS count
         FROM bookings b
         JOIN cars c ON c.id = b.car_id
        WHERE c.owner_id IS NOT NULL
          AND (b.user_id = $1 OR c.owner_id = $1)`,
      [me],
    );
    for (const m of msgs) {
      if (!m.body) continue;
      items.push({
        id: 'msg-' + m.code,
        type: 'message',
        title: `Nova mensagem de ${m.sender}`,
        body: m.body,
        meta: `${m.brand} ${m.model} · ${m.code}${m.count > 1 ? ` · ${m.count} novas` : ''}`,
        link: '/chat?code=' + m.code,
        at: m.at,
        unread: true,
      });
    }

    // 2) reservas recentes nos carros do proprietario (ultimos 7 dias)
    if (req.user.role === 'proprietario' || req.user.role === 'admin') {
      const newBookings = await db.all(
        `SELECT b.code, b.created_at, b.monthly_price, b.term_months,
                u.name AS client_name, c.brand, c.model
           FROM bookings b
           JOIN cars  c ON c.id = b.car_id
           JOIN users u ON u.id = b.user_id
          WHERE c.owner_id = $1
            AND b.created_at > now() - interval '7 days'
          ORDER BY b.created_at DESC
          LIMIT 10`,
        [me],
      );
      for (const b of newBookings) {
        items.push({
          id: 'book-' + b.code,
          type: 'booking',
          title: `${b.client_name} reservou um carro`,
          body: `${b.brand} ${b.model} · ${b.term_months}m`,
          meta: b.code,
          link: '/owner/bookings',
          at: b.created_at,
          unread: false,
        });
      }
    }

    // 3) faturas vencendo nos proximos 7 dias para clientes
    const invoices = await db.all(
      `SELECT i.id, i.amount, i.due_date, b.code, c.brand, c.model
         FROM invoices i
         JOIN bookings b ON b.id = i.booking_id
         JOIN cars c ON c.id = b.car_id
        WHERE b.user_id = $1
          AND i.paid = FALSE
          AND i.due_date <= (current_date + interval '7 days')
          AND i.due_date >= current_date
        ORDER BY i.due_date ASC
        LIMIT 5`,
      [me],
    );
    for (const inv of invoices) {
      items.push({
        id: 'inv-' + inv.id,
        type: 'invoice',
        title: 'Fatura próxima do vencimento',
        body: `${inv.brand} ${inv.model} · R$ ${Number(inv.amount).toLocaleString('pt-BR')}`,
        meta: inv.code,
        link: '/invoices',
        at: inv.due_date,
        unread: false,
      });
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const unread = items.filter(i => i.unread).length;
    res.json({ items: items.slice(0, 20), unread });
  } catch (err) { next(err); }
});

module.exports = router;
