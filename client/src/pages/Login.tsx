import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Logo } from '../components/Logo';
import './Login.css';

type Tab = 'login' | 'signup';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha inválidos.',
  email_taken:         'Este e-mail já está cadastrado.',
  weak_password:       'A senha precisa ter pelo menos 8 caracteres.',
  missing_fields:      'Preencha todos os campos obrigatórios.',
  invalid_role:        'Tipo de conta inválido.',
};

export function Login() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'signup' ? 'signup' : 'login');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');

  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [signupRole, setSignupRole] = useState<'cliente' | 'proprietario'>('cliente');

  function switchTab(next: Tab) {
    setTab(next);
    setError('');
    if (next === 'signup') setParams({ tab: 'signup' }, { replace: true });
    else setParams({}, { replace: true });
  }

  function goNext() {
    const next = params.get('next') || '/profile';
    navigate(next);
  }

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.login({ email: loginEmail, password: loginPw });
      goNext();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown';
      setError(ERROR_MESSAGES[code] || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function submitSignup(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.signup({ name, email: signupEmail, password: signupPw, phone, role: signupRole });
      goNext();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown';
      setError(ERROR_MESSAGES[code] || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <aside className="login-art">
        <Link to="/" className="login-art__logo">
          <Logo size={32} glow />
          <span>CarShare</span>
        </Link>

        <div className="login-art__quote">
          <div className="login-art__quote-mark">&ldquo;</div>
          <div className="login-art__quote-text">
            Troquei de carro <span className="italic" style={{ color: 'var(--amber)' }}>três vezes</span>{' '}
            em um ano. Custo previsível, zero burocracia.
          </div>
          <div className="login-art__author">
            <div className="login-art__avatar serif">R</div>
            <div>
              <div className="login-art__name">Rafael Monteiro</div>
              <div className="login-art__role">Assinante desde 2024 · São Paulo</div>
            </div>
          </div>
        </div>

        <div className="login-art__foot mono">
          <div>carros<span className="v serif">2.847</span></div>
          <div>cidades<span className="v serif">12</span></div>
          <div>assinantes<span className="v serif">48k</span></div>
        </div>
      </aside>

      <main className="login-form">
        <div className="login-tabs">
          <button className={`login-tab ${tab === 'login' ? 'is-on' : ''}`} onClick={() => switchTab('login')}>
            Entrar
          </button>
          <button className={`login-tab ${tab === 'signup' ? 'is-on' : ''}`} onClick={() => switchTab('signup')}>
            Criar conta
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={submitLogin} noValidate>
            <h1>Bem-vindo <span className="italic">de volta.</span></h1>
            <div className="login-sub">
              Entre para acompanhar sua assinatura, trocar de carro ou acionar assistência.
            </div>

            <div className="login-field">
              <label>E-mail</label>
              <input
                type="email"
                required
                placeholder="voce@exemplo.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="login-field">
              <label>Senha <Link to="/help">Esqueceu?</Link></label>
              <div className="login-password-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                />
                <span className="login-toggle-eye" onClick={() => setShowPw(v => !v)}>
                  {showPw ? 'ocultar' : 'mostrar'}
                </span>
              </div>
            </div>

            <label className="login-remember">
              <div className={`login-check ${remember ? 'is-on' : ''}`} onClick={() => setRemember(v => !v)} />
              <span>Manter conectado neste dispositivo</span>
            </label>

            <div className="login-error">{error}</div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar →'}
            </button>

            <div className="login-switch">
              Novo por aqui? <a onClick={() => switchTab('signup')}>Criar conta</a>
            </div>
          </form>
        ) : (
          <form onSubmit={submitSignup} noValidate>
            <h1>Crie sua <span className="italic">conta.</span></h1>
            <div className="login-sub">
              3 minutos para começar a dirigir. Você precisa de CNH válida e maior de 21 anos.
            </div>

            <div className="login-field">
              <label>Nome completo</label>
              <input required placeholder="Seu nome como na CNH"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="login-field">
              <label>E-mail</label>
              <input type="email" required placeholder="voce@exemplo.com"
                value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
            </div>
            <div className="login-field">
              <label>Celular</label>
              <input placeholder="(11) 99999-0000"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="login-field">
              <label>Criar senha</label>
              <input type="password" required minLength={8} placeholder="mínimo 8 caracteres"
                value={signupPw} onChange={(e) => setSignupPw(e.target.value)} />
            </div>

            <div className="login-field">
              <label>Tipo de conta</label>
              <div className="login-role-toggle">
                <button
                  type="button"
                  className={`login-role ${signupRole === 'cliente' ? 'is-on' : ''}`}
                  onClick={() => setSignupRole('cliente')}
                >
                  <div className="login-role__title">Quero alugar</div>
                  <div className="login-role__sub">Assino carros para usar</div>
                </button>
                <button
                  type="button"
                  className={`login-role ${signupRole === 'proprietario' ? 'is-on' : ''}`}
                  onClick={() => setSignupRole('proprietario')}
                >
                  <div className="login-role__title">Sou proprietário</div>
                  <div className="login-role__sub">Cadastro carros para aluguel</div>
                </button>
              </div>
            </div>

            <label className="login-remember">
              <div className={`login-check ${remember ? 'is-on' : ''}`} onClick={() => setRemember(v => !v)} />
              <span>
                Aceito os <Link to="/help" style={{ color: 'var(--amber)' }}>termos</Link> e a{' '}
                <Link to="/help" style={{ color: 'var(--amber)' }}>política de privacidade</Link>.
              </span>
            </label>

            <div className="login-error">{error}</div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Criando…' : 'Criar conta →'}
            </button>
            <div className="login-switch">
              Já tem conta? <a onClick={() => switchTab('login')}>Entrar</a>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
