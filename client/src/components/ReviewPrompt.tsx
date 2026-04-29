import { useEffect, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/useAuth';

interface Props {
  /** Codigo da reserva (apenas para identificar visualmente). */
  bookingCode: string;
  /** Usuario que sera avaliado (proprietario na visao cliente, cliente na visao owner). */
  targetUserId: number;
  /** Texto descritivo do alvo, ex: "o proprietário", "o cliente". */
  targetLabel: string;
  /** Callback após o envio bem-sucedido. */
  onSubmitted?: () => void;
}

/**
 * Prompt de avaliacao mostrado em bookings finalizados. Detecta se o usuario
 * logado ja avaliou o `targetUserId` — se sim, mostra confirmacao discreta;
 * se nao, oferece estrelas + texto opcional. Reusa POST /api/reviews.
 */
export function ReviewPrompt({ bookingCode, targetUserId, targetLabel, onSubmitted }: Props) {
  const { user } = useAuth();
  const [alreadyDone, setAlreadyDone] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Verifica se o user atual ja deixou review pra esse target
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    api.reviews.forUser(targetUserId)
      .then(r => {
        if (cancel) return;
        setAlreadyDone(r.items.some(x => x.author_id === user.id));
      })
      .catch(() => { if (!cancel) setAlreadyDone(false); });
    return () => { cancel = true; };
  }, [targetUserId, user]);

  async function submit() {
    if (!rating) return;
    setBusy(true);
    setErr(null);
    try {
      await api.reviews.create(targetUserId, { rating, body: body.trim() || undefined });
      setAlreadyDone(true);
      onSubmitted?.();
    } catch (e: unknown) {
      setErr(e instanceof ApiError ? e.code : 'erro');
    } finally {
      setBusy(false);
    }
  }

  if (alreadyDone === null) return null;

  if (alreadyDone) {
    return (
      <div style={{
        marginTop: 4, padding: 10, background: 'var(--bg-2)',
        borderRadius: 10, fontSize: 12, color: 'var(--fg-mute)',
        fontFamily: "'Geist Mono', monospace", letterSpacing: '.02em',
      }}>
        ✓ você já avaliou {targetLabel} desta reserva ({bookingCode})
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 4, padding: 14, background: 'linear-gradient(135deg, oklch(0.82 0.14 75 / .08), var(--bg-2))',
      border: '1px solid oklch(0.82 0.14 75 / .35)', borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 13 }}>
        <strong>Como foi a experiência com {targetLabel}?</strong>
        <span style={{ color: 'var(--fg-mute)', marginLeft: 6 }}>· {bookingCode}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, fontSize: 22, userSelect: 'none' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setRating(n)}
            style={{
              cursor: 'pointer',
              color: rating >= n ? 'var(--amber)' : 'var(--fg-mute)',
              transition: 'color 120ms',
            }}
          >
            {rating >= n ? '★' : '☆'}
          </span>
        ))}
      </div>
      <textarea
        placeholder="Deixe um comentário (opcional)…"
        value={body}
        onChange={e => setBody(e.target.value)}
        maxLength={800}
        style={{
          background: 'var(--surface)', border: '1px solid var(--line-soft)',
          borderRadius: 8, padding: 10, color: 'var(--fg)', fontFamily: 'inherit',
          fontSize: 13, resize: 'vertical', minHeight: 60, outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--fg-mute)', fontFamily: "'Geist Mono', monospace" }}>
          {body.length}/800
        </span>
        <button
          className="btn btn--xs btn--primary"
          onClick={submit}
          disabled={!rating || busy}
        >
          {busy ? 'Enviando…' : 'Publicar avaliação'}
        </button>
      </div>
      {err && <div style={{ fontSize: 11, color: 'var(--danger)' }}>{err}</div>}
    </div>
  );
}
