import { useEffect, useRef, useState, useCallback, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import './Select.css';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface Props<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  /** 'md' (default) — usado em forms; 'sm' — usado em barras de filtro. */
  size?: 'md' | 'sm';
  className?: string;
  ariaLabel?: string;
}

/**
 * Dropdown customizado — substitui `<select>` nativo pra ter visual
 * consistente com o resto do projeto (amber/dark) em qualquer browser.
 *
 * O menu é renderizado via React portal em `document.body` pra evitar
 * recortes em containers com `overflow: hidden` (ex: `.panel` admin).
 *
 * Suporta teclado: Enter/Space abre, Esc fecha, ↑↓ navega entre opcoes,
 * Enter confirma. Click fora fecha. Acessivel via aria-* roles.
 */
export function Select<T extends string = string>({
  value, onChange, options, placeholder, disabled, size, className, ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const current = options.find(o => o.value === value);

  const updateRect = useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (!open) return;
    updateRect();
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll() { updateRect(); }
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', updateRect);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open, updateRect]);

  // sincroniza highlight com value quando abre
  useEffect(() => {
    if (open) {
      const idx = options.findIndex(o => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (e.key === 'ArrowDown') {
        setHighlight(h => Math.min(options.length - 1, h + 1));
      } else {
        commit(highlight);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); }
    } else if (e.key === 'Tab') {
      if (open) setOpen(false);
    }
  }

  // Posiciona o menu via portal, considerando espaco abaixo/acima
  function menuPosition() {
    if (!rect) return null;
    const margin = 6;
    const maxHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const flipUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    return {
      position: 'fixed' as const,
      top: flipUp ? Math.max(8, rect.top - margin - maxHeight) : rect.bottom + margin,
      left: rect.left,
      width: rect.width,
      maxHeight,
    };
  }

  return (
    <div
      className={[
        'csl',
        size === 'sm' ? 'csl--sm' : '',
        disabled ? 'is-disabled' : '',
        open ? 'is-open' : '',
        className || '',
      ].filter(Boolean).join(' ')}
      ref={wrapRef}
    >
      <button
        ref={triggerRef}
        type="button"
        className="csl__trigger"
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={handleKey}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={`csl__value ${current ? '' : 'csl__value--placeholder'}`}>
          {current?.label ?? placeholder ?? ''}
        </span>
        <span className="csl__caret" aria-hidden>▾</span>
      </button>

      {open && rect && createPortal(
        <ul
          ref={menuRef}
          className="csl__menu csl__menu--portal"
          role="listbox"
          style={menuPosition() ?? undefined}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={[
                'csl__opt',
                o.value === value ? 'is-on' : '',
                i === highlight ? 'is-hl' : '',
                o.disabled ? 'is-disabled' : '',
              ].filter(Boolean).join(' ')}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => commit(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
