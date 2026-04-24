import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { CarSilhouette } from '../components/CarSilhouette';
import { useAuth } from '../lib/useAuth';
import { api, fmt, LABELS } from '../lib/api';
import type { Car, Category, Fuel, Hub, Transmission, CarsFilters } from '../lib/types';
import './Fleet.css';

const CATEGORY_CHIPS: Array<{ value: '' | Category; label: string }> = [
  { value: '',         label: 'Todos' },
  { value: 'urbano',   label: 'Urbano' },
  { value: 'seda',     label: 'Sedã' },
  { value: 'suv',      label: 'SUV' },
  { value: 'pickup',   label: 'Pickup' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'luxo',     label: 'Luxo' },
];

const FUEL_OPTIONS:   Array<{ value: Fuel;         label: string }> = [
  { value: 'flex',     label: 'Flex' },
  { value: 'hibrido',  label: 'Híbrido' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'diesel',   label: 'Diesel' },
];

const TRANS_OPTIONS:  Array<{ value: Transmission; label: string }> = [
  { value: 'automatico', label: 'Automático' },
  { value: 'cvt',        label: 'CVT' },
  { value: 'manual',     label: 'Manual' },
];

const SEAT_OPTIONS = [2, 5, 7] as const;

const HUB_OPTIONS: Array<{ value: Hub; label: string }> = [
  { value: 'sao-paulo', label: 'São Paulo' },
  { value: 'rio',       label: 'Rio de Janeiro' },
  { value: 'bh',        label: 'Belo Horizonte' },
  { value: 'curitiba',  label: 'Curitiba' },
  { value: 'poa',       label: 'Porto Alegre' },
];

const PAGE_SIZE = 9;

interface FleetState {
  category: '' | Category;
  fuel:     Set<Fuel>;
  transmission: Set<Transmission>;
  seats:    number | null;
  hub:      Set<Hub>;
  sort:     NonNullable<CarsFilters['sort']>;
}

export function Fleet() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const initialCategory = (params.get('category') as Category | null) || '';

  const [state, setState] = useState<FleetState>({
    category: initialCategory,
    fuel: new Set(),
    transmission: new Set(),
    seats: null,
    hub: new Set(),
    sort: 'popular',
  });

  const [items, setItems] = useState<Car[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);

  const filters = useMemo<CarsFilters>(() => ({
    category:     state.category || undefined,
    fuel:         state.fuel.size ? [...state.fuel] : undefined,
    transmission: state.transmission.size ? [...state.transmission] : undefined,
    seats:        state.seats ?? undefined,
    hub:          state.hub.size ? [...state.hub] : undefined,
    sort:         state.sort,
    limit:        PAGE_SIZE,
    offset,
  }), [state, offset]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: newItems, total } = await api.cars.list(filters);
      setItems(prev => offset === 0 ? newItems : [...prev, ...newItems]);
      setTotal(total);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => { void load(); }, [load]);

  // Whenever filters change (not offset), reset to page 0
  function setField<K extends keyof FleetState>(key: K, value: FleetState[K]) {
    setState(prev => ({ ...prev, [key]: value }));
    setOffset(0);
  }

  function toggleSet<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function clearAll() {
    setState(s => ({
      ...s,
      fuel: new Set(),
      transmission: new Set(),
      seats: null,
      hub: new Set(),
    }));
    setOffset(0);
  }

  return (
    <>
      <Nav user={user} onLogout={logout} activeSection="fleet" />

      <section className="fleet-head">
        <div>
          <div className="fleet-head__eb mono">Frota completa · atualizada agora</div>
          <h1 className="fleet-head__title">
            Toda a frota,<br /><span className="italic">uma assinatura.</span>
          </h1>
        </div>
        <div className="fleet-head__meta">
          <div className="fleet-head__stat">
            <span className="v">{fmt.int(total || 0)}</span>
            <span className="k">carros listados</span>
          </div>
          <div className="fleet-head__stat">
            <span className="v">{new Set(items.map(c => c.model)).size}</span>
            <span className="k">modelos únicos</span>
          </div>
          <div className="fleet-head__stat">
            <span className="v" style={{ color: 'var(--signal)' }}>● 24h</span>
            <span className="k">entrega mínima</span>
          </div>
        </div>
      </section>

      <div className="fleet-toolbar">
        {CATEGORY_CHIPS.map(c => (
          <button
            key={c.value || 'all'}
            className={`chip ${state.category === c.value ? 'is-on' : ''}`}
            onClick={() => setField('category', c.value)}
          >
            {c.label}
          </button>
        ))}
        <div className="fleet-toolbar__right">
          <label className="fleet-sort">
            <span className="mono" style={{ color: 'var(--fg-mute)', fontSize: 10, letterSpacing: '.1em' }}>ORDENAR</span>
            <select
              value={state.sort}
              onChange={(e) => setField('sort', e.target.value as FleetState['sort'])}
            >
              <option value="popular">Populares</option>
              <option value="newest">Mais novos</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
            </select>
          </label>
        </div>
      </div>

      <div className="fleet-shell">
        <aside className="fleet-filters">
          <div className="filter-group">
            <div className="filter-group__head">
              <span>Filtros</span>
              <span className="filter-group__clear" onClick={clearAll}>limpar</span>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group__head"><span>Combustível</span></div>
            {FUEL_OPTIONS.map(o => (
              <button
                key={o.value}
                className={`fopt ${state.fuel.has(o.value) ? 'is-on' : ''}`}
                onClick={() => setField('fuel', toggleSet(state.fuel, o.value))}
              >
                <span className="fopt__cbox" />{o.label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <div className="filter-group__head"><span>Câmbio</span></div>
            {TRANS_OPTIONS.map(o => (
              <button
                key={o.value}
                className={`fopt ${state.transmission.has(o.value) ? 'is-on' : ''}`}
                onClick={() => setField('transmission', toggleSet(state.transmission, o.value))}
              >
                <span className="fopt__cbox" />{o.label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <div className="filter-group__head"><span>Lugares</span></div>
            {SEAT_OPTIONS.map(s => (
              <button
                key={s}
                className={`fopt ${state.seats === s ? 'is-on' : ''}`}
                onClick={() => setField('seats', state.seats === s ? null : s)}
              >
                <span className="fopt__cbox" />{s}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <div className="filter-group__head"><span>Hub de entrega</span></div>
            {HUB_OPTIONS.map(h => (
              <button
                key={h.value}
                className={`fopt ${state.hub.has(h.value) ? 'is-on' : ''}`}
                onClick={() => setField('hub', toggleSet(state.hub, h.value))}
              >
                <span className="fopt__cbox" />{h.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="fleet-results">
          <div className="fleet-results__head">
            <div>
              <strong>{items.length}</strong> de <strong>{total}</strong> carros
            </div>
            <div>{state.category ? LABELS.category[state.category] : 'Toda a frota'}</div>
          </div>

          {items.length === 0 && !loading ? (
            <div className="fleet-empty">Nenhum carro encontrado com esses filtros.</div>
          ) : (
            <div className="grid">
              {items.map(c => <CarCard key={c.id} car={c} onClick={() => navigate(`/car?slug=${c.slug}`)} />)}
            </div>
          )}

          {items.length < total && (
            <div className="load-more">
              <div className="load-more__line" />
              <button
                className="load-more__btn"
                disabled={loading}
                onClick={() => setOffset(o => o + PAGE_SIZE)}
              >
                {loading ? 'Carregando…' : `Ver mais ${Math.min(PAGE_SIZE, total - items.length)} carros`}
              </button>
              <div className="load-more__line" />
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function CarCard({ car, onClick }: { car: Car; onClick: () => void }) {
  const badgeClass = car.badge ? `badge badge--${car.badge === 'popular' ? 'popular' : car.badge}` : '';
  const badgeLabel =
    car.badge === 'new' ? 'Novo' :
    car.badge === 'popular' ? '+ Popular' :
    car.badge === 'ev' ? 'Elétrico' : '';
  const fast = car.delivery_hours <= 36;

  return (
    <button className="card" onClick={onClick}>
      <div className="card__top">
        <div>
          <div className="card__sub">
            {car.brand} · {car.year} · {LABELS.category[car.category]}
          </div>
          <div className="card__title">{car.model}</div>
        </div>
        <div className="card__badges">
          {car.badge && <span className={badgeClass}>{badgeLabel}</span>}
        </div>
      </div>
      <div className="card__stage">
        <CarSilhouette category={car.category} />
      </div>
      <div className="card__meta">
        <div><span className="k">range</span><span className="v">{car.range_km ?? '—'} km</span></div>
        <div><span className="k">lugares</span><span className="v">{car.seats}</span></div>
        <div>
          <span className="k">entrega</span>
          <span className="v" style={fast ? { color: 'var(--signal)' } : undefined}>
            {fast ? '● ' : ''}{car.delivery_hours}h
          </span>
        </div>
      </div>
      <div className="card__foot">
        <div className="card__price">
          <span className="cur">R$</span>
          <span className="num">{fmt.int(car.price_month)}</span>
          <span className="per">/mês</span>
        </div>
        <div className="card__go">→</div>
      </div>
    </button>
  );
}
