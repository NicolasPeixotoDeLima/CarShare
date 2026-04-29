import type { ReactNode } from 'react';

interface Props {
  /** Inputs/selects do filtro (search, dropdowns, etc). */
  children: ReactNode;
  /** Texto de contagem opcional alinhado a direita (ex: "12 reservas"). */
  count?: ReactNode;
}

/**
 * Barra de filtros padrao de paginas de listagem. Empilha os inputs
 * recebidos como children e pinta a contagem `total` no canto direito.
 *
 * Usa a classe .filters de admin.css — o mesmo visual ja existente.
 */
export function FiltersBar({ children, count }: Props) {
  return (
    <div className="filters">
      {children}
      {count !== undefined && (
        <>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--fg-mute)', alignSelf: 'center' }}>
            {count}
          </span>
        </>
      )}
    </div>
  );
}
