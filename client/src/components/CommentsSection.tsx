import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import type { CarComment } from '../lib/types';

function initial(s: string) {
  return (s || '?').trim().charAt(0).toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface Props {
  carId: number;
  carSlug: string;
}

export function CommentsSection({ carId, carSlug }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<CarComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    api.comments.list(carId)
      .then(r => { if (!cancel) setItems(r.items); })
      .catch(() => { if (!cancel) setItems([]); });
    return () => { cancel = true; };
  }, [carId]);

  async function submit() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setErr(null);
    try {
      const r = await api.comments.create(carId, body);
      setItems(prev => [r.comment, ...(prev || [])]);
      setDraft('');
    } catch {
      setErr('Não foi possível enviar.');
    } finally {
      setSending(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Remover este comentário?')) return;
    try {
      await api.comments.remove(id);
      setItems(prev => (prev || []).filter(c => c.id !== id));
    } catch { /* noop */ }
  }

  return (
    <section className="comments-section">
      <h3>Comentários <span className="italic">do anúncio.</span></h3>
      <div className="comments-section__sub">
        Perguntas e impressões deixadas por outros usuários.
      </div>

      {user && (user.role === 'admin' || user.role === 'proprietario') ? (
        <div style={{ padding: 14, background: 'var(--bg-2)', borderRadius: 12, fontSize: 12, color: 'var(--fg-mute)', fontFamily: "'Geist Mono', monospace" }}>
          {user.role === 'admin'
            ? 'MODO ADMIN · você pode apenas moderar (remover comentários ofensivos).'
            : 'MODO PROPRIETÁRIO · comentários são deixados pelos clientes interessados no anúncio.'}
        </div>
      ) : user ? (
        <div className="comment-form">
          <textarea
            placeholder="Compartilhe uma dúvida ou impressão sobre este carro…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={1000}
          />
          <div className="comment-form__bar">
            <span className="comment-form__hint">{draft.length}/1000 · sê respeitoso</span>
            <button
              className="c-btn c-btn--primary"
              onClick={submit}
              disabled={sending || !draft.trim()}
            >
              Publicar
            </button>
          </div>
          {err && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{err}</div>}
        </div>
      ) : (
        <div style={{ padding: 14, background: 'var(--bg-2)', borderRadius: 12, fontSize: 13, color: 'var(--fg-mute)' }}>
          <Link to={`/login?next=/car?slug=${carSlug}`} style={{ color: 'var(--amber)' }}>Entre na sua conta</Link>
          {' '}para deixar um comentário.
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {items === null ? (
          <div style={{ color: 'var(--fg-mute)', fontSize: 13 }}>Carregando comentários…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--fg-mute)', fontSize: 13 }}>
            Nenhum comentário ainda. Seja o primeiro a comentar.
          </div>
        ) : items.map(c => (
          <div key={c.id} className="comment">
            <div className="comment__avatar">{initial(c.user_name)}</div>
            <div>
              <div className="comment__head">
                <span className="comment__name">{c.user_name}</span>
                {c.user_role !== 'cliente' && (
                  <span className="comment__role">{c.user_role}</span>
                )}
                <span className="comment__time">{formatTime(c.created_at)}</span>
              </div>
              <div className="comment__body">{c.body}</div>
              {user && (user.id === c.user_id || user.role === 'admin') && (
                <button className="comment__rm" onClick={() => remove(c.id)}>remover</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
