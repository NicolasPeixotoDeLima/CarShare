import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, LABELS, fmt } from '../lib/api';
import { draft as draftStore } from '../lib/draft';
import { useAuth } from '../lib/useAuth';
import { Logo } from '../components/Logo';
import type { BookingDraft, DeliveryWhen, PaymentMethod, User } from '../lib/types';
import './Checkout.css';

type StepId = 1 | 2 | 3 | 4;

interface PersonalForm {
  name: string;
  cpf: string;
  birth: string;
  email: string;
  phone: string;
  cnh: string;
}

interface AddressForm {
  cep: string;
  addr: string;
  city: string;
  state: string;
}

interface PaymentForm {
  card: string;
  exp: string;
  cvv: string;
}

export function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [step, setStep] = useState<StepId>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [personal, setPersonal] = useState<PersonalForm>({
    name: '', cpf: '', birth: '', email: '', phone: '', cnh: '',
  });
  const [addr, setAddr] = useState<AddressForm>({ cep: '', addr: '', city: '', state: '' });
  const [deliveryWhen, setDeliveryWhen] = useState<DeliveryWhen>('amanha_48h');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('card');
  const [card, setCard] = useState<PaymentForm>({ card: '', exp: '', cvv: '' });

  // Gate: must be logged in + have a draft
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/checkout'), { replace: true });
      return;
    }
    const d = draftStore.load();
    if (!d || !d.car_id) {
      navigate('/fleet', { replace: true });
      return;
    }
    setDraft(d);
    // Pre-fill from user
    hydrateFromUser(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  function hydrateFromUser(u: User) {
    setPersonal({
      name:  u.name || '',
      cpf:   u.cpf || '',
      birth: u.birthdate || '',
      email: u.email || '',
      phone: u.phone || '',
      cnh:   u.cnh || '',
    });
  }

  async function activate() {
    if (!draft) return;
    if (!acceptTerms) {
      setError('Você precisa aceitar os termos.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const r = await api.bookings.create({
        car_id:       draft.car_id,
        term_months:  draft.term_months,
        km_limit:     draft.km_limit,
        extras:       draft.extras,
        start_date:   new Date().toISOString().slice(0, 10),
        delivery_when: deliveryWhen,
        delivery_addr: [addr.addr, addr.city, addr.state, addr.cep].filter(Boolean).join(' — '),
        payment_method: payMethod,
        personal: {
          name:      personal.name,
          cpf:       personal.cpf,
          cnh:       personal.cnh,
          phone:     personal.phone,
          birthdate: personal.birth,
        },
      });
      draftStore.clear();
      navigate('/success?code=' + encodeURIComponent(r.booking.code));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown';
      setError('Não foi possível ativar: ' + code);
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) return null;

  const maskedCardNum = card.card ? '•••• •••• •••• ' + card.card.replace(/\s+/g, '').slice(-4).padStart(4, '•') : '•••• •••• •••• ••••';
  const cpfMasked = personal.cpf && personal.cpf.replace(/\D/g, '').length >= 11
    ? personal.cpf.replace(/^(\d{3})\D*(\d{3})\D*(\d{3})\D*(\d{2})$/, '***.$2.***-$4')
    : personal.cpf;

  return (
    <>
      <nav className="checkout-nav">
        <Link to="/" className="checkout-nav__logo">
          <Logo size={28} glow />
          <span>CarShare</span>
        </Link>
        <span className="checkout-nav__secure">🔒 Conexão segura · SSL 256-bit</span>
      </nav>

      <StepsBar current={step} />

      <div className="checkout-shell">
        <div>
          {step === 1 && (
            <section className="step-panel">
              <h2 className="serif">Sobre <span className="italic">você.</span></h2>
              <div className="step-panel__sub">Precisamos de alguns dados para emitir seu contrato digital.</div>

              <div className="field">
                <label>Nome completo</label>
                <input value={personal.name} onChange={e => setPersonal(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="field field--row">
                <div>
                  <label>CPF</label>
                  <input placeholder="000.000.000-00" value={personal.cpf} onChange={e => setPersonal(p => ({ ...p, cpf: e.target.value }))} />
                </div>
                <div>
                  <label>Data de nascimento</label>
                  <input placeholder="dd/mm/aaaa" value={personal.birth} onChange={e => setPersonal(p => ({ ...p, birth: e.target.value }))} />
                </div>
              </div>
              <div className="field field--row">
                <div>
                  <label>E-mail</label>
                  <input type="email" value={personal.email} readOnly />
                </div>
                <div>
                  <label>Celular</label>
                  <input placeholder="(11) 00000-0000" value={personal.phone} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>CNH (número de registro)</label>
                <input placeholder="00000000000" value={personal.cnh} onChange={e => setPersonal(p => ({ ...p, cnh: e.target.value }))} />
              </div>

              <div className="checkout-cta">
                <a className="back-btn" onClick={() => navigate(`/car?slug=${draft.slug}`)}>← Voltar ao carro</a>
                <button className="btn-primary" onClick={() => setStep(2)}>Continuar →</button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="step-panel">
              <h2 className="serif">Onde <span className="italic">entregamos?</span></h2>
              <div className="step-panel__sub">Levamos o carro até sua porta, com tanque cheio e pronto para rodar.</div>

              <div className="field">
                <label>CEP</label>
                <input value={addr.cep} onChange={e => setAddr(a => ({ ...a, cep: e.target.value }))} placeholder="00000-000" />
              </div>
              <div className="field">
                <label>Endereço</label>
                <input value={addr.addr} onChange={e => setAddr(a => ({ ...a, addr: e.target.value }))} placeholder="Rua, número e bairro" />
              </div>
              <div className="field field--row">
                <div>
                  <label>Cidade</label>
                  <input value={addr.city} onChange={e => setAddr(a => ({ ...a, city: e.target.value }))} />
                </div>
                <div>
                  <label>Estado</label>
                  <input maxLength={2} value={addr.state} onChange={e => setAddr(a => ({ ...a, state: e.target.value.toUpperCase() }))} />
                </div>
              </div>

              <div className="field">
                <label>Data desejada de entrega</label>
                <div className="method-grid" style={{ marginTop: 6 }}>
                  {([
                    { v: 'hoje_24h',   t: 'Hoje · 24h',      d: 'entre 14h e 19h · R$ 49' },
                    { v: 'amanha_48h', t: 'Amanhã · 48h',    d: 'janela de 4h · grátis' },
                    { v: 'agendar',    t: 'Escolher data',   d: 'até 7 dias · grátis' },
                  ] as const).map(o => (
                    <button
                      key={o.v}
                      className={`method ${deliveryWhen === o.v ? 'is-on' : ''}`}
                      onClick={() => setDeliveryWhen(o.v)}
                    >
                      <div className="t">{o.t}</div>
                      <div className="d">{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="checkout-cta">
                <a className="back-btn" onClick={() => setStep(1)}>← Voltar</a>
                <button className="btn-primary" onClick={() => setStep(3)}>Continuar →</button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="step-panel">
              <h2 className="serif">Como você <span className="italic">paga?</span></h2>
              <div className="step-panel__sub">Cobramos todo dia 10. Cancele quando quiser, sem multa.</div>

              <div className="method-grid">
                {([
                  { v: 'card',   t: '💳 Cartão',  d: 'recorrência automática' },
                  { v: 'pix',    t: '◎ Pix',     d: 'aprovação em 30s' },
                  { v: 'boleto', t: '🏦 Boleto',  d: '+R$ 4,90 por emissão' },
                ] as const).map(o => (
                  <button
                    key={o.v}
                    className={`method ${payMethod === o.v ? 'is-on' : ''}`}
                    onClick={() => setPayMethod(o.v)}
                  >
                    <div className="t">{o.t}</div>
                    <div className="d">{o.d}</div>
                  </button>
                ))}
              </div>

              {payMethod === 'card' && (
                <>
                  <div className="card-preview">
                    <div className="card-preview__brand">
                      CarShare<span style={{ fontFamily: 'Geist Mono,monospace', fontSize: 11, letterSpacing: '.2em', color: 'var(--fg-dim)' }}>VISA</span>
                    </div>
                    <div className="card-preview__chip" />
                    <div className="card-preview__num">{maskedCardNum}</div>
                    <div className="card-preview__foot">
                      <span>{(personal.name || 'TITULAR').toUpperCase()}</span>
                      <span>{card.exp || 'MM/AA'}</span>
                    </div>
                  </div>

                  <div className="field">
                    <label>Número do cartão</label>
                    <input placeholder="0000 0000 0000 0000" value={card.card} onChange={e => setCard(c => ({ ...c, card: e.target.value }))} />
                  </div>
                  <div className="field field--row">
                    <div>
                      <label>Validade</label>
                      <input placeholder="MM/AA" value={card.exp} onChange={e => setCard(c => ({ ...c, exp: e.target.value }))} />
                    </div>
                    <div>
                      <label>CVV</label>
                      <input placeholder="000" value={card.cvv} onChange={e => setCard(c => ({ ...c, cvv: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              <div className="checkout-cta">
                <a className="back-btn" onClick={() => setStep(2)}>← Voltar</a>
                <button className="btn-primary" onClick={() => setStep(4)}>Revisar →</button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="step-panel">
              <h2 className="serif">Último <span className="italic">passo.</span></h2>
              <div className="step-panel__sub">Revise tudo e ative sua assinatura. O contrato é enviado por e-mail.</div>

              <div className="review-box">
                <div className="review-box__row">
                  <span className="k">Titular</span>
                  <span className="v">{personal.name}{cpfMasked ? ' · CPF ' + cpfMasked : ''}</span>
                </div>
                <div className="review-box__row">
                  <span className="k">Entrega</span>
                  <span className="v">
                    {LABELS.delivery[deliveryWhen]}
                    {addr.city ? ' · ' + addr.city : ''}{addr.state ? ', ' + addr.state : ''}
                  </span>
                </div>
                <div className="review-box__row">
                  <span className="k">Pagamento</span>
                  <span className="v">
                    {payMethod === 'card' && card.card
                      ? `Cartão •••• ${card.card.replace(/\s+/g, '').slice(-4)}`
                      : LABELS.payment[payMethod]}
                  </span>
                </div>
                <div className="review-box__row">
                  <span className="k">Renovação</span>
                  <span className="v">Automática · mensal</span>
                </div>
              </div>

              <label style={{ display: 'flex', gap: 10, marginTop: 22, fontSize: 13, color: 'var(--fg-dim)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ accentColor: 'var(--amber)' }}
                />
                <span>
                  Li e aceito o <Link to="/help" style={{ color: 'var(--amber)' }}>contrato de assinatura</Link>, a{' '}
                  <Link to="/help" style={{ color: 'var(--amber)' }}>política de privacidade</Link> e autorizo a cobrança recorrente.
                </span>
              </label>

              {error && <div className="checkout-error">{error}</div>}

              <div className="checkout-cta">
                <a className="back-btn" onClick={() => setStep(3)}>← Voltar</a>
                <button className="btn-primary" onClick={activate} disabled={submitting}>
                  {submitting ? 'Ativando…' : 'Ativar assinatura →'}
                </button>
              </div>
            </section>
          )}
        </div>

        <Summary draft={draft} />
      </div>
    </>
  );
}

function StepsBar({ current }: { current: StepId }) {
  const steps: Array<{ n: number; label: string }> = [
    { n: 1, label: 'Seus dados' },
    { n: 2, label: 'Entrega' },
    { n: 3, label: 'Pagamento' },
    { n: 4, label: 'Confirmar' },
  ];
  return (
    <div className="steps-bar">
      <div className="sb-step is-done">
        <div className="sb-step__n">✓</div>
        <span>Carro</span>
      </div>
      {steps.map((s, i) => (
        <span key={s.n} style={{ display: 'contents' }}>
          <span className="sb-line" />
          <div className={`sb-step ${current === s.n ? 'is-on' : current > s.n ? 'is-done' : ''}`}>
            <div className="sb-step__n">{current > s.n ? '✓' : s.n}</div>
            <span>{s.label}</span>
          </div>
        </span>
      ))}
    </div>
  );
}

function Summary({ draft }: { draft: BookingDraft }) {
  return (
    <aside className="summary">
      <div className="summary__car">
        <div className="summary__sub">
          {draft.brand} · {draft.year} · {draft.term_months} {draft.term_months === 1 ? 'mês' : 'meses'}
        </div>
        <div className="summary__title">{draft.model}</div>
      </div>
      <div className="summary__rows">
        <div className="summary__row">
          <span>Prazo</span>
          <span className="v">{draft.term_months} {draft.term_months === 1 ? 'mês' : 'meses'}</span>
        </div>
        <div className="summary__row">
          <span>Franquia</span>
          <span className="v">{LABELS.km[draft.km_limit]}</span>
        </div>
        {draft.extras.map(e => (
          <div key={e} className="summary__row">
            <span>{LABELS.extra[e]}</span>
            <span className="v" style={{ color: 'var(--signal)' }}>incluso</span>
          </div>
        ))}
        <div className="summary__row">
          <span>Adesão</span>
          <span className="v" style={{ color: 'var(--signal)' }}>isenta</span>
        </div>
      </div>
      <div className="summary__total">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="label">Mensal</span>
          <span className="val">
            <span className="cur">R$</span>
            {fmt.int(draft.monthly_price)}
            <span className="per">/mês</span>
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 4 }}>
          Total {draft.term_months} {draft.term_months === 1 ? 'mês' : 'meses'}:{' '}
          {fmt.brl(draft.monthly_price * draft.term_months)}
        </div>
      </div>
      <div className="summary__note">● Cancele sem multa nos primeiros 7 dias</div>
    </aside>
  );
}
