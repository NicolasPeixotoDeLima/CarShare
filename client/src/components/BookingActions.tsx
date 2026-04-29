import { useState } from 'react';
import { ApiError, api, fmt } from '../lib/api';
import type { Booking } from '../lib/types';

/* Tipo intencionalmente flexivel — Bookings da cliente e da owner tem shapes
   diferentes, mas todas as acoes precisam apenas dos campos abaixo. */
interface BookingLike {
  code: string;
  status: string;
  term_months: number;
  monthly_price: number;
  start_date: string;
  delivered_at: string | null;
  delivery_confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_fee: number | null;
  cancellation_reason: string | null;
}

/** Estima a multa de quebra usando a mesma formula do backend
 *  (30% × meses restantes × mensalidade). Apenas pre-visualizacao. */
export function estimateCancellationFee(b: BookingLike): number {
  const start = new Date(b.start_date).getTime();
  const monthMs = 1000 * 60 * 60 * 24 * 30;
  const elapsed = Math.max(0, Math.floor((Date.now() - start) / monthMs));
  const remaining = Math.max(0, b.term_months - elapsed);
  return Math.round(remaining * b.monthly_price * 0.3);
}

interface Props {
  booking: BookingLike;
  /** Quem ve esses controles. */
  side: 'cliente' | 'owner';
  /** Callback após qualquer mutação bem-sucedida. */
  onChanged?: () => void;
  /** Renderiza inline em uma linha de tabela (compacto) ou em um card. */
  compact?: boolean;
}

export function BookingActions({ booking, side, onChanged, compact }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(name: string, fn: () => Promise<unknown>) {
    setBusy(name);
    setErr(null);
    try {
      await fn();
      onChanged?.();
    } catch (e: unknown) {
      const code = e instanceof ApiError ? e.code : 'erro';
      setErr(code);
    } finally {
      setBusy(null);
    }
  }

  function confirmDelivery() {
    if (!confirm('Confirmar que você recebeu o carro? Isso ativa o contrato.')) return;
    void run('confirm', () => api.bookings.confirmDelivery(booking.code));
  }

  function markDelivered() {
    if (!confirm('Marcar este carro como entregue ao cliente?\nO cliente ainda precisará confirmar o recebimento.')) return;
    void run('mark', () => api.owner.markDelivered(booking.code));
  }

  function cancelContract() {
    const fee = estimateCancellationFee(booking);
    const reason = prompt(
      `Quebrar contrato gera multa de ${fmt.brl(fee)} (30% × meses restantes × mensalidade).\n\nMotivo (opcional):`,
      '',
    );
    if (reason === null) return; // cancelado
    const fn = side === 'cliente'
      ? () => api.bookings.cancel(booking.code, reason)
      : () => api.owner.cancelBooking(booking.code, reason);
    void run('cancel', fn);
  }

  function finishContract() {
    if (!confirm('Encerrar o contrato deste carro?')) return;
    void run('finish', () => api.owner.finishBooking(booking.code));
  }

  const isClosed = booking.status === 'cancelled' || booking.status === 'finished';
  const btnCls = compact ? 'btn btn--xs' : 'btn';
  const btns: React.ReactNode[] = [];

  if (side === 'owner' && !isClosed && !booking.delivered_at) {
    btns.push(
      <button key="mark" className={btnCls} disabled={busy === 'mark'} onClick={markDelivered}>
        {busy === 'mark' ? 'Marcando…' : '🚗 Marcar entregue'}
      </button>,
    );
  }
  if (side === 'cliente' && booking.delivered_at && !booking.delivery_confirmed_at && !isClosed) {
    btns.push(
      <button key="confirm" className={`${btnCls} btn--primary`} disabled={busy === 'confirm'} onClick={confirmDelivery}>
        {busy === 'confirm' ? 'Confirmando…' : '✓ Confirmar recebimento'}
      </button>,
    );
  }
  if (side === 'owner' && !isClosed && booking.delivery_confirmed_at) {
    btns.push(
      <button key="finish" className={btnCls} disabled={busy === 'finish'} onClick={finishContract}>
        {busy === 'finish' ? 'Encerrando…' : '◌ Encerrar contrato'}
      </button>,
    );
  }
  if (!isClosed) {
    btns.push(
      <button key="cancel" className={`${btnCls} btn--danger`} disabled={busy === 'cancel'} onClick={cancelContract}>
        {busy === 'cancel' ? 'Cancelando…' : '✕ Quebrar contrato'}
      </button>,
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {btns.length > 0 ? btns : (
        <span style={{ fontSize: 11, color: 'var(--fg-mute)', fontFamily: "'Geist Mono', monospace" }}>
          {booking.status === 'cancelled' && booking.cancellation_fee
            ? `cancelado · multa ${fmt.brl(booking.cancellation_fee)}`
            : booking.status === 'finished'
              ? 'contrato encerrado'
              : '—'}
        </span>
      )}
      {err && (
        <span style={{ fontSize: 11, color: 'var(--danger)', fontFamily: "'Geist Mono', monospace" }}>
          {err}
        </span>
      )}
    </div>
  );
}

/* ============== STATUS HINT ============== */

interface StatusHintProps {
  booking: BookingLike;
  side: 'cliente' | 'owner';
}

/** Texto curto explicando o estado atual do contrato. */
export function BookingStatusHint({ booking, side }: StatusHintProps) {
  if (booking.status === 'cancelled') {
    return (
      <span style={{ fontSize: 11, color: 'var(--danger)' }}>
        ✕ contrato quebrado
        {booking.cancellation_fee != null && ` · multa ${fmt.brl(booking.cancellation_fee)}`}
      </span>
    );
  }
  if (booking.status === 'finished') {
    return <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>◌ contrato encerrado</span>;
  }
  if (!booking.delivered_at) {
    return (
      <span style={{ fontSize: 11, color: 'var(--amber)' }}>
        {side === 'owner' ? '◎ aguardando você marcar a entrega' : '◎ aguardando entrega do proprietário'}
      </span>
    );
  }
  if (!booking.delivery_confirmed_at) {
    return (
      <span style={{ fontSize: 11, color: 'var(--amber)' }}>
        {side === 'cliente' ? '◎ confirme o recebimento do carro' : '◎ aguardando cliente confirmar recebimento'}
      </span>
    );
  }
  return <span style={{ fontSize: 11, color: 'var(--signal)' }}>● contrato ativo</span>;
}
