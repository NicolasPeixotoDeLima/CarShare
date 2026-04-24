import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { api, fmt } from '../../lib/api';
import type { AdminInvoiceRow } from '../../lib/types';

const PAGE = 50;

type Filter = 'all' | 'open' | 'paid' | 'overdue';

export function AdminInvoices() {
  const [items, setItems] = useState<AdminInvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: { paid?: boolean; overdue?: boolean; limit: number; offset: number } = {
        limit: PAGE, offset,
      };
      if (filter === 'open')    params.paid = false;
      if (filter === 'paid')    params.paid = true;
      if (filter === 'overdue') params.overdue = true;
      const r = await api.admin.invoices(params);
      setItems(r.items);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  }, [filter, offset]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(inv: AdminInvoiceRow) {
    try {
      await api.admin.updateInvoice(inv.id, { paid: !inv.paid });
      await load();
    } catch (e: unknown) {
      alert('Erro: ' + ((e as { code?: string }).code || 'falha'));
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AdminLayout subtitle="Gestão · cobrança" title="Faturas">
      <div className="panel">
        <div className="filters">
          {(['all', 'open', 'overdue', 'paid'] as Filter[]).map(f => (
            <button
              key={f}
              className={'btn btn--xs ' + (filter === f ? 'btn--primary' : '')}
              onClick={() => { setOffset(0); setFilter(f); }}
            >
              {f === 'all' ? 'Todas' : f === 'open' ? 'Em aberto' : f === 'overdue' ? 'Vencidas' : 'Pagas'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--fg-mute)', alignSelf: 'center' }}>
            {total} {total === 1 ? 'fatura' : 'faturas'}
          </span>
        </div>

        {loading && !items.length ? (
          <div className="empty">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="empty">Nenhuma fatura encontrada.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Reserva</th>
                <th>Cliente</th>
                <th>Carro</th>
                <th>Vencimento</th>
                <th className="right">Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv, i) => {
                const overdue = !inv.paid && inv.due_date < today;
                const tag = inv.paid ? 'paid' : overdue ? 'overdue' : 'open';
                const tagLabel = inv.paid ? 'paga' : overdue ? 'vencida' : 'em aberto';
                return (
                  <tr key={inv.id} style={{ ['--i' as never]: i }}>
                    <td className="mono">#{inv.id}</td>
                    <td className="mono">{inv.booking_code}</td>
                    <td>
                      <div>{inv.user_name}</div>
                      <div className="mono">{inv.user_email}</div>
                    </td>
                    <td>{inv.brand} {inv.model}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{fmt.dateLong(inv.due_date)}</td>
                    <td className="right num">{fmt.brl(inv.amount)}</td>
                    <td><span className={`tag tag--${tag}`}>{tagLabel}</span></td>
                    <td className="right">
                      <button className="btn btn--xs" onClick={() => toggle(inv)}>
                        {inv.paid ? 'Marcar não paga' : 'Marcar paga'}
                      </button>
                    </td>
                  </tr>
                );
              })}
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
    </AdminLayout>
  );
}
