import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { api, fmt } from '../../lib/api';
import type { AdminUserRow, Role } from '../../lib/types';

const PAGE = 50;

export function AdminUsers() {
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [role, setRole] = useState<Role | ''>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.admin.users({
        role: role || undefined,
        q: q || undefined,
        limit: PAGE,
        offset,
      });
      setItems(r.items);
      setTotal(r.total);
    } catch (e: unknown) {
      setErr((e as { code?: string }).code || 'erro');
    } finally {
      setLoading(false);
    }
  }, [role, q, offset]);

  useEffect(() => { void load(); }, [load]);

  async function changeRole(id: number, newRole: Role) {
    if (!confirm(`Trocar role do usuário #${id} para "${newRole}"?`)) return;
    try {
      await api.admin.updateUser(id, { role: newRole });
      await load();
    } catch (e: unknown) {
      alert('Erro: ' + ((e as { code?: string }).code || 'falha'));
    }
  }

  async function remove(u: AdminUserRow) {
    if (!confirm(`Excluir ${u.name} (${u.email})? Reservas e favoritos do usuário também serão removidos.`)) return;
    try {
      await api.admin.deleteUser(u.id);
      await load();
    } catch (e: unknown) {
      alert('Erro: ' + ((e as { code?: string }).code || 'falha'));
    }
  }

  return (
    <AdminLayout subtitle="Gestão · contas" title="Usuários">
      <div className="panel">
        <div className="filters">
          <input
            type="search"
            placeholder="Buscar por nome ou email…"
            value={q}
            onChange={e => { setOffset(0); setQ(e.target.value); }}
          />
          <select value={role} onChange={e => { setOffset(0); setRole(e.target.value as Role | ''); }}>
            <option value="">Todas as roles</option>
            <option value="admin">Admin</option>
            <option value="cliente">Cliente</option>
            <option value="proprietario">Proprietário</option>
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--fg-mute)', alignSelf: 'center' }}>
            {total} {total === 1 ? 'usuário' : 'usuários'}
          </span>
        </div>

        {err && <div className="empty">Erro: {err}</div>}
        {loading && !items.length ? (
          <div className="empty">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="empty">Nenhum usuário encontrado.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Role</th>
                <th className="right">Reservas</th>
                <th className="right">Carros</th>
                <th>Cadastro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u, i) => (
                <tr key={u.id} style={{ ['--i' as never]: i }}>
                  <td className="mono">#{u.id}</td>
                  <td>{u.name}</td>
                  <td className="mono">{u.email}</td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value as Role)}
                    >
                      <option value="cliente">cliente</option>
                      <option value="proprietario">proprietario</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="right num">{u.bookings_count}</td>
                  <td className="right num">{u.cars_count}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{fmt.dateLong(u.created_at)}</td>
                  <td className="right">
                    <button className="btn btn--xs btn--danger" onClick={() => remove(u)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pager">
          <span>
            {offset + 1}–{Math.min(offset + PAGE, total)} de {total}
          </span>
          <div className="pager__btns">
            <button
              className="btn btn--xs"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE))}
            >← anterior</button>
            <button
              className="btn btn--xs"
              disabled={offset + PAGE >= total}
              onClick={() => setOffset(offset + PAGE)}
            >próxima →</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
