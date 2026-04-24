import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmt, LABELS } from '../lib/api';
import type { Booking } from '../lib/types';
import { useAuth } from '../lib/useAuth';
import './Success.css';

export function Success() {
  const [params] = useSearchParams();
  const code = params.get('code');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) { navigate('/profile', { replace: true }); return; }
    let cancel = false;
    (async () => {
      try {
        const r = await api.bookings.get(code);
        if (!cancel) setBooking(r.booking);
      } catch {
        if (!cancel) setError(true);
      }
    })();
    return () => { cancel = true; };
  }, [code, navigate]);

  if (error) {
    return (
      <div className="success-wrap">
        <h1 className="serif" style={{ fontSize: 48 }}>Pedido não encontrado</h1>
        <p style={{ marginTop: 20 }}>
          <Link to="/profile" style={{ color: 'var(--amber)' }}>Ir para minha conta →</Link>
        </p>
      </div>
    );
  }

  if (!booking) {
    return <div className="success-wrap" style={{ color: 'var(--fg-mute)' }}>Carregando…</div>;
  }

  const first = (user?.name || 'você').split(' ')[0];
  const addrLines = (booking.delivery_addr || '—').split(' — ');

  return (
    <div className="success-wrap">
      <div className="success-burst">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>

      <div className="success-eyebrow">● Assinatura ativada</div>
      <h1 className="success-h1">Pronto, <span className="italic">{first}.</span></h1>
      <div className="success-lead">
        Seu <strong>{booking.brand} {booking.model}</strong> já está sendo preparado. Você receberá
        um SMS quando o motorista estiver a caminho.
      </div>

      <div className="receipt">
        <div className="receipt__head">
          <div>
            <div className="label">Pedido</div>
            <div className="v">#{booking.code}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label">Emitido em</div>
            <div className="v" style={{ fontSize: 15, fontFamily: 'Geist Mono, monospace' }}>
              {booking.created_at.replace('T', ' · ').slice(0, 16)}
            </div>
          </div>
        </div>
        <div className="receipt__row">
          <span>Veículo</span>
          <span className="v">{booking.brand} {booking.model} {booking.year}</span>
        </div>
        <div className="receipt__row">
          <span>Prazo</span>
          <span className="v">{booking.term_months} {booking.term_months === 1 ? 'mês' : 'meses'} (renovável)</span>
        </div>
        <div className="receipt__row">
          <span>Franquia</span>
          <span className="v">{LABELS.km[booking.km_limit]}</span>
        </div>
        <div className="receipt__row">
          <span>Pagamento</span>
          <span className="v">
            {booking.payment_method ? LABELS.payment[booking.payment_method] : '—'}
          </span>
        </div>
        <div className="receipt__row receipt__row--total">
          <span>Mensal</span>
          <span className="v">{fmt.brl(booking.monthly_price)}/mês</span>
        </div>
      </div>

      <div className="delivery-eta">
        <div>
          <div className="delivery-eta__label">Previsão de entrega</div>
          <div className="delivery-eta__val">
            {booking.delivery_when ? LABELS.delivery[booking.delivery_when] : '—'}
          </div>
        </div>
        <div className="delivery-eta__addr">
          {addrLines.map((line, i) => (
            <div key={i}>{i === addrLines.length - 1 ? <strong>{line}</strong> : line}</div>
          ))}
        </div>
      </div>

      <div className="success-cta">
        <button className="btn btn--primary" onClick={() => navigate('/profile')}>Ir para minha conta →</button>
        <button className="btn btn--ghost"   onClick={() => navigate('/fleet')}>Ver frota</button>
      </div>

      <div className="next-grid">
        <div className="next-item">
          <div className="next-item__n">01</div>
          <div className="next-item__t">Verificação de CNH</div>
          <div className="next-item__d">Tire uma foto da sua CNH no app em até 24h.</div>
        </div>
        <div className="next-item">
          <div className="next-item__n">02</div>
          <div className="next-item__t">Chave digital</div>
          <div className="next-item__d">Ativaremos a chave digital quando o carro chegar.</div>
        </div>
        <div className="next-item">
          <div className="next-item__n">03</div>
          <div className="next-item__t">Troque quando quiser</div>
          <div className="next-item__d">A partir do 30º dia você pode trocar de modelo.</div>
        </div>
      </div>
    </div>
  );
}
