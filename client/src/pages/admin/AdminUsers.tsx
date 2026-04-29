import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { Pager } from '../../components/Pager';
import { EmptyState } from '../../components/EmptyState';
import { FiltersBar } from '../../components/FiltersBar';
import { StatusTag } from '../../components/StatusTag';
import { Select } from '../../components/Select';
import { api, fmt } from '../../lib/api';
import type { AdminUserRow, Role, UserStatus } from '../../lib/types';

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

  async function changeStatus(u: AdminUserRow, status: UserStatus) {
    const verb = status === 'banned' ? 'banir' : status === 'suspended' ? 'suspender' : 'reativar';
    let reason: string | null | undefined = null;
    if (status !== 'active') {
      reason = prompt(`Motivo (opcional) para ${verb} ${u.name}:`, u.status_reason || '');
      if (reason === null) return; // cancelado
    }
    if (!confirm(`Confirma ${verb} ${u.name} (${u.email})?`)) return;
    try {
      await api.admin.updateUser(u.id, { status, status_reason: reason || '' });
      await load();
    } catch (e: unknown) {
      alert('Erro: ' + ((e as { code?: string }).code || 'falha'));
    }
  }

  return (
    <AdminLayout subtitle="Gestão · contas" title="Usuários">
      <div className="panel">
        <FiltersBar count={`${total} ${total === 1 ? 'usuário' : 'usuários'}`}>
          <input
            type="search"
            placeholder="Buscar por nome ou email…"
            value={q}
            onChange={e => { setOffset(0); setQ(e.target.value); }}
          />
          <Select
            size="sm"
            value={role}
            onChange={v => { setOffset(0); setRole(v as Role | ''); }}
            options={[
              { value: '',             label: 'Todas as roles' },
              { value: 'admin',        label: 'Admin' },
              { value: 'cliente',      label: 'Cliente' },
              { value: 'proprietario', label: 'Proprietário' },
            ]}
          />
        </FiltersBar>

        {err && <EmptyState>Erro: {err}</EmptyState>}
        {loading && !items.length ? (
          <EmptyState>Carregando…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Nenhum usuário encontrado.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="right">Reservas</th>
                <th className="right">Carros</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u, i) => {
                const status = u.status || 'active';
                return (
                  <tr key={u.id} style={{ ['--i' as never]: i, opacity: status === 'banned' ? 0.55 : 1 }}>
                    <td className="mono">#{u.id}</td>
                    <td>{u.name}</td>
                    <td className="mono">{u.email}</td>
                    <td>
                      <Select
                        size="sm"
                        value={u.role}
                        onChange={v => changeRole(u.id, v as Role)}
                        options={[
                          { value: 'cliente',      label: 'cliente' },
                          { value: 'proprietario', label: 'proprietario' },
                          { value: 'admin',        label: 'admin' },
                        ]}
                      />
                    </td>
                    <td>
                      <StatusTag variant={status === 'active' ? 'active' : status === 'suspended' ? 'scheduled' : 'cancelled'}>
                        {status}
                      </StatusTag>
                      {u.status_reason && (
                        <div style={{ fontSize: 10, color: 'var(--fg-mute)', marginTop: 2, fontFamily: "'Geist Mono', monospace" }}>
                          {u.status_reason}
                        </div>
                      )}
                    </td>
                    <td className="right num">{u.bookings_count}</td>
                    <td className="right num">{u.cars_count}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{fmt.dateLong(u.created_at)}</td>
                    <td className="right" style={{ whiteSpace: 'nowrap' }}>
                      {status === 'active' && (
                        <>
                          <button className="btn btn--xs" onClick={() => changeStatus(u, 'suspended')} style={{ marginRight: 4 }}>
                            Suspender
                          </button>
                          <button className="btn btn--xs btn--danger" onClick={() => changeStatus(u, 'banned')} style={{ marginRight: 4 }}>
                            Banir
                          </button>
                        </>
                      )}
                      {status !== 'active' && (
                        <button className="btn btn--xs" onClick={() => changeStatus(u, 'active')} style={{ marginRight: 4 }}>
                          Reativar
                        </button>
                      )}
                      <button className="btn btn--xs btn--danger" onClick={() => remove(u)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pager offset={offset} pageSize={PAGE} total={total} onChange={setOffset} />
      </div>
    </AdminLayout>
  );
}
