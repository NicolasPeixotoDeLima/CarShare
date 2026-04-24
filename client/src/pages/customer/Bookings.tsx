import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomerLayout } from './CustomerLayout';
import { api, fmt, LABELS } from '../../lib/api';
import type { UserBookingRow } from '../../lib/types';

export function Bookings() {
  const [items, setItems] = useState<UserBookingRow[] | null>(null);

  useEffect(() => {
    let cancel = false;
    api.profile.bookings()
      .then(r => { if (!cancel) setItems(r.items); })
      .catch(() => { if (!cancel) setItems([]); });
    return () => { cancel = true; };
  }, []);

  return (
    <CustomerLayout title="Minhas reservas" subtitle="Histórico completo">
      {items === null ? (
        <div className="c-empty">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="c-empty">
          Nenhuma reserva ainda.<br />
          <Link to="/fleet" style={{ color: 'var(--amber)', marginTop: 12, display: 'inline-block' }}>
            Explorar a frota →
          </Link>
        </div>
      ) : (
        <div className="c-list">
          {items.map((b, i) => (
            <Link key={b.id} to={`/car?slug=${b.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="c-row" style={{ gridTemplateColumns: '1fr auto auto auto', ['--i' as never]: i }}>
                <div>
                  <div className="c-row__title">
                    {b.brand} {b.model} <span style={{ color: 'var(--fg-mute)', fontWeight: 400 }}>· {b.year}</span>
                  </div>
                  <div className="c-row__sub">
                    {b.code} · {fmt.date(b.start_date)} → {fmt.date(b.end_date)} · {LABELS.km[b.km_limit]}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    Mensal
                  </div>
                  <div className="c-row__amt">{fmt.brl(b.monthly_price)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    Prazo
                  </div>
                  <div className="c-row__amt">{b.term_months}m</div>
                </div>
                <span className={`tag tag--${b.status}`}>{b.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
