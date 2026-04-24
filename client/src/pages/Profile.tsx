import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomerLayout } from './customer/CustomerLayout';
import { CarSilhouette } from '../components/CarSilhouette';
import { api, fmt, LABELS } from '../lib/api';
import type { ProfileResponse } from '../lib/types';
import './Profile.css';

function maskCPF(cpf: string | null | undefined) {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length < 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function Profile() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    let cancel = false;
    api.profile.get()
      .then(r => { if (!cancel) setData(r); })
      .catch(() => { if (!cancel) navigate('/login?next=/profile', { replace: true }); });
    return () => { cancel = true; };
  }, [navigate]);

  if (!data) {
    return <div style={{ padding: '60px 40px', color: 'var(--fg-mute)' }}>Carregando…</div>;
  }

  const { user, active, upcomingInvoices, bookings, favorites } = data;
  const first = (user.name || 'Conta').split(' ')[0];

  return (
    <CustomerLayout title={`Olá, ${first}.`} subtitle="Visão geral · sua conta">
      {active ? (
        <section className="current-car">
          <div className="current-car__left">
            <div className="current-car__tag">
              <span className="dot" />
              {active.status === 'scheduled' ? 'Entrega agendada' : 'Carro atual · em sua garagem'}
            </div>
            <div className="current-car__title">
              {active.brand} <span className="italic">{active.model}</span>
            </div>
            <div className="current-car__sub">
              {active.category && LABELS.category[active.category]} · {active.year} · Código {active.code}
            </div>
            <div className="current-car__actions">
              <Link to={`/car?slug=${active.slug}`} className="qa qa--primary">Ver detalhes do contrato</Link>
              <Link to="/fleet" className="qa">🔄 Trocar carro</Link>
              <Link to="/help"  className="qa">⚡ Assistência</Link>
            </div>
          </div>
          <div className="current-car__right">
            {active.category && <CarSilhouette category={active.category} />}
          </div>
        </section>
      ) : (
        <section className="current-car">
          <div className="current-car__left">
            <div className="current-car__tag"><span className="dot" />Nenhuma assinatura ativa</div>
            <div className="current-car__title">
              Escolha um carro <span className="italic">para começar.</span>
            </div>
            <div className="current-car__sub">
              Mais de 2.800 carros disponíveis para assinatura mensal.
            </div>
            <div className="current-car__actions">
              <Link to="/fleet" className="qa qa--primary">Explorar frota →</Link>
            </div>
          </div>
        </section>
      )}

      {active ? (
        <section className="metrics">
          <div className="m-card">
            <div className="k">Mensalidade</div>
            <div className="v">{fmt.brl(active.monthly_price)}</div>
            <div className="d">
              {active.category && LABELS.category[active.category]} · {LABELS.km[active.km_limit]}
            </div>
          </div>
          <div className="m-card">
            <div className="k">Próximo débito</div>
            <div className="v">
              {upcomingInvoices[0] ? fmt.brl(upcomingInvoices[0].amount) : '—'}
            </div>
            <div className="d">
              {upcomingInvoices[0] ? fmt.dateLong(upcomingInvoices[0].due_date) : 'sem débitos agendados'}
            </div>
          </div>
          <div className="m-card">
            <div className="k">Prazo contratado</div>
            <div className="v">
              {active.term_months}<span className="u">{active.term_months === 1 ? 'mês' : 'meses'}</span>
            </div>
            <div className="d">até {fmt.dateLong(active.end_date)}</div>
          </div>
          <div className="m-card">
            <div className="k">Dias restantes</div>
            <div className="v">
              {fmt.daysBetween(new Date(), active.end_date)}<span className="u">dias</span>
            </div>
            <div className="d">de {active.term_months * 30} · renovação automática</div>
          </div>
        </section>
      ) : (
        <section className="metrics">
          <div className="m-card m-card--wide">
            <div className="k">Status</div>
            <div className="v">Sem assinatura</div>
            <div className="d">Assine um carro para ver métricas e próximas faturas.</div>
          </div>
        </section>
      )}

      <section className="cols">
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Histórico <span className="italic">recente.</span></h3>
              <div className="panel__sub">Últimas atividades · <Link to="/bookings" style={{ color: 'var(--amber)' }}>ver todas →</Link></div>
            </div>
          </div>
          {bookings.length > 0 ? (
            <div className="timeline">
              {bookings.slice(0, 6).map(b => {
                const icon = b.status === 'finished' ? '✓' : b.status === 'scheduled' ? '◎' : '●';
                const done = b.status === 'finished';
                return (
                  <Link key={b.id} to="/bookings" className="tl-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className={`tl-ic ${done ? 'tl-ic--done' : ''}`}>{icon}</div>
                    <div className="tl-txt">
                      <div className="t">
                        {b.brand} {b.model} · {b.term_months} {b.term_months === 1 ? 'mês' : 'meses'}
                      </div>
                      <div className="d">
                        {fmt.date(b.start_date)} → {fmt.date(b.end_date)} · {b.code}
                      </div>
                    </div>
                    <div className="tl-v">{fmt.brl(b.monthly_price)}/mês</div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">Nenhuma atividade ainda.</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>Próximas <span className="italic">faturas.</span></h3>
                <div className="panel__sub"><Link to="/invoices" style={{ color: 'var(--amber)' }}>ver todas as faturas →</Link></div>
              </div>
            </div>
            {upcomingInvoices.length > 0 ? upcomingInvoices.map(inv => (
              <div key={inv.id} className="bill-row">
                <div>
                  <div className="bill-row__date">
                    {fmt.date(inv.due_date)} · {new Date(inv.due_date).getFullYear()}
                  </div>
                  <div className="bill-row__state bill-row__state--pend">● programada</div>
                </div>
                <div className="bill-row__amt">{fmt.brl(inv.amount)}</div>
              </div>
            )) : (
              <div className="empty-state">Nenhuma fatura programada.</div>
            )}
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>Salvos para <span className="italic">depois.</span></h3>
                <div className="panel__sub"><Link to="/favorites" style={{ color: 'var(--amber)' }}>ver todos →</Link></div>
              </div>
            </div>
            {favorites.length > 0 ? (
              <div className="fav-grid">
                {favorites.map(c => (
                  <button
                    key={c.id}
                    className="fav"
                    onClick={() => navigate(`/car?slug=${c.slug}`)}
                  >
                    <div className="fav__sub">{c.brand} · {LABELS.category[c.category]}</div>
                    <div className="fav__title">{c.model}</div>
                    <div className="fav__stage"><CarSilhouette category={c.category} /></div>
                    <div className="fav__price">
                      <span className="num">{fmt.brl(c.price_month)}</span>/mês
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                Você ainda não favoritou nenhum carro.{' '}
                <Link to="/fleet" style={{ color: 'var(--amber)' }}>Explore a frota →</Link>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <h3>Seus <span className="italic">dados.</span></h3>
                <div className="panel__sub"><Link to="/account" style={{ color: 'var(--amber)' }}>editar →</Link></div>
              </div>
            </div>
            <div className="prof-info">
              <div className="prof-info__row"><span className="k">CPF</span><span className="v">{maskCPF(user.cpf)}</span></div>
              <div className="prof-info__row">
                <span className="k">CNH</span>
                <span className="v">
                  {user.cnh || '—'}
                  {user.cnh && <span style={{ color: 'var(--signal)', fontSize: 11, marginLeft: 6 }}>● válida</span>}
                </span>
              </div>
              <div className="prof-info__row"><span className="k">Celular</span><span className="v">{user.phone || '—'}</span></div>
              <div className="prof-info__row"><span className="k">E-mail</span><span className="v">{user.email}</span></div>
            </div>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
