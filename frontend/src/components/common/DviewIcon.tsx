import React from 'react';

export type DviewIconName =
  | 'arrow-up-right'
  | 'arrow-right'
  | 'building-2'
  | 'star'
  | 'check'
  | 'shield-check'
  | 'bell-ring'
  | 'calendar'
  | 'trending-up'
  | 'calculator'
  | 'landmark'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-up'
  | 'scale'
  | 'book-open'
  | 'graduation-cap'
  | 'train-front'
  | 'alert-triangle'
  | 'map-pin'
  | 'layers'
  | 'help-circle'
  | 'bar-chart-3';

export const DVIEW_ICON_SYMBOL_ID: Readonly<Record<DviewIconName, string>> = {
  'arrow-up-right': 'di-aur',
  'arrow-right': 'di-ar',
  'building-2': 'di-b2',
  star: 'di-st',
  check: 'di-ck',
  'shield-check': 'di-sc',
  'bell-ring': 'di-br',
  calendar: 'di-cal',
  'trending-up': 'di-tu',
  calculator: 'di-calc',
  landmark: 'di-lm',
  'chevron-down': 'di-cd',
  'chevron-right': 'di-cr',
  'chevron-up': 'di-cu',
  scale: 'di-scl',
  'book-open': 'di-bo',
  'graduation-cap': 'di-gc',
  'train-front': 'di-tf',
  'alert-triangle': 'di-at',
  'map-pin': 'di-mp',
  layers: 'di-ly',
  'help-circle': 'di-hc',
  'bar-chart-3': 'di-bc3',
};

export interface DviewIconProps {
  name: DviewIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Lightweight Lucide SVG `<use>` icon component referencing the global `<DviewIconSprite />`
 * symbols mounted once in root `layout.tsx`.
 * Reduces repeated inline SVG path markup by ~75-85% across guide & apartment SSG pages.
 */
export function DviewIcon({ name, size = 16, strokeWidth, className }: DviewIconProps) {
  const customStrokeStyle =
    strokeWidth !== undefined && strokeWidth !== 2
      ? { strokeWidth: `${strokeWidth}px` }
      : undefined;
  return (
    <svg
      width={size}
      height={size}
      style={customStrokeStyle}
      className={className ? `d-ic ${className}` : 'd-ic'}
      aria-hidden="true"
    >
      <use href={`#${DVIEW_ICON_SYMBOL_ID[name]}`} />
    </svg>
  );
}

export default DviewIcon;
