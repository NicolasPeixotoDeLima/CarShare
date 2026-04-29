import type { ReactNode } from 'react';

interface Props {
  /** Variante visual: usa `.empty` (admin/owner) ou `.c-empty` (perfil cliente). */
  variant?: 'admin' | 'customer';
  children: ReactNode;
}

/**
 * Estado vazio/loading reutilizavel. Centraliza o markup que estava espalhado
 * como `<div className="empty">…</div>` em paginas de listagem.
 */
export function EmptyState({ variant = 'admin', children }: Props) {
  return (
    <div className={variant === 'customer' ? 'c-empty' : 'empty'}>
      {children}
    </div>
  );
}
