import { useEffect, useState } from 'react';
import { CustomerLayout } from './CustomerLayout';
import { api, fmt } from '../../lib/api';
import type { UserInvoiceRow } from '../../lib/types';

export function Invoices() {
  const [items, setItems] = useState<UserInvoiceRow[] | null>(null);

  useEffect(() => {
    let cancel = false;
    api.profile.invoices()
      .then(r => { if (!cancel) setItems(r.items); })
      .catch(() => { if (!cancel) setItems([]); });
    return () => { cancel = true; };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const total      = items?.reduce((s, i) => s + i.amount, 0) ?? 0;
  const paidSum    = items?.filter(i => i.paid).reduce((s, i) => s + i.amount, 0) ?? 0;
  const overdueSum = items?.filter(i => !i.paid && i.due_date < today).reduce((s, i) => s + i.amount, 0) ?? 0;

  return (
    <CustomerLayout title="Faturas" subtitle="Cobranças mensais">
      {items === null ? (
        <div className="c-empty">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="c-empty">Nenhuma fatura ainda.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
            <Stat i={0} k="Total cobrado"       v={fmt.brl(total)} />
            <Stat i={1} k="Já pago"             v={fmt.brl(paidSum)}    color="var(--signal)" />
            <Stat i={2} k="Vencido em aberto"   v={fmt.brl(overdueSum)} color={overdueSum > 0 ? 'var(--danger)' : undefined} />
          </div>
          <div className="c-list">
            {items.map((inv, i) => {
              const overdue = !inv.paid && inv.due_date < today;
              const tag = inv.paid ? 'paid' : overdue ? 'overdue' : 'open';
              const tagLabel = inv.paid ? 'paga' : overdue ? 'vencida' : 'em aberto';
              return (
                <div key={inv.id} className="c-row" style={{ ['--i' as never]: i }}>
                  <div>
                    <div className="c-row__title">
                      {inv.brand} {inv.model}
                    </div>
                    <div className="c-row__sub">
                      Reserva {inv.booking_code} · vencimento {fmt.dateLong(inv.due_date)}
                      {inv.paid && inv.paid_at && ` · paga em ${fmt.dateLong(inv.paid_at)}`}
                    </div>
                  </div>
                  <div className="c-row__amt">{fmt.brl(inv.amount)}</div>
                  <span className={`tag tag--${tag}`}>{tagLabel}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </CustomerLayout>
  );
}

function Stat({ k, v, color, i }: { k: string; v: string; color?: string; i: number }) {
  return (
    <div className="c-stat" style={{ ['--i' as never]: i }}>
      <div className="c-stat__k">{k}</div>
      <div className="c-stat__v" style={color ? { color } : undefined}>{v}</div>
    </div>
  );
}
