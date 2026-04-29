interface Props {
  /** Indice (0-based) do primeiro item da pagina atual. */
  offset: number;
  /** Tamanho da pagina (qtde de items). */
  pageSize: number;
  /** Total de items na coleção. */
  total: number;
  /** Callback chamado quando o usuario muda a pagina. */
  onChange: (nextOffset: number) => void;
}

/**
 * Paginador "X-Y de Z · ← anterior · próxima →" usado nas tabelas de admin
 * e proprietario. Encapsula a logica de bounds e o markup que estava
 * duplicado em 6+ paginas.
 */
export function Pager({ offset, pageSize, total, onChange }: Props) {
  const start = total === 0 ? 0 : offset + 1;
  const end   = Math.min(offset + pageSize, total);
  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;

  return (
    <div className="pager">
      <span>{start}–{end} de {total}</span>
      <div className="pager__btns">
        <button
          className="btn btn--xs"
          disabled={!canPrev}
          onClick={() => onChange(Math.max(0, offset - pageSize))}
        >← anterior</button>
        <button
          className="btn btn--xs"
          disabled={!canNext}
          onClick={() => onChange(offset + pageSize)}
        >próxima →</button>
      </div>
    </div>
  );
}
