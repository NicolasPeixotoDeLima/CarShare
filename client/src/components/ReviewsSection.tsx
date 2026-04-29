import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import type { ProfileReview } from '../lib/types';

function initial(s: string) {
  return (s || '?').trim().charAt(0).toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function StarRow({
  value, onChange, size,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: 'sm';
}) {
  const editable = !!onChange;
  return (
    <div className={`star-row ${editable ? '' : 'is-static'} ${size === 'sm' ? 'is-static' : ''}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={value >= n ? 'is-on' : ''}
          onClick={editable ? () => onChange(n) : undefined}
          style={editable ? { cursor: 'pointer' } : undefined}
        >
          {value >= n ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

interface Props {
  /** ID do usuario alvo. Se omitido, mostra os feedbacks recebidos pelo usuario logado. */
  targetUserId?: number;
  /** Permite o usuario logado deixar uma avaliacao (precisa de relacao via reserva). */
  allowSubmit?: boolean;
}

export function ReviewsSection({ targetUserId, allowSubmit }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ProfileReview[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; avg: number }>({ total: 0, avg: 0 });
  const [rating, setRating] = useState(0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    try {
      const r = targetUserId
        ? await api.reviews.forUser(targetUserId)
        : await api.reviews.me();
      setItems(r.items);
      setSummary(r.summary);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = targetUserId
          ? await api.reviews.forUser(targetUserId)
          : await api.reviews.me();
        if (!cancel) {
          setItems(r.items);
          setSummary(r.summary);
        }
      } catch {
        if (!cancel) setItems([]);
      }
    })();
    return () => { cancel = true; };
  }, [targetUserId]);

  async function submit() {
    if (!targetUserId || !rating || sending) return;
    setSending(true);
    setMsg(null);
    try {
      await api.reviews.create(targetUserId, { rating, body: draft.trim() || undefined });
      setMsg({ kind: 'ok', text: 'Feedback publicado, obrigado!' });
      setDraft('');
      setRating(0);
      void load();
    } catch (err) {
      let text = 'Não foi possível enviar.';
      if (err instanceof ApiError && err.code === 'no_relationship') {
        text = 'Você só pode avaliar alguém com quem teve uma reserva.';
      } else if (err instanceof ApiError && err.code === 'cannot_self_review') {
        text = 'Você não pode avaliar a si mesmo.';
      }
      setMsg({ kind: 'err', text });
    } finally {
      setSending(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Remover esta avaliação?')) return;
    try {
      await api.reviews.remove(id);
      setItems(prev => (prev || []).filter(r => r.id !== id));
      void load();
    } catch { /* noop */ }
  }

  const canSubmit = !!(allowSubmit && user && user.role !== 'admin' && targetUserId && targetUserId !== user.id);

  return (
    <section className="comments-section">
      <h3>Feedback <span className="italic">de perfil.</span></h3>
      <div className="comments-section__sub">
        Avaliações deixadas por clientes e proprietários após uma reserva.
      </div>

      <div className="review-summary">
        <div className="review-summary__score">
          {summary.total > 0 ? summary.avg.toFixed(1) : '—'}
        </div>
        <div>
          <StarRow value={Math.round(summary.avg)} />
          <div className="review-summary__count">
            {summary.total} {summary.total === 1 ? 'avaliação' : 'avaliações'}
          </div>
        </div>
      </div>

      {canSubmit && (
        <div className="comment-form">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="comment-form__hint">SUA NOTA</span>
            <StarRow value={rating} onChange={setRating} />
          </div>
          <textarea
            placeholder="Conte como foi a experiência (opcional)…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={800}
          />
          <div className="comment-form__bar">
            <span className="comment-form__hint">{draft.length}/800</span>
            <button
              className="c-btn c-btn--primary"
              onClick={submit}
              disabled={sending || !rating}
            >
              Publicar feedback
            </button>
          </div>
          {msg && (
            <div className={`c-form__msg c-form__msg--${msg.kind}`}>{msg.text}</div>
          )}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {items === null ? (
          <div style={{ color: 'var(--fg-mute)', fontSize: 13 }}>Carregando feedbacks…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--fg-mute)', fontSize: 13 }}>
            Nenhum feedback ainda.
          </div>
        ) : items.map(r => (
          <div key={r.id} className="comment">
            <div className="comment__avatar">{initial(r.author_name)}</div>
            <div>
              <div className="comment__head">
                <span className="comment__name">{r.author_name}</span>
                <span className="comment__role">{r.author_role}</span>
                <StarRow value={r.rating} size="sm" />
                <span className="comment__time">{formatTime(r.created_at)}</span>
              </div>
              {r.body && <div className="comment__body">{r.body}</div>}
              {user && (user.id === r.author_id || user.role === 'admin') && (
                <button className="comment__rm" onClick={() => remove(r.id)}>remover</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
