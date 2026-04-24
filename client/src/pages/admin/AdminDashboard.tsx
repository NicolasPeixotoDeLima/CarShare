import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { api, fmt } from '../../lib/api';
import type { AdminStats } from '../../lib/types';

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    api.admin.stats()
      .then(s => { if (!cancel) setStats(s); })
      .catch(e => { if (!cancel) setError(e.code || 'erro'); });
    return () => { cancel = true; };
  }, []);

  return (
    <AdminLayout subtitle="Visão geral · plataforma" title="Dashboard">
      {error && <div className="empty">Erro: {error}</div>}
      {!stats && !error && (
        <div className="kpi-grid">
          {[0,1,2,3,4,5].map(i => (
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
              { k: 'MRR (receita recorrente)', v: fmt.brl(stats.mrr), d: 'soma das mensalidades de reservas ativas + agendadas' },
              { k: 'Faturas vencidas', v: stats.invoices.overdue, d: `${fmt.brl(stats.invoices.overdue_amount)} em aberto e fora do prazo`, alert: stats.invoices.overdue > 0 },
              { k: 'Reservas ativas', v: stats.bookings.active + stats.bookings.scheduled, d: `${stats.bookings.active} rodando · ${stats.bookings.scheduled} agendadas` },
              { k: 'Frota total', v: stats.cars.total, d: `${stats.cars.platform} da plataforma · ${stats.cars.owners} de proprietários` },
              { k: 'Clientes', v: stats.users.cliente, d: 'contas com role cliente' },
              { k: 'Proprietários', v: stats.users.proprietario, d: 'contas listando carros' },
            ].map((kpi, i) => (
              <div key={kpi.k} className={`kpi ${kpi.alert ? 'kpi--alert' : ''}`} style={{ ['--i' as never]: i }}>
                <div className="kpi__k">{kpi.k}</div>
                <div className="kpi__v">{kpi.v}</div>
                <div className="kpi__d">{kpi.d}</div>
              </div>
            ))}
          </div>

          <div className="cols-2">
            <div className="panel">
              <div className="panel__head">
                <div>
                  <h3>Reservas recentes</h3>
                  <div className="panel__sub">Últimas 8 entradas em <code>bookings</code></div>
                </div>
                <Link to="/admin/bookings" className="btn btn--xs">Ver todas →</Link>
              </div>
              {stats.recentBookings.length === 0 ? (
                <div className="empty">Nenhuma reserva ainda.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Cliente</th>
                      <th>Carro</th>
                      <th>Status</th>
                      <th className="right">Mensal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentBookings.map((b, i) => (
                      <tr key={b.id} style={{ ['--i' as never]: i }}>
                        <td className="mono">{b.code}</td>
                        <td>
                          <div>{b.user_name}</div>
                          <div className="mono">{b.user_email}</div>
                        </td>
                        <td>{b.brand} {b.model}</td>
                        <td><span className={`tag tag--${b.status}`}>{b.status}</span></td>
                        <td className="right num">{fmt.brl(b.monthly_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel">
              <div className="panel__head">
                <div>
                  <h3>Top carros (por reservas)</h3>
                  <div className="panel__sub">Ranking histórico de bookings por modelo</div>
                </div>
                <Link to="/admin/cars" className="btn btn--xs">Gerir frota →</Link>
              </div>
              {stats.topCars.length === 0 ? (
                <div className="empty">Sem dados.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Carro</th>
                      <th className="right">Reservas</th>
                      <th className="right">Mensal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topCars.map((c, i) => (
                      <tr key={c.id} style={{ ['--i' as never]: i }}>
                        <td>
                          <div>{c.brand} {c.model}</div>
                          <div className="mono">{c.slug} · {c.year}</div>
                        </td>
                        <td className="right num">{c.bookings}</td>
                        <td className="right num">{fmt.brl(c.price_month)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
