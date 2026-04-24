import { useEffect, useState, useCallback } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { api, fmt } from '../../lib/api';
import type { OwnerBookingRow, BookingStatus } from '../../lib/types';

const PAGE = 50;
const STATUSES: BookingStatus[] = ['active', 'scheduled', 'finished', 'cancelled'];

export function OwnerBookings() {
  const [items, setItems] = useState<OwnerBookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.owner.bookings({
        status: status || undefined,
        q: q || undefined,
        limit: PAGE,
        offset,
      });
      setItems(r.items);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  }, [status, q, offset]);

  useEffect(() => { void load(); }, [load]);

  return (
    <OwnerLayout subtitle="Operação · clientes" title="Reservas dos meus carros">
      <div className="panel">
        <div className="filters">
          <input
            type="search"
            placeholder="Buscar código, email ou nome…"
            value={q}
            onChange={e => { setOffset(0); setQ(e.target.value); }}
          />
          <select value={status} onChange={e => { setOffset(0); setStatus(e.target.value as BookingStatus | ''); }}>
            <option value="">Todos os status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--fg-mute)', alignSelf: 'center' }}>
            {total} {total === 1 ? 'reserva' : 'reservas'}
          </span>
        </div>

        {loading && !items.length ? (
          <div className="empty">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="empty">Nenhuma reserva nos seus carros ainda.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Carro</th>
                <th>Período</th>
                <th>Prazo</th>
                <th className="right">Mensal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b, i) => (
                <tr key={b.id} style={{ ['--i' as never]: i }}>
                  <td className="mono">{b.code}</td>
                  <td>
                    <div>{b.user_name}</div>
                    <div className="mono">{b.user_email}</div>
                  </td>
                  <td>{b.brand} {b.model}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {fmt.date(b.start_date)} → {fmt.date(b.end_date)}
                  </td>
                  <td>{b.term_months}m</td>
                  <td className="right num">{fmt.brl(b.monthly_price)}</td>
                  <td><span className={`tag tag--${b.status}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pager">
          <span>
            {Math.min(offset + 1, total)}–{Math.min(offset + PAGE, total)} de {total}
          </span>
          <div className="pager__btns">
            <button
              className="btn btn--xs"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE))}
            >← anterior</button>
            <button
              className="btn btn--xs"
              disabled={offset + PAGE >= total}
              onClick={() => setOffset(offset + PAGE)}
            >próxima →</button>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}
