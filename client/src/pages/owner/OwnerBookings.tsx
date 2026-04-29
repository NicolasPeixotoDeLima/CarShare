import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { OwnerLayout } from './OwnerLayout';
import { Pager } from '../../components/Pager';
import { EmptyState } from '../../components/EmptyState';
import { FiltersBar } from '../../components/FiltersBar';
import { StatusTag } from '../../components/StatusTag';
import { Select } from '../../components/Select';
import { BookingActions, BookingStatusHint } from '../../components/BookingActions';
import { ReviewPrompt } from '../../components/ReviewPrompt';
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
      <div className="panel" style={{ padding: 0 }}>
        <FiltersBar count={`${total} ${total === 1 ? 'reserva' : 'reservas'}`}>
          <input
            type="search"
            placeholder="Buscar código, email ou nome…"
            value={q}
            onChange={e => { setOffset(0); setQ(e.target.value); }}
          />
          <Select
            size="sm"
            value={status}
            onChange={v => { setOffset(0); setStatus(v as BookingStatus | ''); }}
            options={[
              { value: '', label: 'Todos os status' },
              ...STATUSES.map(s => ({ value: s, label: s })),
            ]}
          />
        </FiltersBar>

        {loading && !items.length ? (
          <EmptyState>Carregando…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Nenhuma reserva nos seus carros ainda.</EmptyState>
        ) : (
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((b, i) => (
              <article
                key={b.id}
                className="c-row"
                style={{
                  display: 'flex', flexDirection: 'column', gap: 10,
                  padding: 18, ['--i' as never]: i,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16, alignItems: 'center' }}>
                  <div>
                    <div className="c-row__title">{b.brand} {b.model}</div>
                    <div className="c-row__sub">
                      <strong style={{ fontWeight: 500 }}>{b.user_name}</strong>
                      {' · '}
                      <span className="mono">{b.user_email}</span>
                      {' · '}
                      <span className="mono">{b.code}</span>
                    </div>
                    <div className="c-row__sub mono" style={{ marginTop: 2, fontSize: 11 }}>
                      {fmt.date(b.start_date)} → {fmt.date(b.end_date)} · {b.term_months}m
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <BookingStatusHint booking={b} side="owner" />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--fg-mute)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Mensal</div>
                    <div className="c-row__amt">{fmt.brl(b.monthly_price)}</div>
                  </div>
                  <StatusTag variant={b.status} />
                  <Link to={`/chat?code=${b.code}`} className="btn btn--xs">
                    ✉ chat
                  </Link>
                </div>

                <BookingActions booking={b} side="owner" onChanged={load} compact />

                {b.status === 'finished' && b.user_id && (
                  <ReviewPrompt
                    bookingCode={b.code}
                    targetUserId={b.user_id}
                    targetLabel="o cliente"
                    onSubmitted={load}
                  />
                )}
              </article>
            ))}
          </div>
        )}

        <Pager offset={offset} pageSize={PAGE} total={total} onChange={setOffset} />
      </div>
    </OwnerLayout>
  );
}
