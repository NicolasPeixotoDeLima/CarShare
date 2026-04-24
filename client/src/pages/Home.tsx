import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Nav } from '../components/Nav';
import { CarSilhouette } from '../components/CarSilhouette';
import { LiveMap } from '../components/LiveMap';
import { useAuth } from '../lib/useAuth';
import type { Category } from '../lib/types';
import './Home.css';

const CATEGORIES: Array<{ key: Category; num: string; name: string; priceFrom: string }> = [
  { key: 'urbano',   num: '01', name: 'Urbano',   priceFrom: 'R$ 1.890' },
  { key: 'seda',     num: '02', name: 'Sedã',     priceFrom: 'R$ 2.490' },
  { key: 'suv',      num: '03', name: 'SUV',      priceFrom: 'R$ 3.190' },
  { key: 'pickup',   num: '04', name: 'Pickup',   priceFrom: 'R$ 3.690' },
  { key: 'eletrico', num: '05', name: 'Elétrico', priceFrom: 'R$ 3.990' },
  { key: 'luxo',     num: '06', name: 'Luxo',     priceFrom: 'R$ 5.890' },
];

const STEPS = [
  { num: '01', title: 'Escolha seu carro.',  desc: 'Filtre por categoria, autonomia, câmbio e hub de entrega. Mais de 2.800 opções.' },
  { num: '02', title: 'Assine em minutos.',  desc: 'CNH válida, aprovação em 3 minutos. Sem fiador, sem entrada, sem IPVA.' },
  { num: '03', title: 'Dirija sem amarras.', desc: 'Entrega em 48h com tanque cheio. Seguro, manutenção e assistência 24h inclusos.' },
];

export function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mapExpanded, setMapExpanded] = useState(false);

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
            Assinatura mensal flexível, sem financiamento e sem burocracia. Troque de modelo quando quiser,
            com seguro, manutenção e assistência 24h inclusos.
          </p>
          <div className="hero__metrics">
            <div className="hero__metric">
              <div className="hero__metric-num serif">2.847<span className="hero__metric-unit">un</span></div>
              <div className="hero__metric-lbl mono">carros disponíveis</div>
            </div>
            <div className="hero__metric">
              <div className="hero__metric-num serif">48<span className="hero__metric-unit">h</span></div>
              <div className="hero__metric-lbl mono">entrega na porta</div>
            </div>
            <div className="hero__metric">
              <div className="hero__metric-num serif">12<span className="hero__metric-unit">×</span></div>
              <div className="hero__metric-lbl mono">menos que financiar</div>
            </div>
          </div>
        </div>

        <div className="hero__map">
          <div className="hero__map-chip hero__map-chip--a hero__map-chip--live">
            <span className="dot" />Ao vivo · <strong>sua região</strong>
          </div>
          <div className="hero__map-chip hero__map-chip--b">
            <span>◎</span><strong>342</strong> próximos
          </div>

          <LiveMap onExpand={() => setMapExpanded(true)} />

          <div className="hero__map-legend">
            <div><span className="sw" style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }} />Você</div>
            <div><span className="sw" style={{ background: 'var(--amber)' }} />Carros ativos</div>
            <div><span className="sw" style={{ background: 'var(--signal)' }} />A caminho</div>
            <div><span className="sw" style={{ background: 'var(--fg-dim)' }} />Disponíveis</div>
          </div>
        </div>

        {mapExpanded && createPortal(
          <FullscreenMap onClose={() => setMapExpanded(false)} />,
          document.body,
        )}
      </section>

      <div className="search-panel">
        <button className="search-panel__field" onClick={() => goFleet()}>
          <span className="search-panel__label mono">Retirada</span>
          <span className="search-panel__value">São Paulo, Vila Olímpia <span style={{ color: 'var(--fg-mute)' }}>▾</span></span>
          <span className="search-panel__hint">Rua Fiandeiras, 930</span>
        </button>
        <button className="search-panel__field" onClick={() => goFleet()}>
          <span className="search-panel__label mono">Devolução</span>
          <span className="search-panel__value">Mesmo local <span style={{ color: 'var(--fg-mute)' }}>▾</span></span>
          <span className="search-panel__hint">Troque por qualquer hub</span>
        </button>
        <button className="search-panel__field" onClick={() => goFleet()}>
          <span className="search-panel__label mono">Início</span>
          <span className="search-panel__value">Hoje · agora</span>
          <span className="search-panel__hint">Entrega em 48h</span>
        </button>
        <button className="search-panel__field" onClick={() => goFleet()}>
          <span className="search-panel__label mono">Término</span>
          <span className="search-panel__value">+ 1 mês</span>
          <span className="search-panel__hint">renovável</span>
        </button>
        <button className="search-panel__field" onClick={() => goFleet()}>
          <span className="search-panel__label mono">Categoria</span>
          <span className="search-panel__value">Todas <span style={{ color: 'var(--fg-mute)' }}>▾</span></span>
          <span className="search-panel__hint">6 categorias · 2.847 opções</span>
        </button>
        <button className="search-panel__submit" onClick={() => goFleet()}>
          Buscar frota
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <section className="section">
        <div className="section__head">
          <div>
            <div className="section__label mono">Categorias — 01</div>
            <h2 className="section__title">Escolha sua <span className="italic">estrada.</span></h2>
          </div>
          <div className="section__meta">
            Seis linhas, do urbano compacto ao desempenho. Todas com seguro, manutenção e km livre.
          </div>
        </div>
        <div className="cat-rail">
          {CATEGORIES.map(c => (
            <button key={c.key} className="cat-card" onClick={() => goFleet(c.key)}>
              <div className="cat-card__num mono">{c.num}</div>
              <div className="cat-card__name">{c.name}</div>
              <div className="cat-card__from mono">
                a partir de <span className="v">{c.priceFrom}</span>/mês
              </div>
              <CarSilhouette category={c.key} className="cat-card__silhouette" />
              <div className="cat-card__arrow">→</div>
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="como-funciona" style={{ paddingTop: 0 }}>
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

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="offer">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div className="offer__tag">⚡ Oferta por tempo limitado</div>
            <h2 className="offer__title">
              Primeiro mês <span className="italic">pela metade.</span>
            </h2>
            <p className="offer__desc">
              Assine qualquer carro até domingo e pague 50% no primeiro mês. Sem taxa de adesão. Cancele
              quando quiser, sem multa.
            </p>
            <div className="offer__cta">
              <button className="btn btn--primary" onClick={() => goFleet()}>Ativar oferta →</button>
              <button className="btn btn--ghost" onClick={() => navigate('/help')}>Ver termos</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__logo serif">
          Car<span className="italic">Share</span>
        </div>
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
