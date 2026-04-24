import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OwnerLayout } from './OwnerLayout';
import { api, fmt, LABELS } from '../../lib/api';
import type { Car } from '../../lib/types';

export function OwnerCars() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Car[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.owner.myCars();
      setItems(r.items);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function remove(c: Car) {
    if (!confirm(`Remover "${c.brand} ${c.model}"? Reservas existentes desse carro permanecerão, mas ele sai do catálogo.`)) return;
    try {
      await api.owner.deleteCar(c.id);
      await load();
    } catch (e: unknown) {
      alert('Erro: ' + ((e as { code?: string }).code || 'falha'));
    }
  }

  return (
    <OwnerLayout
      subtitle="Frota · seus modelos"
      title="Meus carros"
      actions={<Link to="/owner/cars/new" className="btn btn--primary">+ Cadastrar carro</Link>}
    >
      {items === null ? (
        <div className="empty">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="panel">
          <div className="empty">
            Você ainda não cadastrou nenhum carro.<br />
            <Link to="/owner/cars/new" style={{ color: 'var(--amber)', marginTop: 12, display: 'inline-block' }}>
              Cadastrar primeiro carro →
            </Link>
          </div>
        </div>
      ) : (
        <div className="panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Carro</th>
                <th>Categoria</th>
                <th>Hub</th>
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
                  <td className="right num">{c.stock}</td>
                  <td className="right num">{fmt.brl(c.price_month)}</td>
                  <td className="right" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn--xs" onClick={() => navigate(`/owner/cars/${c.id}/edit`)}>
                      Editar
                    </button>
                    <button className="btn btn--xs btn--danger" onClick={() => remove(c)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OwnerLayout>
  );
}
