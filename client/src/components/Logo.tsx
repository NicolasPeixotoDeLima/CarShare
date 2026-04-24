import { useId } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  /** Adiciona glow amber atras do icone (header/hero). */
  glow?: boolean;
}

/**
 * CarShare brand mark.
 * Curva italic "C" + ponto fugitivo — lê como "C." e como roda em movimento.
 * Mesmo desenho do favicon.svg (manter sincronizados).
 */
export function Logo({ size = 32, className, glow = false }: LogoProps) {
  const id = useId();
  const gradId = `cs-grad-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CarShare"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 8px 20px oklch(0.82 0.14 75 / .35))' } : undefined}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F5C26B" />
          <stop offset="1" stopColor="#D9893B" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradId})`} />
      <path
        d="M21.5 10 A7 7 0 1 0 21.5 22"
        stroke="#1A1410"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="22" r="1.8" fill="#1A1410" />
    </svg>
  );
}
