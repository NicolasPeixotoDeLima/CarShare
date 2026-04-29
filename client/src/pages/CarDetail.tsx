import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { BackButton } from '../components/BackButton';
import { CarSilhouette } from '../components/CarSilhouette';
import { CommentsSection } from '../components/CommentsSection';
import { useAuth } from '../lib/useAuth';
import { api, fmt, LABELS, PRICING, ApiError } from '../lib/api';
import { draft as draftStore } from '../lib/draft';
import type { Car, ExtraKey, KmLimit, TermMonths } from '../lib/types';
import './CarDetail.css';
import './Chat.css';

const TERM_OPTIONS: TermMonths[] = [1, 3, 6, 12];
function kmShortLabel(v: string) {
  return v === 'livre' ? 'Livre' : `${Number(v).toLocaleString('pt-BR')} km`;
}
const EXTRA_OPTIONS: Array<{ key: ExtraKey; label: string; price: number }> = [
  { key: 'seguro_plus',       label: 'Seguro total premium',        price: PRICING.extraMonthly.seguro_plus },
  { key: 'manutencao_premium',label: 'Manutenção e revisões',        price: PRICING.extraMonthly.manutencao_premium },
  { key: 'motorista_extra',   label: 'Motorista adicional',          price: PRICING.extraMonthly.motorista_extra },
  { key: 'wallbox',           label: 'Carregador wallbox instalado', price: PRICING.extraMonthly.wallbox },
];

export function CarDetail() {
  const [params] = useSearchParams();
  const slug = params.get('slug') || params.get('id') || '';
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [car, setCar] = useState<Car | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [term, setTerm] = useState<TermMonths>(3);
  const [km, setKm] = useState<KmLimit>('');
  const [extras, setExtras] = useState<Set<ExtraKey>>(
    new Set(['seguro_plus', 'manutencao_premium'])
  );
  const [favored, setFavored] = useState(false);

  useEffect(() => {
    if (!slug) { setLoadError(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const c = await api.cars.get(slug);
        if (!cancelled) {
          setCar(c);
          // Pre-seleciona uma franquia razoavel: '2500' se existir, senao a primeira
          const opts = c.km_options ?? [];
          const pref = opts.find(o => o.value === '2500') ?? opts[0];
          if (pref) setKm(pref.value);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const monthlyFor = useMemo(() => (t: TermMonths) => {
    if (!car) return 0;
    const extrasCost = [...extras].reduce((s, k) => s + PRICING.extraMonthly[k], 0);
    const kmOption   = (car.km_options ?? []).find(o => o.value === km);
    const kmCost     = kmOption?.surcharge ?? 0;
    // Preco base por prazo definido pelo proprietario (term_prices). Fallback
    // pra desconto historico se carro antigo nao tiver o JSON.
    const tp = car.term_prices?.[String(t) as '1'|'3'|'6'|'12'];
    if (Number.isFinite(tp) && tp! > 0) {
      return tp! + extrasCost + kmCost;
    }
    const base = car.price_month + extrasCost + kmCost;
    return Math.round(base * PRICING.termDiscount[t]);
  }, [car, extras, km]);

  const monthly = car ? monthlyFor(term) : 0;

  function toggleExtra(k: ExtraKey) {
    setExtras(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function subscribe() {
    if (!car) return;
    draftStore.save({
      car_id:  car.id,
      slug:    car.slug,
      brand:   car.brand,
      model:   car.model,
      year:    car.year,
      term_months: term,
      km_limit:  km,
      extras:    [...extras],
      monthly_price: monthly,
    });
    navigate('/checkout');
  }

  async function toggleFavorite() {
    if (!car) return;
    try {
      const r = await api.favorites.toggle(car.id);
      setFavored(r.favored);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login?next=' + encodeURIComponent(`/car?slug=${car.slug}`));
      }
    }
  }

  if (loadError) {
    return (
      <>
        <Nav user={user} onLogout={logout} activeSection="fleet" />
        <BackButton className="back-btn--floating" fallback="/fleet" />
        <div style={{ padding: '120px 40px', textAlign: 'center' }}>
          <h1 className="serif" style={{ fontSize: 40 }}>Carro não encontrado</h1>
          <p style={{ marginTop: 16 }}>
            <Link to="/fleet" style={{ color: 'var(--amber)' }}>← Voltar para a frota</Link>
          </p>
        </div>
      </>
    );
  }

  if (!car) {
    return (
      <>
        <Nav user={user} onLogout={logout} activeSection="fleet" />
        <BackButton className="back-btn--floating" fallback="/fleet" />
        <div style={{ padding: '120px 40px', textAlign: 'center', color: 'var(--fg-mute)' }}>
          Carregando…
        </div>
      </>
    );
  }

  return (
    <>
      <Nav user={user} onLogout={logout} activeSection="fleet" />
      <BackButton className="back-btn--floating" fallback="/fleet" />

      <div className="car-bc mono">
        <Link to="/">Home</Link><span className="car-bc__sep">/</span>
        <Link to="/fleet">Frota</Link><span className="car-bc__sep">/</span>
        <span style={{ color: 'var(--fg)' }}>{car.brand} {car.model}</span>
      </div>

      <section className="car-detail">
        <div className="car-stage">
          <div className="car-stage__top">
            <div className="car-stage__chip">
              <span className="dot" />Disponível · entrega {car.delivery_hours}h
            </div>
            <div className="car-stage__chip">◎ {car.stock} unidades</div>
          </div>
          <div className="car-stage__img">
            <CarSilhouette category={car.category} />
          </div>
        </div>

        <div className="car-info">
          <div>
            <div className="car-info__sub">
              {car.brand} · {car.year} · {LABELS.category[car.category]} · {LABELS.fuel[car.fuel]}
            </div>
            <div className="car-info__title">{car.model}</div>
            <div className="car-info__rating">
              {car.owner_rating && car.owner_rating.total > 0 ? (
                <>
                  <span className="score">
                    {car.owner_rating.avg.toFixed(1).replace('.', ',')}
                  </span>
                  <span className="car-info__stars">
                    {'★★★★★'.slice(0, Math.round(car.owner_rating.avg))}
                    <span style={{ color: 'var(--fg-mute)' }}>
                      {'★★★★★'.slice(Math.round(car.owner_rating.avg))}
                    </span>
                  </span>
                  <span>
                    · {car.owner_rating.total} {car.owner_rating.total === 1 ? 'avaliação' : 'avaliações'} do proprietário
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--fg-mute)' }}>Sem avaliações ainda do proprietário</span>
              )}
            </div>
          </div>

          <div className="spec-grid">
            <div className="spec"><div className="k">autonomia</div><div className="v">{car.range_km ?? '—'} km</div></div>
            <div className="spec"><div className="k">potência</div><div className="v">{car.power_hp ?? '—'} cv</div></div>
            <div className="spec"><div className="k">câmbio</div><div className="v">{LABELS.transmission[car.transmission]}</div></div>
            <div className="spec"><div className="k">lugares</div><div className="v">{car.seats}</div></div>
            <div className="spec"><div className="k">entrega</div><div className="v" style={{ color: 'var(--signal)' }}>● {car.delivery_hours}h</div></div>
            <div className="spec"><div className="k">hub</div><div className="v">{LABELS.hub[car.hub]}</div></div>
          </div>

          <div className="config">
            <h3>Configure sua assinatura</h3>

            <div className="term-grid">
              {TERM_OPTIONS.map(t => (
                <button
                  key={t}
                  className={`term ${term === t ? 'is-on' : ''} ${t === 3 ? 'best' : ''}`}
                  onClick={() => setTerm(t)}
                >
                  <div className="t">{t} {t === 1 ? 'mês' : 'meses'}</div>
                  <div className="d">{fmt.brl(monthlyFor(t))}/mês</div>
                </button>
              ))}
            </div>

            <div className="km-row">
              <span>Franquia mensal</span>
              <div className="km-seg">
                {(car.km_options ?? []).map(o => (
                  <button
                    key={o.value}
                    className={km === o.value ? 'is-on' : ''}
                    onClick={() => setKm(o.value)}
                  >
                    {kmShortLabel(o.value)}
                  </button>
                ))}
              </div>
            </div>

            <div className="extras">
              {EXTRA_OPTIONS.map(e => (
                <button
                  key={e.key}
                  className={`extra ${extras.has(e.key) ? 'is-on' : ''}`}
                  onClick={() => toggleExtra(e.key)}
                >
                  <span className="name">{e.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span className="price">{fmt.brl(e.price)}/mês</span>
                    <span className="toggle" />
                  </span>
                </button>
              ))}
            </div>

            <div className="total">
              <div className="row">
                <span>Assinatura {term} {term === 1 ? 'mês' : 'meses'}</span>
                <span>{fmt.brl(monthly)}/mês</span>
              </div>
              <div className="row">
                <span>Adesão</span>
                <span style={{ color: 'var(--signal)' }}>isenta</span>
              </div>
              <div className="row big">
                <span>Total mensal</span>
                <span className="v">
                  <span className="cur">R$</span>{fmt.int(monthly)}
                  <span className="per">/mês</span>
                </span>
              </div>
            </div>

            {user?.role === 'admin' || user?.role === 'proprietario' ? (
              <div className="cta-row">
                <span
                  className="btn btn--ghost"
                  style={{ flex: 1, justifyContent: 'center', cursor: 'default', color: 'var(--fg-mute)' }}
                >
                  {user.role === 'admin'
                    ? 'Modo admin · operações de locação desativadas'
                    : 'Modo proprietário · você não pode alugar carros'}
                </span>
              </div>
            ) : (
              <div className="cta-row">
                <button className="btn btn--primary" onClick={subscribe}>Assinar agora →</button>
                <button
                  className={`btn btn--ghost ${favored ? 'is-on' : ''}`}
                  onClick={toggleFavorite}
                  title="Favoritar"
                >
                  {favored ? '♥' : '♡'}
                </button>
              </div>
            )}
            <div className="car-note">Cancele quando quiser · sem multa</div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px 60px' }}>
        <CommentsSection carId={car.id} carSlug={car.slug} />
      </div>
    </>
  );
}
