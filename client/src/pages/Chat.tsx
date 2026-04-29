import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { BackButton } from '../components/BackButton';
import { useAuth } from '../lib/useAuth';
import { api } from '../lib/api';
import type { ChatThread, ChatThreadSummary } from '../lib/types';
import './Chat.css';

function initial(s: string | null | undefined) {
  return (s || '?').trim().charAt(0).toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function Chat() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const codeParam = params.get('code') || '';

  const [threads, setThreads] = useState<ChatThreadSummary[] | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login?next=/chat', { replace: true });
    } else if (user.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [loading, user, navigate]);

  // Carrega lista de threads
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    api.chat.threads()
      .then(r => { if (!cancel) setThreads(r.items); })
      .catch(() => { if (!cancel) setThreads([]); });
    return () => { cancel = true; };
  }, [user]);

  // Auto-seleciona a primeira thread se nao houver code na URL
  useEffect(() => {
    if (!threads || codeParam) return;
    if (threads.length > 0) {
      setParams({ code: threads[0].code }, { replace: true });
    }
  }, [threads, codeParam, setParams]);

  // Carrega a thread atual + polling leve para novas mensagens
  useEffect(() => {
    if (!codeParam) { setThread(null); return; }
    let cancel = false;

    async function load() {
      try {
        const t = await api.chat.get(codeParam);
        if (!cancel) setThread(t);
      } catch {
        if (!cancel) setThread(null);
      }
    }
    void load();
    const id = setInterval(load, 5000);
    return () => { cancel = true; clearInterval(id); };
  }, [codeParam]);

  // Auto-scroll quando novas mensagens chegam
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [thread?.messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !thread || sending) return;
    setSending(true);
    setErr(null);
    try {
      const r = await api.chat.send(thread.booking.code, body);
      setThread({ ...thread, messages: [...thread.messages, r.message] });
      setDraft('');
      api.chat.threads().then(t => setThreads(t.items)).catch(() => {});
    } catch {
      setErr('Não foi possível enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  function onComposeKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (loading || !user) {
    return (
      <>
        <Nav user={user} onLogout={logout} variant="solid" />
        <div className="chat-page">
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-mute)' }}>
            Carregando…
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav user={user} onLogout={logout} variant="solid" />
      <div className="chat-page">
        <div style={{ marginBottom: 16 }}>
          <BackButton fallback="/profile" />
        </div>
        <header className="chat-page__head">
          <div>
            <div className="chat-page__eb">CHAT · CLIENTE ↔ PROPRIETÁRIO</div>
            <h1 className="chat-page__title">Mensagens</h1>
          </div>
        </header>

        <div className="chat-shell">
          <aside className="chat-threads">
            <div className="chat-threads__head">CONVERSAS</div>
            {threads === null ? (
              <div style={{ padding: 16, color: 'var(--fg-mute)', fontSize: 13 }}>Carregando…</div>
            ) : threads.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--fg-mute)', fontSize: 13 }}>
                Nenhuma conversa ainda. As conversas surgem após uma reserva entre cliente e proprietário.
              </div>
            ) : threads.map(t => (
              <button
                key={t.code}
                className={`chat-thread ${codeParam === t.code ? 'is-on' : ''}`}
                onClick={() => setParams({ code: t.code })}
              >
                <div className="chat-thread__name">{t.peer_name || 'Sem contato'}</div>
                <div className="chat-thread__role">{t.role === 'cliente' ? 'proprietário' : 'cliente'}</div>
                <div className="chat-thread__car">{t.brand} {t.model} · {t.code}</div>
                <div className="chat-thread__last">
                  {t.last_body || <span style={{ fontStyle: 'italic' }}>sem mensagens</span>}
                </div>
                {t.unread > 0 && (
                  <div className="chat-thread__unread" style={{ gridColumn: 2, gridRow: 1 }}>{t.unread}</div>
                )}
              </button>
            ))}
          </aside>

          <section className="chat-panel">
            {!thread ? (
              <div className="chat-empty">
                {threads && threads.length === 0
                  ? 'Quando alguém alugar um dos seus carros, ou você alugar um, a conversa aparece aqui.'
                  : 'Selecione uma conversa.'}
              </div>
            ) : (
              <>
                <div className="chat-panel__head">
                  <div className="chat-panel__peer">
                    <div className="chat-panel__avatar">{initial(thread.peer.name)}</div>
                    <div>
                      <div className="chat-panel__name">{thread.peer.name}</div>
                      <div className="chat-panel__sub">
                        {thread.role === 'cliente' ? 'PROPRIETÁRIO' : 'CLIENTE'} · {thread.peer.email}
                      </div>
                    </div>
                  </div>
                  <div className="chat-panel__meta">
                    <div>{thread.booking.code}</div>
                    <div>
                      <Link to={`/car?slug=${thread.booking.car.slug}`}>
                        {thread.booking.car.brand} {thread.booking.car.model}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="chat-stream" ref={streamRef}>
                  {thread.messages.length === 0 ? (
                    <div className="chat-empty">
                      Inicie a conversa. Combine entrega, devolução, ou tire dúvidas sobre o carro.
                    </div>
                  ) : thread.messages.map(m => {
                    const mine = m.sender_id !== thread.peer.id;
                    return (
                      <div key={m.id} className={`chat-msg chat-msg--${mine ? 'mine' : 'peer'}`}>
                        {m.body}
                        <span className="chat-msg__time">{formatTime(m.created_at)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="chat-compose">
                  <textarea
                    placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={onComposeKey}
                    maxLength={2000}
                  />
                  <button
                    className="c-btn c-btn--primary"
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                  >
                    Enviar →
                  </button>
                </div>
                {err && <div style={{ padding: '0 18px 14px', color: 'var(--danger)', fontSize: 12 }}>{err}</div>}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
