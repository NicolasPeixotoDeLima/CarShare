import { useEffect, useState, useCallback } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { Pager } from '../../components/Pager';
import { EmptyState } from '../../components/EmptyState';
import { FiltersBar } from '../../components/FiltersBar';
import { StatusTag } from '../../components/StatusTag';
import { api, fmt } from '../../lib/api';
import type { OwnerInvoiceRow } from '../../lib/types';

const PAGE = 50;

type Filter = 'all' | 'open' | 'paid' | 'overdue';

const FILTER_LABEL: Record<Filter, string> = {
  all: 'Todas', open: 'Em aberto', overdue: 'Vencidas', paid: 'Pagas',
};

export function OwnerInvoices() {
  const [items, setItems] = useState<OwnerInvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: { paid?: boolean; overdue?: boolean; q?: string; limit: number; offset: number } = {
        limit: PAGE, offset,
      };
      if (filter === 'open')    params.paid = false;
      if (filter === 'paid')    params.paid = true;
      if (filter === 'overdue') params.overdue = true;
      if (q) params.q = q;
      const r = await api.owner.invoices(params);
      setItems(r.items);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  }, [filter, offset, q]);

  useEffect(() => { void load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const totalOpen = items.filter(i => !i.paid).reduce((s, i) => s + i.amount, 0);
  const totalOverdue = items.filter(i => !i.paid && i.due_date < today).reduce((s, i) => s + i.amount, 0);

  return (
    <OwnerLayout subtitle="Operação · cobrança" title="Faturas dos clientes">
      <div className="panel" style={{ marginBottom: 16, padding: 18, display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--fg-mute)', fontFamily: "'Geist Mono', monospace", letterSpacing: '.06em', textTransform: 'uppercase' }}>
          Resumo da página
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)' }}>Em aberto</div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26 }}>{fmt.brl(totalOpen)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-mute)' }}>Vencidas</div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: totalOverdue > 0 ? 'var(--danger)' : undefined }}>
              {fmt.brl(totalOverdue)}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <FiltersBar count={`${total} ${total === 1 ? 'fatura' : 'faturas'}`}>
          {(['all', 'open', 'overdue', 'paid'] as Filter[]).map(f => (
            <button
              key={f}
              className={'btn btn--xs ' + (filter === f ? 'btn--primary' : '')}
              onClick={() => { setOffset(0); setFilter(f); }}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
          <input
            type="search"
            placeholder="Buscar código, email ou nome…"
            value={q}
            onChange={e => { setOffset(0); setQ(e.target.value); }}
          />
        </FiltersBar>

        {loading && !items.length ? (
          <EmptyState>Carregando…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Nenhuma fatura encontrada nos seus carros.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Cliente</th>
                <th>Carro</th>
                <th>Vencimento</th>
                <th className="right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv, i) => {
                const overdue = !inv.paid && inv.due_date < today;
                const tag = inv.paid ? 'paid' : overdue ? 'overdue' : 'open';
                const tagLabel = inv.paid ? 'paga' : overdue ? 'vencida' : 'em aberto';
                return (
                  <tr key={inv.id} style={{ ['--i' as never]: i }}>
                    <td className="mono">{inv.booking_code}</td>
                    <td>
                      <div>{inv.user_name}</div>
                      <div className="mono" style={{ fontSize: 11 }}>{inv.user_email}</div>
                    </td>
                    <td>{inv.brand} {inv.model}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{fmt.dateLong(inv.due_date)}</td>
                    <td className="right num">{fmt.brl(inv.amount)}</td>
                    <td><StatusTag variant={tag}>{tagLabel}</StatusTag></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pager offset={offset} pageSize={PAGE} total={total} onChange={setOffset} />
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--fg-mute)', fontFamily: "'Geist Mono', monospace" }}>
        Visualização somente leitura — confirmações de pagamento são processadas pela plataforma.
      </div>
    </OwnerLayout>
  );
}
