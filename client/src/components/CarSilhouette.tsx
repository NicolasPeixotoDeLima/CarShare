import type { Category } from '../lib/types';

type Shape = 'suv' | 'sedan' | 'hatch';

const CATEGORY_SHAPE: Record<Category, Shape> = {
  suv: 'suv',
  pickup: 'suv',
  urbano: 'hatch',
  eletrico: 'hatch',
  seda: 'sedan',
  luxo: 'sedan',
};

const CATEGORY_COLOR: Record<Category, string> = {
  suv:      'oklch(0.75 0.02 260)',
  pickup:   'oklch(0.55 0.08 40)',
  urbano:   'oklch(0.62 0.16 25)',
  eletrico: 'oklch(0.60 0.15 155)',
  seda:     'oklch(0.70 0.02 260)',
  luxo:     'oklch(0.35 0.02 260)',
};

interface Props {
  category: Category;
  style?: React.CSSProperties;
  className?: string;
}

export function CarSilhouette({ category, style, className }: Props) {
  const shape = CATEGORY_SHAPE[category];
  const fill  = CATEGORY_COLOR[category];

  const common = (
    <>
      <ellipse cx="210" cy="142" rx="160" ry="7" fill="oklch(0 0 0 / .5)" />
    </>
  );

  if (shape === 'suv') {
    return (
      <svg viewBox="0 0 420 160" fill="none" style={style} className={className}>
        {common}
        <path d="M30 120 L45 85 Q60 55 110 50 L200 48 Q260 48 300 55 L360 62 Q388 68 395 90 L398 120 Z" fill={fill} stroke="oklch(1 0 0 / .2)" />
        <path d="M75 75 Q90 60 130 58 L195 56 Q245 56 275 62 L310 68 L310 86 L75 86 Z" fill="oklch(0.12 0.02 260)" />
        <path d="M145 58 L145 86 M200 56 L200 86" stroke="oklch(1 0 0 / .15)" />
        <circle cx="100" cy="128" r="22" fill="oklch(0.10 0 0)" />
        <circle cx="100" cy="128" r="12" fill="none" stroke="oklch(0.55 0.01 260)" strokeWidth="2" />
        <circle cx="320" cy="128" r="22" fill="oklch(0.10 0 0)" />
        <circle cx="320" cy="128" r="12" fill="none" stroke="oklch(0.55 0.01 260)" strokeWidth="2" />
      </svg>
    );
  }
  if (shape === 'hatch') {
    return (
      <svg viewBox="0 0 420 160" fill="none" style={style} className={className}>
        {common}
        <path d="M40 122 L55 88 Q75 60 130 56 L250 56 Q310 60 345 78 L385 110 L385 122 Z" fill={fill} stroke="oklch(1 0 0 / .2)" />
        <path d="M85 78 Q100 62 140 60 L245 60 Q290 64 315 76 L330 86 L85 86 Z" fill="oklch(0.12 0.02 260)" />
        <path d="M170 60 L170 86" stroke="oklch(1 0 0 / .15)" />
        <circle cx="105" cy="128" r="20" fill="oklch(0.10 0 0)" />
        <circle cx="105" cy="128" r="12" fill="none" stroke="oklch(0.55 0.01 260)" strokeWidth="2" />
        <circle cx="305" cy="128" r="20" fill="oklch(0.10 0 0)" />
        <circle cx="305" cy="128" r="12" fill="none" stroke="oklch(0.55 0.01 260)" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 420 160" fill="none" style={style} className={className}>
      {common}
      <path d="M30 122 L50 95 Q80 62 160 58 L260 58 Q320 60 365 85 L395 115 L395 122 Z" fill={fill} stroke="oklch(1 0 0 / .2)" />
      <path d="M95 85 Q115 64 165 62 L255 62 Q295 66 325 80 L340 90 L95 90 Z" fill="oklch(0.12 0.02 260)" />
      <path d="M210 62 L210 90" stroke="oklch(1 0 0 / .15)" />
      <circle cx="115" cy="128" r="20" fill="oklch(0.10 0 0)" />
      <circle cx="115" cy="128" r="12" fill="none" stroke="oklch(0.55 0.01 260)" strokeWidth="2" />
      <circle cx="315" cy="128" r="20" fill="oklch(0.10 0 0)" />
      <circle cx="315" cy="128" r="12" fill="none" stroke="oklch(0.55 0.01 260)" strokeWidth="2" />
    </svg>
  );
}
