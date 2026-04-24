import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { User } from '../lib/types';
import { Logo } from './Logo';
import './Nav.css';

interface NavProps {
  user: User | null;
  onLogout?: () => void | Promise<void>;
  variant?: 'overlay' | 'solid';
  activeSection?: 'subscribe' | 'fleet' | 'how' | 'cities' | 'help';
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
        <NavLink to="/fleet" className={activeSection === 'fleet' ? 'is-active' : ''}>Frota</NavLink>
        <Link to="/help"  className={activeSection === 'help' ? 'is-active' : ''}>Ajuda</Link>
        {user && (
          <Link to="/profile">Minha conta</Link>
        )}
      </div>

      <div className="nav__right">
        {user ? (
          <>
            {user.role === 'admin' && (
              <button className="pill" onClick={() => navigate('/admin')} title="Painel admin">
                <span>▦</span>
                <span>Admin</span>
              </button>
            )}
            {user.role === 'proprietario' && (
              <button className="pill" onClick={() => navigate('/owner')} title="Painel proprietário">
                <span>▦</span>
                <span>Painel</span>
              </button>
            )}
            <button className="pill" onClick={() => navigate('/profile')}>
              <span>●</span>
              <span>{user.name.split(' ')[0]}</span>
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
