import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './DatePicker.css';

interface Props {
  /** Valor ISO YYYY-MM-DD ou string vazia. */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Limite inferior em ISO YYYY-MM-DD (default: 1900-01-01). */
  min?: string;
  /** Limite superior em ISO YYYY-MM-DD (default: today + 5 anos). */
  max?: string;
  className?: string;
}

const MONTHS_PT_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_PT_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];
const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const YEARS_PER_PAGE = 12;

type Mode = 'days' | 'months' | 'years';

function pad(n: number) { return n < 10 ? '0' + n : '' + n; }

function parseISO(iso: string): { y: number; m: number; d: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function formatBR(iso: string) {
  const p = parseISO(iso);
  if (!p) return '';
  return `${pad(p.d)}/${pad(p.m + 1)}/${p.y}`;
}

function todayParts() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
}

/**
 * Picker de data 100% custom.
 *
 * Tem 3 modos no popover:
 *   - 'days'   : grid de calendario do mes corrente (default)
 *   - 'months' : grid 3x4 dos 12 meses do ano selecionado
 *   - 'years'  : grid paginado de anos (12 por pagina) com setas pra navegar
 *
 * O popover é renderizado via portal em document.body, com posicao calculada
 * apos o render (useLayoutEffect + offsetHeight) — garante que nunca fique
 * cortado por containers com overflow:hidden ou pelas bordas do viewport.
 */
export function DatePicker({
  value, onChange, placeholder = 'Selecionar data', disabled, min, max, className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('days');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const today = todayParts();
  const initial = parseISO(value) ?? today;
  const [view, setView] = useState({ y: initial.y, m: initial.m });
  const [yearPage, setYearPage] = useState(0);

  const minP = parseISO(min || '1900-01-01')!;
  const maxP = parseISO(max || toISO(today.y + 5, 11, 31))!;

  // Sincroniza view com value externo
  useEffect(() => {
    const p = parseISO(value);
    if (p) setView({ y: p.y, m: p.m });
  }, [value]);

  // Reseta para 'days' ao fechar
  useEffect(() => { if (!open) setMode('days'); }, [open]);

  // Quando entra em 'years', centraliza a pagina no ano corrente
  useEffect(() => {
    if (mode === 'years') {
      const offset = view.y - minP.y;
      setYearPage(Math.max(0, Math.floor(offset / YEARS_PER_PAGE)));
    }
  }, [mode, view.y, minP.y]);

  // Posiciona popover apos render real (mede altura)
  const reposition = useCallback(() => {
    if (!triggerRef.current || !popRef.current) return;
    const trig = triggerRef.current.getBoundingClientRect();
    const popH = popRef.current.offsetHeight;
    const popW = popRef.current.offsetWidth;
    const margin = 6;
    const pad = 8;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Vertical
    let top: number;
    const spaceBelow = vh - trig.bottom - pad;
    const spaceAbove = trig.top - pad;
    if (spaceBelow >= popH + margin) {
      top = trig.bottom + margin;
    } else if (spaceAbove >= popH + margin) {
      top = trig.top - margin - popH;
    } else {
      // Nao cabe nem em cima nem embaixo — ancora no topo do viewport
      top = Math.max(pad, vh - popH - pad);
    }

    // Horizontal — alinha pela esquerda do trigger, clamp pra viewport
    let left = trig.left;
    if (left + popW > vw - pad) left = vw - popW - pad;
    if (left < pad) left = pad;

    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, mode, yearPage, view.y, view.m, reposition]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  // Grid de dias (42 celulas)
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startWeekDay = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const prevDays = new Date(view.y, view.m, 0).getDate();

    const out: Array<{ y: number; m: number; d: number; outside: boolean }> = [];
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      const m = view.m === 0 ? 11 : view.m - 1;
      const y = view.m === 0 ? view.y - 1 : view.y;
      out.push({ y, m, d, outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ y: view.y, m: view.m, d, outside: false });
    }
    let nextD = 1;
    while (out.length < 42) {
      const m = view.m === 11 ? 0 : view.m + 1;
      const y = view.m === 11 ? view.y + 1 : view.y;
      out.push({ y, m, d: nextD++, outside: true });
    }
    return out;
  }, [view.y, view.m]);

  const yearGrid = useMemo(() => {
    const start = minP.y + yearPage * YEARS_PER_PAGE;
    return Array.from({ length: YEARS_PER_PAGE }, (_, i) => start + i)
      .filter(y => y <= maxP.y);
  }, [yearPage, minP.y, maxP.y]);

  const yearPageMax = Math.floor((maxP.y - minP.y) / YEARS_PER_PAGE);

  function compareDate(y: number, m: number, d: number) {
    return y * 10000 + m * 100 + d;
  }
  const minVal = compareDate(minP.y, minP.m, minP.d);
  const maxVal = compareDate(maxP.y, maxP.m, maxP.d);

  function isDayDisabled(y: number, m: number, d: number) {
    const v = compareDate(y, m, d);
    return v < minVal || v > maxVal;
  }
  function isMonthDisabled(y: number, m: number) {
    const last = new Date(y, m + 1, 0).getDate();
    const monthMin = compareDate(y, m, 1);
    const monthMax = compareDate(y, m, last);
    return monthMax < minVal || monthMin > maxVal;
  }
  function isYearDisabled(y: number) {
    return y < minP.y || y > maxP.y;
  }

  function pickDay(y: number, m: number, d: number) {
    if (isDayDisabled(y, m, d)) return;
    onChange(toISO(y, m, d));
    setOpen(false);
    triggerRef.current?.focus();
  }
  function pickMonth(m: number) {
    setView(s => ({ ...s, m }));
    setMode('days');
  }
  function pickYear(y: number) {
    setView(s => ({ ...s, y }));
    setMode('months');
  }

  function shiftMonth(delta: number) {
    setView(v => {
      let m = v.m + delta;
      let y = v.y;
      while (m < 0) { m += 12; y -= 1; }
      while (m > 11) { m -= 12; y += 1; }
      return { y, m };
    });
  }

  function goToday() {
    setView({ y: today.y, m: today.m });
    pickDay(today.y, today.m, today.d);
  }

  function clear() {
    onChange('');
    setOpen(false);
  }

  const selected = parseISO(value);
  const displayed = value ? formatBR(value) : '';

  return (
    <div
      className={['dpk', open ? 'is-open' : '', disabled ? 'is-disabled' : '', className || ''].filter(Boolean).join(' ')}
      ref={wrapRef}
    >
      <button
        ref={triggerRef}
        type="button"
        className="dpk__trigger"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`dpk__value ${displayed ? '' : 'dpk__value--placeholder'}`}>
          {displayed || placeholder}
        </span>
        <span className="dpk__icon" aria-hidden>📅</span>
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="dpk__pop"
          role="dialog"
          aria-label="Selecionar data"
          style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
        >
          {/* ============ HEADER ============ */}
          <div className="dpk__head">
            {mode === 'days' && (
              <>
                <button type="button" className="dpk__nav" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">‹</button>
                <div className="dpk__head-center">
                  <button
                    type="button"
                    className="dpk__title"
                    onClick={() => setMode('months')}
                    aria-label="Selecionar mês"
                  >
                    {MONTHS_PT_LONG[view.m]}
                  </button>
                  <button
                    type="button"
                    className="dpk__title dpk__title--mono"
                    onClick={() => setMode('years')}
                    aria-label="Selecionar ano"
                  >
                    {view.y}
                  </button>
                </div>
                <button type="button" className="dpk__nav" onClick={() => shiftMonth(1)} aria-label="Próximo mês">›</button>
              </>
            )}
            {mode === 'months' && (
              <>
                <button type="button" className="dpk__nav" onClick={() => setView(s => ({ ...s, y: s.y - 1 }))} aria-label="Ano anterior">‹</button>
                <button
                  type="button"
                  className="dpk__title dpk__title--mono"
                  onClick={() => setMode('years')}
                >
                  {view.y}
                </button>
                <button type="button" className="dpk__nav" onClick={() => setView(s => ({ ...s, y: s.y + 1 }))} aria-label="Próximo ano">›</button>
              </>
            )}
            {mode === 'years' && (
              <>
                <button
                  type="button"
                  className="dpk__nav"
                  onClick={() => setYearPage(p => Math.max(0, p - 1))}
                  disabled={yearPage === 0}
                  aria-label="Década anterior"
                >‹</button>
                <span className="dpk__title dpk__title--mono">
                  {yearGrid[0]}–{yearGrid[yearGrid.length - 1]}
                </span>
                <button
                  type="button"
                  className="dpk__nav"
                  onClick={() => setYearPage(p => Math.min(yearPageMax, p + 1))}
                  disabled={yearPage >= yearPageMax}
                  aria-label="Década seguinte"
                >›</button>
              </>
            )}
          </div>

          {/* ============ BODY POR MODO ============
            `key={mode}` força React a remontar o painel quando o modo muda,
            disparando a animação de entrada novamente. As células recebem
            `--i` (índice) pra um stagger leve no fade-in. */}
          <div key={mode} className={`dpk__panel dpk__panel--${mode}`}>
            {mode === 'days' && (
              <>
                <div className="dpk__week">
                  {WEEKDAYS_PT.map(d => <div key={d} className="dpk__wd">{d}</div>)}
                </div>
                <div className="dpk__grid dpk__grid--days">
                  {cells.map((c, i) => {
                    const isSel = selected && selected.y === c.y && selected.m === c.m && selected.d === c.d;
                    const isToday = today.y === c.y && today.m === c.m && today.d === c.d;
                    const dis = isDayDisabled(c.y, c.m, c.d);
                    return (
                      <button
                        key={i}
                        type="button"
                        style={{ ['--i' as never]: i }}
                        className={[
                          'dpk__cell',
                          c.outside ? 'is-outside' : '',
                          isSel ? 'is-selected' : '',
                          isToday ? 'is-today' : '',
                          dis ? 'is-disabled' : '',
                        ].filter(Boolean).join(' ')}
                        disabled={dis}
                        onClick={() => pickDay(c.y, c.m, c.d)}
                      >
                        {c.d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {mode === 'months' && (
              <div className="dpk__grid dpk__grid--months">
                {MONTHS_PT_SHORT.map((m, i) => {
                  const isSel = view.m === i;
                  const isCurrent = today.y === view.y && today.m === i;
                  const dis = isMonthDisabled(view.y, i);
                  return (
                    <button
                      key={i}
                      type="button"
                      style={{ ['--i' as never]: i }}
                      className={[
                        'dpk__cell',
                        'dpk__cell--lg',
                        isSel ? 'is-selected' : '',
                        isCurrent ? 'is-today' : '',
                        dis ? 'is-disabled' : '',
                      ].filter(Boolean).join(' ')}
                      disabled={dis}
                      onClick={() => pickMonth(i)}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}

            {mode === 'years' && (
              <div className="dpk__grid dpk__grid--years">
                {yearGrid.map((y, i) => {
                  const isSel = view.y === y;
                  const isCurrent = today.y === y;
                  const dis = isYearDisabled(y);
                  return (
                    <button
                      key={y}
                      type="button"
                      style={{ ['--i' as never]: i }}
                      className={[
                        'dpk__cell',
                        'dpk__cell--lg',
                        'dpk__cell--mono',
                        isSel ? 'is-selected' : '',
                        isCurrent ? 'is-today' : '',
                        dis ? 'is-disabled' : '',
                      ].filter(Boolean).join(' ')}
                      disabled={dis}
                      onClick={() => pickYear(y)}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============ FOOTER ============ */}
          <div className="dpk__foot">
            <button type="button" className="dpk__action" onClick={clear}>Limpar</button>
            <button type="button" className="dpk__action dpk__action--primary" onClick={goToday}>Hoje</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
