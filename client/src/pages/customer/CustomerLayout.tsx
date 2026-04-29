import { type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/useAuth';
import { Logo } from '../../components/Logo';
import { NotificationsBell } from '../../components/NotificationsBell';
import { BackButton } from '../../components/BackButton';
import type { Role } from '../../lib/types';
import '../Profile.css';
import './customer.css';
// As paginas de admin/owner usam .panel, .tbl, .btn, .filters, .tag, .empty
// definidos em admin.css. Importado aqui pra garantir que o shell unificado
// tenha esses primitivos disponiveis em qualquer role.
import '../admin/admin.css';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Restringe o acesso a uma role (ou conjunto). Se omitido, qualquer logado entra. */
  requiredRole?: Role | Role[];
  children: ReactNode;
}

function initial(s: string | null | undefined) {
  return (s || '?').trim().charAt(0).toUpperCase();
}

/**
 * Shell unificado de "perfil/configuração" usado por todas as paginas
 * autenticadas — cliente, proprietario e admin compartilham a mesma estrutura,
 * apenas a sidebar adapta os links conforme `user.role`.
 *
 * Re-exportado como `OwnerLayout` e `AdminLayout` (com `requiredRole` setado)
 * pra preservar os imports antigos sem espalhar refator pelo codigo.
 */
export function AppLayout({ title, subtitle, actions, requiredRole, children }: Props) {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div style={{ padding: '60px 40px', color: 'var(--fg-mute)' }}>Carregando…</div>;
  }
  if (!user) {
    navigate('/login?next=/profile', { replace: true });
    return null;
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(user.role)) {
      // Redireciona pra rota "casa" da role corrente.
      const home =
        user.role === 'admin'        ? '/admin'   :
        user.role === 'proprietario' ? '/owner'   :
                                       '/profile';
      navigate(home, { replace: true });
      return null;
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const first = (user.name || 'Conta').split(' ')[0];
  const isAdmin = user.role === 'admin';
  const isOwner = user.role === 'proprietario';

  return (
    <>
      <nav className="profile-nav">
        <Link to="/" className="profile-nav__logo">
          <Logo size={28} glow />
          <span>CarShare</span>
        </Link>
        <div className="profile-nav__actions">
          {!isAdmin && (
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
          <div
            className="profile-nav__user"
            onClick={() => navigate(isAdmin ? '/admin' : '/account')}
          >
            <div className="profile-nav__mini-av">{initial(user.name)}</div>
            <span>
              {first}
              {isAdmin ? ' · admin' : ''}
              {isOwner ? ' · proprietário' : ''}
              {' ▾'}
            </span>
          </div>
        </div>
      </nav>

      <div className="profile-shell">
        <aside className="profile-sidebar">
          <div className="menu">
            <div className="profile-back">
              <BackButton fallback={isAdmin ? '/admin' : '/'} />
            </div>

            {/* ============== CLIENTE ============== */}
            {user.role === 'cliente' && (
              <>
                <NavLink to="/profile"   end><span>▦</span><span>Visão geral</span></NavLink>
                <NavLink to="/bookings"     ><span>◉</span><span>Minhas reservas</span></NavLink>
                <NavLink to="/invoices"     ><span>☰</span><span>Faturas</span></NavLink>
                <NavLink to="/favorites"    ><span>♥</span><span>Favoritos</span></NavLink>
                <Link to="/fleet"           ><span>◐</span><span>Trocar de modelo</span></Link>

                <div className="menu__cat">Conta</div>
                <NavLink to="/account"      ><span>◌</span><span>Dados pessoais</span></NavLink>
              </>
            )}

            {/* ============== PROPRIETARIO ==============
              Proprietario opera APENAS no contexto de proprietario — sem
              "minhas reservas", "favoritos" etc. de cliente. */}
            {user.role === 'proprietario' && (
              <>
                <NavLink to="/owner" end><span>▦</span><span>Visão geral</span></NavLink>
                <NavLink to="/owner/cars"   ><span>◐</span><span>Meus carros</span></NavLink>
                <NavLink to="/owner/cars/new"><span>+</span><span>Cadastrar carro</span></NavLink>
                <NavLink to="/owner/bookings"><span>◇</span><span>Reservas recebidas</span></NavLink>
                <NavLink to="/owner/invoices"><span>☰</span><span>Faturas dos clientes</span></NavLink>

                <div className="menu__cat">Conta</div>
                <NavLink to="/account"      ><span>◌</span><span>Dados pessoais</span></NavLink>
              </>
            )}

            {/* ============== ADMIN ============== */}
            {isAdmin && (
              <>
                <NavLink to="/admin" end       ><span>▦</span><span>Visão geral</span></NavLink>
                <NavLink to="/admin/users"     ><span>◉</span><span>Usuários</span></NavLink>
                <NavLink to="/admin/cars"      ><span>◐</span><span>Carros</span></NavLink>
                <NavLink to="/admin/bookings"  ><span>◇</span><span>Reservas</span></NavLink>
                <NavLink to="/admin/invoices"  ><span>☰</span><span>Faturas</span></NavLink>

                <div className="menu__cat">Segurança</div>
                <NavLink to="/admin/audit"     ><span>⏱</span><span>Audit log</span></NavLink>
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
            {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
          </header>
          {children}
        </main>
      </div>
    </>
  );
}

// Aliases pra preservar os imports historicos das paginas existentes.
export const CustomerLayout = AppLayout;
