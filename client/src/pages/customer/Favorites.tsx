import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomerLayout } from './CustomerLayout';
import { CarSilhouette } from '../../components/CarSilhouette';
import { api, fmt, LABELS } from '../../lib/api';
import type { Car } from '../../lib/types';

export function Favorites() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Car[] | null>(null);

  useEffect(() => {
    let cancel = false;
    api.profile.favorites()
      .then(r => { if (!cancel) setItems(r.items); })
      .catch(() => { if (!cancel) setItems([]); });
    return () => { cancel = true; };
  }, []);

  async function unfav(carId: number) {
    try {
      await api.favorites.toggle(carId);
      const r = await api.profile.favorites();
      setItems(r.items);
    } catch { /* noop */ }
  }

  return (
    <CustomerLayout title="Favoritos" subtitle="Carros que você salvou">
      {items === null ? (
        <div className="c-empty">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="c-empty">
          Você ainda não favoritou nenhum carro.<br />
          <Link to="/fleet" style={{ color: 'var(--amber)', marginTop: 12, display: 'inline-block' }}>
            Explorar a frota →
          </Link>
        </div>
      ) : (
        <div className="fav-grid-full">
          {items.map((c, i) => (
            <div key={c.id} className="fav" style={{ position: 'relative', ['--i' as never]: i }}>
              <button
                onClick={() => navigate(`/car?slug=${c.slug}`)}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <div className="fav__sub">{c.brand} · {LABELS.category[c.category]}</div>
                <div className="fav__title">{c.model}</div>
                <div className="fav__stage"><CarSilhouette category={c.category} /></div>
                <div className="fav__price">
                  <span className="num">{fmt.brl(c.price_month)}</span>/mês
                </div>
              </button>
              <button
                onClick={() => unfav(c.id)}
                title="Remover dos favoritos"
                style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'transparent', border: 'none',
                  color: 'var(--amber)', cursor: 'pointer', fontSize: 16,
                }}
              >♥</button>
            </div>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
