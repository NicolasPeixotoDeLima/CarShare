import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OwnerLayout } from './OwnerLayout';
import { api, fmt } from '../../lib/api';
import type { OwnerStats } from '../../lib/types';

export function OwnerDashboard() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    api.owner.stats()
      .then(s => { if (!cancel) setStats(s); })
      .catch(e => { if (!cancel) setErr(e.code || 'erro'); });
    return () => { cancel = true; };
  }, []);

  return (
    <OwnerLayout
      subtitle="Visão geral · sua frota"
      title="Dashboard"
      actions={<Link to="/owner/cars/new" className="btn btn--primary">+ Cadastrar carro</Link>}
    >
      {err && <div className="empty">Erro: {err}</div>}
      {!stats && !err && (
        <div className="kpi-grid">
          {[0,1,2,3].map(i => (
            <div key={i} className="kpi" style={{ ['--i' as never]: i }}>
              <div className="sk sk-line" style={{ width: '60%' }} />
              <div className="sk sk-block" style={{ marginTop: 12, height: 38 }} />
              <div className="sk sk-line" style={{ marginTop: 10, width: '80%' }} />
            </div>
          ))}
        </div>
      )}
      {stats && (
        <>
          <div className="kpi-grid">
            {[
              { k: 'Receita recorrente', v: fmt.brl(stats.bookings.mrr), d: 'soma das mensalidades das reservas ativas/agendadas dos seus carros' },
              { k: 'Reservas ativas', v: stats.bookings.active, d: `${stats.bookings.finished} finalizadas · ${stats.bookings.cancelled} canceladas` },
              { k: 'Modelos cadastrados', v: stats.cars.total, d: `${stats.cars.units} unidades em estoque` },
              { k: 'Mensalidade média', v: fmt.brl(stats.cars.avg_price), d: 'média do preço listado dos seus carros' },
            ].map((kpi, i) => (
              <div key={kpi.k} className="kpi" style={{ ['--i' as never]: i }}>
                <div className="kpi__k">{kpi.k}</div>
                <div className="kpi__v">{kpi.v}</div>
                <div className="kpi__d">{kpi.d}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>Top carros (por reservas)</h3>
                <div className="panel__sub">Modelos seus mais alugados</div>
              </div>
              <Link to="/owner/cars" className="btn btn--xs">Ver todos →</Link>
            </div>
            {stats.topCars.length === 0 ? (
              <div className="empty">
                Você ainda não cadastrou nenhum carro.<br />
                <Link to="/owner/cars/new" style={{ color: 'var(--amber)', marginTop: 12, display: 'inline-block' }}>
                  Cadastrar primeiro carro →
                </Link>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Carro</th>
                    <th className="right">Reservas</th>
                    <th className="right">MRR</th>
                    <th className="right">Mensal listado</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topCars.map((c, i) => (
                    <tr key={c.id} style={{ ['--i' as never]: i }}>
                      <td>
                        <div>{c.brand} {c.model}</div>
                        <div className="mono">{c.slug}</div>
                      </td>
                      <td className="right num">{c.bookings}</td>
                      <td className="right num">{fmt.brl(c.mrr)}</td>
                      <td className="right num">{fmt.brl(c.price_month)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </OwnerLayout>
  );
}
