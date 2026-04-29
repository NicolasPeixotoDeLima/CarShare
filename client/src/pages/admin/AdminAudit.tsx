import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { Pager } from '../../components/Pager';
import { EmptyState } from '../../components/EmptyState';
import { FiltersBar } from '../../components/FiltersBar';
import { StatusTag } from '../../components/StatusTag';
import { Select } from '../../components/Select';
import { api, fmt } from '../../lib/api';
import type { AdminAuditRow } from '../../lib/types';

const PAGE = 100;

const ENTITY_OPTIONS = [
  { value: '',         label: 'Todas as entidades' },
  { value: 'user',     label: 'Usuário' },
  { value: 'booking',  label: 'Reserva' },
  { value: 'invoice',  label: 'Fatura' },
  { value: 'car',      label: 'Carro' },
  { value: 'comment',  label: 'Comentário' },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function payloadPreview(p: Record<string, unknown>) {
  if (!p || Object.keys(p).length === 0) return '—';
  return JSON.stringify(p);
}

export function AdminAudit() {
  const [items, setItems] = useState<AdminAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.admin.audit({
        action: action || undefined,
        entity: entity || undefined,
        limit: PAGE,
        offset,
      });
      setItems(r.items);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  }, [action, entity, offset]);

  useEffect(() => { void load(); }, [load]);

  return (
    <AdminLayout subtitle="Segurança · auditoria" title="Audit log">
      <div className="panel">
        <FiltersBar count={`${total} ${total === 1 ? 'registro' : 'registros'} · imutável`}>
          <input
            type="search"
            placeholder="Filtrar action (ex: user.banned, booking.status)…"
            value={action}
            onChange={e => { setOffset(0); setAction(e.target.value); }}
          />
          <Select
            size="sm"
            value={entity}
            onChange={v => { setOffset(0); setEntity(v); }}
            options={ENTITY_OPTIONS}
          />
        </FiltersBar>

        {loading && !items.length ? (
          <EmptyState>Carregando…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Nenhum registro de auditoria encontrado.</EmptyState>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Quando</th>
                <th>Admin</th>
                <th>Ação</th>
                <th>Alvo</th>
                <th>Payload</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} style={{ ['--i' as never]: i }}>
                  <td className="mono">#{it.id}</td>
                  <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    {formatDateTime(it.created_at)}
                  </td>
                  <td>
                    <div className="mono">{it.admin_email}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-mute)' }}>#{it.admin_id}</div>
                  </td>
                  <td><StatusTag variant="admin">{it.action}</StatusTag></td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {it.target_entity ?? '—'}
                    {it.target_id != null && <span style={{ color: 'var(--fg-mute)' }}>#{it.target_id}</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={JSON.stringify(it.payload, null, 2)}>
                    {payloadPreview(it.payload)}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)' }}>{it.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pager offset={offset} pageSize={PAGE} total={total} onChange={setOffset} />
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--fg-mute)', fontFamily: "'Geist Mono', monospace" }}>
        Registros são append-only (nunca editados ou deletados). Cada ação administrativa
        com mutação grava IP, user-agent, timestamp e payload da operação.
        Última atualização: {fmt.dateLong(new Date().toISOString())}.
      </div>
    </AdminLayout>
  );
}
