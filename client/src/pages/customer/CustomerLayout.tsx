import { type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/useAuth';
import { Logo } from '../../components/Logo';
import '../Profile.css';
import './customer.css';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

function initial(s: string | null | undefined) {
  return (s || '?').trim().charAt(0).toUpperCase();
}

export function CustomerLayout({ title, subtitle, actions, children }: Props) {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div style={{ padding: '60px 40px', color: 'var(--fg-mute)' }}>Carregando…</div>;
  }
  if (!user) {
    navigate('/login?next=/profile', { replace: true });
    return null;
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const first = (user.name || 'Conta').split(' ')[0];

  return (
    <>
      <nav className="profile-nav">
        <Link to="/" className="profile-nav__logo">
          <Logo size={28} glow />
          <span>CarShare</span>
        </Link>
        <div className="profile-nav__user" onClick={() => navigate('/account')}>
          <div className="profile-nav__mini-av">{initial(user.name)}</div>
          <span>{first} ▾</span>
        </div>
      </nav>

      <div className="profile-shell">
        <aside className="profile-sidebar">
          <div className="menu">
            <NavLink to="/profile"   end><span>▦</span><span>Visão geral</span></NavLink>
            <NavLink to="/bookings"     ><span>◉</span><span>Minhas reservas</span></NavLink>
            <NavLink to="/invoices"     ><span>☰</span><span>Faturas</span></NavLink>
            <NavLink to="/favorites"    ><span>♥</span><span>Favoritos</span></NavLink>
            <Link to="/fleet"            ><span>◐</span><span>Trocar de modelo</span></Link>

            <div className="menu__cat">Conta</div>
            <NavLink to="/account"      ><span>◌</span><span>Dados pessoais</span></NavLink>

            {user.role === 'proprietario' && (
              <>
                <div className="menu__cat">Proprietário</div>
                <Link to="/owner"        ><span>▦</span><span>Painel</span></Link>
              </>
            )}
            {user.role === 'admin' && (
              <>
                <div className="menu__cat">Admin</div>
                <Link to="/admin"        ><span>▦</span><span>Painel admin</span></Link>
              </>
            )}

            <div className="menu__cat">Suporte</div>
            <Link to="/help"             ><span>?</span><span>Central de ajuda</span></Link>

            <div className="menu__divider" />
            <button onClick={handleLogout} style={{ color: 'var(--fg-mute)' }}>
              <span>↪</span><span>Sair</span>
            </button>
          </div>
        </aside>

        <main className="profile-main">
          <header className="profile-head">
            <div>
              {subtitle && <div className="profile-head__eb">{subtitle}</div>}
              <h1>{title}</h1>
            </div>
            {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
          </header>
          {children}
        </main>
      </div>
    </>
  );
}
