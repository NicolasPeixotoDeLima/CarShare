import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CustomerLayout } from './CustomerLayout';
import { StatusTag } from '../../components/StatusTag';
import { BookingActions, BookingStatusHint } from '../../components/BookingActions';
import { ReviewPrompt } from '../../components/ReviewPrompt';
import { api, fmt } from '../../lib/api';
import type { UserBookingRow } from '../../lib/types';

export function Bookings() {
  const [items, setItems] = useState<UserBookingRow[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.profile.bookings();
      setItems(r.items);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <CustomerLayout requiredRole="cliente" title="Minhas reservas" subtitle="Histórico completo">
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
            <div key={b.id} className="c-row" style={{ gridTemplateColumns: '1fr', gap: 12, ['--i' as never]: i }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 18, alignItems: 'center' }}>
                <div>
                  <Link to={`/car?slug=${b.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="c-row__title">
                      {b.brand} {b.model} <span style={{ color: 'var(--fg-mute)', fontWeight: 400 }}>· {b.year}</span>
                    </div>
                  </Link>
                  <div className="c-row__sub">
                    {b.code} · {fmt.date(b.start_date)} → {fmt.date(b.end_date)} · {fmt.km(b.km_limit)}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <BookingStatusHint booking={b} side="cliente" />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Mensal</div>
                  <div className="c-row__amt">{fmt.brl(b.monthly_price)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Prazo</div>
                  <div className="c-row__amt">{b.term_months}m</div>
                </div>
                <StatusTag variant={b.status} />
              </div>

              {/* Acoes contextuais (confirmar entrega, quebrar contrato) */}
              <BookingActions booking={b} side="cliente" onChanged={load} compact />

              {/* Prompt de avaliacao apos finalizado */}
              {b.status === 'finished' && b.owner_id && (
                <ReviewPrompt
                  bookingCode={b.code}
                  targetUserId={b.owner_id}
                  targetLabel="o proprietário"
                  onSubmitted={load}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
