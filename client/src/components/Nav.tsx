import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { Role, User } from '../lib/types';
import { Logo } from './Logo';
import { NotificationsBell } from './NotificationsBell';
import './Nav.css';

interface NavProps {
  user: User | null;
  onLogout?: () => void | Promise<void>;
  variant?: 'overlay' | 'solid';
  activeSection?: 'subscribe' | 'fleet' | 'how' | 'cities' | 'help';
}

/** Rota "casa" do usuario logado — varia por role pra refletir a separacao
 *  estrita: admin → painel admin, proprietario → painel owner, cliente → perfil. */
function homeRouteFor(role: Role): string {
  if (role === 'admin')        return '/admin';
  if (role === 'proprietario') return '/owner';
  return '/profile';
}

export function Nav({ user, onLogout, variant = 'overlay', activeSection }: NavProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    if (onLogout) await onLogout();
    navigate('/');
  }

  return (
    <nav className={`nav ${variant === 'solid' ? 'nav--solid' : ''}`}>
      <Link to="/" className="nav__logo">
        <Logo size={28} glow />
        <span>CarShare</span>
      </Link>

      <div className="nav__links">
        {/* Frota visivel pra cliente, proprietario e anonimo. Admin nao precisa
            do atalho. Proprietario ve a vitrine mas sem CTAs de aluguel. */}
        {(!user || user.role !== 'admin') && (
          <NavLink to="/fleet" className={activeSection === 'fleet' ? 'is-active' : ''}>Frota</NavLink>
        )}
        <Link to="/help"  className={activeSection === 'help' ? 'is-active' : ''}>Ajuda</Link>
        {user && (
          <Link to={homeRouteFor(user.role)}>Minha conta</Link>
        )}
      </div>

      <div className="nav__right">
        {user ? (
          <>
            {user.role !== 'admin' && (
              <>
                <button
                  className="pill nav__chat"
                  onClick={() => navigate('/chat')}
                  title="Mensagens"
                  aria-label="Mensagens"
                >
                  <span>✉</span>
                </button>
                <NotificationsBell />
              </>
            )}
            <button
              className="pill"
              onClick={() => navigate(homeRouteFor(user.role))}
              title="Meu perfil"
            >
              <span>●</span>
              <span>
                {user.name.split(' ')[0]}
                {user.role === 'admin'        ? ' · admin'        : ''}
                {user.role === 'proprietario' ? ' · proprietário' : ''}
              </span>
            </button>
            <button className="pill pill--cta" onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <>
            <button className="pill" onClick={() => navigate('/login')}>
              <span>●</span>
              <span>Entrar</span>
            </button>
            <button
              className="pill pill--cta"
              onClick={() => navigate('/login?tab=signup')}
            >
              Começar teste
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
