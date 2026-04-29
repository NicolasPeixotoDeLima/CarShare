import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { NotificationItem } from '../lib/types';
import './NotificationsBell.css';

const TYPE_ICON: Record<NotificationItem['type'], string> = {
  message: '✉',
  booking: '◉',
  invoice: '☰',
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await api.notifications.list();
      setItems(r.items);
      setUnread(r.unread);
    } catch { /* anon — silencia */ }
  }

  useEffect(() => {
    void load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  const reposition = useCallback(() => {
    if (!bellRef.current) return;
    const r = bellRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 12, right: window.innerWidth - r.right });
  }, []);

  useLayoutEffect(() => { if (open) reposition(); }, [open, reposition]);

  // Fecha ao clicar fora; reposiciona em scroll/resize
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  function handleOpen() {
    setOpen(o => !o);
    if (!open) void load();
  }

  function handleClick(item: NotificationItem) {
    setOpen(false);
    navigate(item.link);
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        ref={bellRef}
        className={`notif-bell ${unread > 0 ? 'has-unread' : ''}`}
        onClick={handleOpen}
        title="Notificações"
        aria-label="Notificações"
      >
        <span className="notif-bell__ic" aria-hidden>♪</span>
        {unread > 0 && (
          <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="notif-panel notif-panel--portal"
          role="dialog"
          style={pos ? { top: pos.top, right: pos.right } : { visibility: 'hidden' }}
        >
          <header className="notif-panel__head">
            <div>
              <div className="notif-panel__title">Notificações</div>
              <div className="notif-panel__sub">
                {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'tudo em dia'}
              </div>
            </div>
            <button
              className="notif-panel__chat"
              onClick={() => { setOpen(false); navigate('/chat'); }}
            >
              ✉ abrir chat
            </button>
          </header>

          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty__ic">◌</div>
                <div>Nenhuma notificação por aqui.</div>
              </div>
            ) : items.map(it => (
              <button
                key={it.id}
                className={`notif-item ${it.unread ? 'is-unread' : ''}`}
                onClick={() => handleClick(it)}
              >
                <div className={`notif-item__ic notif-item__ic--${it.type}`}>
                  {TYPE_ICON[it.type]}
                </div>
                <div className="notif-item__main">
                  <div className="notif-item__head">
                    <span className="notif-item__title">{it.title}</span>
                    <span className="notif-item__time">{relativeTime(it.at)}</span>
                  </div>
                  <div className="notif-item__body">{it.body}</div>
                  <div className="notif-item__meta">{it.meta}</div>
                </div>
                {it.unread && <span className="notif-item__dot" />}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
