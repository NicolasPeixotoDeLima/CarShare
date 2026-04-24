import { type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/useAuth';
import { Logo } from '../../components/Logo';
import '../admin/admin.css';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function OwnerLayout({ title, subtitle, actions, children }: Props) {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="admin-loading">Carregando…</div>;
  if (!user || (user.role !== 'proprietario' && user.role !== 'admin')) {
    navigate('/login?next=/owner', { replace: true });
    return null;
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const initial = (user.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link to="/owner" className="admin-side__brand">
          <Logo size={34} glow />
          <div>
            <div className="admin-side__title">CarShare</div>
            <div className="admin-side__sub">Painel proprietário</div>
          </div>
        </Link>

        <nav className="admin-side__nav">
          <NavLink to="/owner" end>
            <span className="ic">▦</span><span>Dashboard</span>
          </NavLink>
          <NavLink to="/owner/cars">
            <span className="ic">◐</span><span>Meus carros</span>
          </NavLink>
          <NavLink to="/owner/cars/new">
            <span className="ic">+</span><span>Cadastrar carro</span>
          </NavLink>
          <NavLink to="/owner/bookings">
            <span className="ic">◇</span><span>Reservas recebidas</span>
          </NavLink>

          <div className="admin-side__cat">Conta</div>
          <Link to="/profile">
            <span className="ic">◌</span><span>Meu perfil</span>
          </Link>
          <Link to="/">
            <span className="ic">↗</span><span>Ir ao site</span>
          </Link>
          <button onClick={handleLogout} className="admin-side__logout">
            <span className="ic">↪</span><span>Sair</span>
          </button>
        </nav>

        <div className="admin-side__me">
          <div className="admin-side__av">{initial}</div>
          <div className="admin-side__me-meta">
            <div className="n">{user.name}</div>
            <div className="m">{user.email}</div>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-head">
          <div>
            {subtitle && <div className="admin-head__eb">{subtitle}</div>}
            <h1>{title}</h1>
          </div>
          {actions && <div className="admin-head__actions">{actions}</div>}
        </header>
        <div className="admin-body">{children}</div>
      </main>
    </div>
  );
}
