import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { Pager } from '../../components/Pager';
import { EmptyState } from '../../components/EmptyState';
import { FiltersBar } from '../../components/FiltersBar';
import { Select } from '../../components/Select';
import { api, fmt } from '../../lib/api';
import type { AdminBookingRow, BookingStatus } from '../../lib/types';

const PAGE = 50;
const STATUSES: BookingStatus[] = ['active', 'scheduled', 'finished', 'cancelled'];

export function AdminBookings() {
  const [items, setItems] = useState<AdminBookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.admin.bookings({
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

  async function changeStatus(id: number, newStatus: BookingStatus) {
    try {
      await api.admin.updateBooking(id, { status: newStatus });
      await load();
    } catch (e: unknown) {
      alert('Erro: ' + ((e as { code?: string }).code || 'falha'));
    }
  }

  return (
    <AdminLayout subtitle="Gestão · operações" title="Reservas">
      <div className="panel">
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
          <EmptyState>Nenhuma reserva encontrada.</EmptyState>
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
                <th className="right">Total</th>
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
                  <td>
                    <div>{b.brand} {b.model}</div>
                    <div className="mono">{b.year}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {fmt.date(b.start_date)} → {fmt.date(b.end_date)}
                  </td>
                  <td>{b.term_months}m</td>
                  <td className="right num">{fmt.brl(b.monthly_price)}</td>
                  <td className="right num">{fmt.brl(b.total_price)}</td>
                  <td>
                    <Select
                      size="sm"
                      value={b.status}
                      onChange={v => changeStatus(b.id, v as BookingStatus)}
                      options={STATUSES.map(s => ({ value: s, label: s }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pager offset={offset} pageSize={PAGE} total={total} onChange={setOffset} />
      </div>
    </AdminLayout>
  );
}
