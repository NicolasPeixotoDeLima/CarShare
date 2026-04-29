import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Pager } from '../../components/Pager';
import { EmptyState } from '../../components/EmptyState';
import { FiltersBar } from '../../components/FiltersBar';
import { api, fmt, LABELS } from '../../lib/api';
import type { Car } from '../../lib/types';

const PAGE = 60;

export function AdminCars() {
  const [items, setItems] = useState<Car[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.cars.list({ q: q || undefined, limit: PAGE, offset });
      setItems(r.items);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  }, [q, offset]);

  useEffect(() => { void load(); }, [load]);

  return (
    <AdminLayout subtitle="Gestão · frota" title="Carros">
      <div className="panel">
        <FiltersBar count={`${total} ${total === 1 ? 'carro' : 'carros'} no total`}>
          <input
            type="search"
            placeholder="Buscar marca ou modelo…"
            value={q}
            onChange={e => { setOffset(0); setQ(e.target.value); }}
          />
        </FiltersBar>

        {loading && !items.length ? (
          <EmptyState>Carregando…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Nenhum carro encontrado.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Carro</th>
                <th>Categoria</th>
                <th>Hub</th>
                <th>Origem</th>
                <th className="right">Estoque</th>
                <th className="right">Mensal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c, i) => (
                <tr key={c.id} style={{ ['--i' as never]: i }}>
                  <td className="mono">#{c.id}</td>
                  <td>
                    <div>{c.brand} {c.model}</div>
                    <div className="mono">{c.slug} · {c.year}</div>
                  </td>
                  <td>{LABELS.category[c.category]}</td>
                  <td>{LABELS.hub[c.hub]}</td>
                  <td>
                    {/* owner_id não vem no Car atualmente — inferimos via badge */}
                    <span className="tag">catálogo</span>
                  </td>
                  <td className="right num">{c.stock}</td>
                  <td className="right num">{fmt.brl(c.price_month)}</td>
                  <td className="right">
                    <Link to={`/car?slug=${c.slug}`} className="btn btn--xs">Ver →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pager offset={offset} pageSize={PAGE} total={total} onChange={setOffset} />
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel__head">
          <div>
            <h3>Edição</h3>
            <div className="panel__sub">
              CRUD de carros já existe via <code>POST/PUT/DELETE /api/cars</code> (admin pode mexer em qualquer carro).
              Esta tela hoje é só leitura — pode ser estendida com formulário inline no futuro.
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
