import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Nav } from '../components/Nav';
import { CarSilhouette } from '../components/CarSilhouette';
import { LiveMap } from '../components/LiveMap';
import { useAuth } from '../lib/useAuth';
import { api, fmt, LABELS } from '../lib/api';
import type { Car, Category } from '../lib/types';
import './Home.css';

const CATEGORY_KEYS: Category[] = ['urbano', 'seda', 'suv', 'pickup', 'eletrico', 'luxo'];

const STEPS = [
  { num: '01', title: 'Escolha seu carro.',  desc: 'Filtre por categoria, autonomia, câmbio e hub de entrega.' },
  { num: '02', title: 'Assine em minutos.',  desc: 'CNH válida, aprovação rápida. Sem fiador, sem entrada, sem IPVA.' },
  { num: '03', title: 'Dirija sem amarras.', desc: 'Entrega em horas com tanque cheio. Seguro, manutenção e assistência inclusos.' },
];

interface CategoryStat {
  key: Category;
  num: string;
  name: string;
  priceFrom: number | null;
  count: number;
}

export function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mapExpanded, setMapExpanded] = useState(false);

  const [allCars, setAllCars] = useState<Car[] | null>(null);
  const [totalCars, setTotalCars] = useState<number | null>(null);

  // Carrega frota real pra alimentar metricas e categorias
  useEffect(() => {
    let cancel = false;
    api.cars.list({ limit: 200 })
      .then(r => { if (!cancel) { setAllCars(r.items); setTotalCars(r.total); } })
      .catch(() => { if (!cancel) { setAllCars([]); setTotalCars(0); } });
    return () => { cancel = true; };
  }, []);

  const categoryStats = useMemo<CategoryStat[]>(() => {
    return CATEGORY_KEYS.map((k, i) => {
      const matches = (allCars ?? []).filter(c => c.category === k);
      const min = matches.length > 0 ? Math.min(...matches.map(c => c.price_month)) : null;
      return {
        key: k,
        num: String(i + 1).padStart(2, '0'),
        name: LABELS.category[k],
        priceFrom: min,
        count: matches.length,
      };
    });
  }, [allCars]);

  const fastestDelivery = useMemo(() => {
    if (!allCars || allCars.length === 0) return null;
    return Math.min(...allCars.map(c => c.delivery_hours || 48));
  }, [allCars]);

  function goFleet(category?: Category) {
    navigate('/fleet' + (category ? `?category=${category}` : ''));
  }

  // Lock body scroll while the fullscreen map overlay is open
  useEffect(() => {
    if (!mapExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMapExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mapExpanded]);

  return (
    <>
      <Nav user={user} onLogout={logout} activeSection="subscribe" />

      <section className="hero">
        <div className="hero__copy">
          <span className="hero__eyebrow">
            <span className="hero__eyebrow-dot" />
            Assinatura mensal · sem entrada
          </span>
          <h1 className="hero__title serif">
            Dirija <span className="italic">qualquer carro,</span>
            <br />
            pelo <span className="stroke">tempo que quiser.</span>
          </h1>
          <p className="hero__sub">
            Assinatura mensal flexível, sem financiamento e sem burocracia. Troque de modelo
            quando quiser, com seguro, manutenção e assistência 24h inclusos.
          </p>

          <div className="hero__cta">
            <button className="btn btn--primary" onClick={() => goFleet()}>
              Explorar frota
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
            <button className="btn btn--ghost" onClick={() => navigate('/help')}>Como funciona</button>
          </div>

          <div className="hero__metrics">
            <div className="hero__metric">
              <div className="hero__metric-num serif">
                {totalCars != null ? fmt.int(totalCars) : '—'}
              </div>
              <div className="hero__metric-lbl mono">carros disponíveis</div>
            </div>
            <div className="hero__metric">
              <div className="hero__metric-num serif">
                {fastestDelivery != null ? fastestDelivery : '—'}
                <span className="hero__metric-unit">h</span>
              </div>
              <div className="hero__metric-lbl mono">entrega rápida</div>
            </div>
            <div className="hero__metric">
              <div className="hero__metric-num serif">
                {categoryStats.filter(c => c.count > 0).length}
                <span className="hero__metric-unit">cat</span>
              </div>
              <div className="hero__metric-lbl mono">categorias ativas</div>
            </div>
          </div>
        </div>

        <div className="hero__map">
          <div className="hero__map-chip hero__map-chip--live">
            <span className="dot" />Mapa ao vivo · <strong>sua região</strong>
          </div>

          <LiveMap onExpand={() => setMapExpanded(true)} />

          <div className="hero__map-legend">
            <div><span className="sw" style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }} />Você</div>
            <div><span className="sw" style={{ background: 'var(--amber)' }} />Carros ativos</div>
            <div><span className="sw" style={{ background: 'var(--signal)' }} />A caminho</div>
          </div>
        </div>

        {mapExpanded && createPortal(
          <FullscreenMap onClose={() => setMapExpanded(false)} />,
          document.body,
        )}
      </section>

      <section className="section section--cats">
        <div className="section__head">
          <div>
            <div className="section__label mono">Categorias — 01</div>
            <h2 className="section__title">Escolha sua <span className="italic">estrada.</span></h2>
          </div>
          <div className="section__meta">
            Seis linhas, do urbano compacto ao desempenho. Todas com seguro, manutenção e assistência.
          </div>
        </div>
        <div className="cat-rail">
          {categoryStats.map(c => {
            const empty = c.count === 0;
            return (
              <button
                key={c.key}
                className={`cat-card ${empty ? 'is-empty' : ''}`}
                onClick={() => goFleet(c.key)}
                disabled={empty}
              >
                <div className="cat-card__num mono">{c.num}</div>
                <div className="cat-card__name">{c.name}</div>
                <div className="cat-card__from mono">
                  {c.priceFrom != null
                    ? <>a partir de <span className="v">{fmt.brl(c.priceFrom)}</span>/mês</>
                    : <span style={{ color: 'var(--fg-mute)' }}>sem unidades</span>}
                </div>
                <CarSilhouette category={c.key} className="cat-card__silhouette" />
                <div className="cat-card__arrow">→</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="section" id="como-funciona">
        <div className="section__head">
          <div>
            <div className="section__label mono">Como funciona — 02</div>
            <h2 className="section__title">Três passos, <span className="italic">zero papelada.</span></h2>
          </div>
          <div className="section__meta">
            Aprovação em minutos. Entregamos na sua porta com tanque cheio.
          </div>
        </div>
        <div className="steps">
          {STEPS.map(s => (
            <div key={s.num} className="step">
              <div className="step__num">{s.num}</div>
              <div>
                <div className="step__title">{s.title}</div>
                <div className="step__desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="offer">
          <div className="offer__inner">
            <div className="offer__tag">⚡ Comece sem compromisso</div>
            <h2 className="offer__title">
              Cancele quando <span className="italic">quiser.</span>
            </h2>
            <p className="offer__desc">
              Sem fidelidade longa, sem multa de saída antecipada nos primeiros 30 dias. Se mudar
              de ideia, devolva o carro e a gente cuida do resto.
            </p>
            <div className="offer__cta">
              <button className="btn btn--primary" onClick={() => goFleet()}>Ver carros disponíveis →</button>
              <button className="btn btn--ghost" onClick={() => navigate('/help')}>Ler termos</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__top">
          <div className="footer__logo serif">
            Car<span className="italic">Share</span>
          </div>
          <div className="footer__cols">
            <div className="footer__col">
              <h4>Produto</h4>
              <ul>
                <li><Link to="/fleet">Frota completa</Link></li>
                <li><Link to="/login?tab=signup">Criar conta</Link></li>
                <li><Link to="/help">Como funciona</Link></li>
              </ul>
            </div>
            <div className="footer__col">
              <h4>Conta</h4>
              <ul>
                <li><Link to="/profile">Meu perfil</Link></li>
                <li><Link to="/bookings">Minhas reservas</Link></li>
                <li><Link to="/invoices">Faturas</Link></li>
                <li><Link to="/favorites">Favoritos</Link></li>
              </ul>
            </div>
            <div className="footer__col">
              <h4>Suporte</h4>
              <ul>
                <li><Link to="/help">Central de ajuda</Link></li>
                <li><a href="mailto:contato@carshare.exemplo">Fale conosco</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer__meta">
          <div>© {new Date().getFullYear()} CarShare · Todos os direitos reservados.</div>
          <div className="mono">Made in São Paulo</div>
        </div>
      </footer>
    </>
  );
}

function FullscreenMap({ onClose }: { onClose: () => void }) {
  return (
    <div className="live-map__fullscreen" role="dialog" aria-modal="true" aria-label="Mapa da sua região">
      <div className="live-map__fullscreen-bar">
        <h2>Sua região, <span className="italic">ao vivo.</span></h2>
        <button className="live-map__close" onClick={onClose} aria-label="Fechar mapa">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="live-map__fullscreen-body">
        <LiveMap interactive zoom={14} />
      </div>
    </div>
  );
}
