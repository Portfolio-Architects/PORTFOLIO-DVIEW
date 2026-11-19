'use client';

import React from 'react';
import { DVIEW_ICON_SYMBOL_ID } from '@/components/common/DviewIcon';

/**
 * Global Lucide-compatible SVG `<symbol>` sprite sheet mounted once in root `layout.tsx`.
 * Uses exact Lucide v0.577.0 vector geometry so `<DviewIcon />` renders pixel-identically
 * to `lucide-react` while cutting 300+ duplicated inline SVGs down to compact `<use>` refs.
 * Marked `'use client'` so Next.js does not duplicate symbol `<path>` VDOM in `__next_f`.
 */
export default function DviewIconSprite() {
  return (
    <svg
      id="dview-icon-sprite"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <symbol id={DVIEW_ICON_SYMBOL_ID['arrow-up-right']} viewBox="0 0 24 24">
          <path d="M7 7h10v10" />
          <path d="M7 17 17 7" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['arrow-right']} viewBox="0 0 24 24">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['building-2']} viewBox="0 0 24 24">
          <path d="M10 12h4" />
          <path d="M10 8h4" />
          <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
          <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
          <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID.star} viewBox="0 0 24 24">
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID.check} viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['shield-check']} viewBox="0 0 24 24">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['bell-ring']} viewBox="0 0 24 24">
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M22 8c0-2.3-.8-4.3-2-6" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
          <path d="M4 2C2.8 3.7 2 5.7 2 8" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID.calendar} viewBox="0 0 24 24">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['trending-up']} viewBox="0 0 24 24">
          <path d="M16 7h6v6" />
          <path d="m22 7-8.5 8.5-5-5L2 17" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID.calculator} viewBox="0 0 24 24">
          <rect width="16" height="20" x="4" y="2" rx="2" />
          <line x1="8" x2="16" y1="6" y2="6" />
          <line x1="16" x2="16" y1="14" y2="18" />
          <path d="M16 10h.01" />
          <path d="M12 10h.01" />
          <path d="M8 10h.01" />
          <path d="M12 14h.01" />
          <path d="M8 14h.01" />
          <path d="M12 18h.01" />
          <path d="M8 18h.01" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID.landmark} viewBox="0 0 24 24">
          <path d="M10 18v-7" />
          <path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z" />
          <path d="M14 18v-7" />
          <path d="M18 18v-7" />
          <path d="M3 22h18" />
          <path d="M6 18v-7" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['chevron-down']} viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['chevron-right']} viewBox="0 0 24 24">
          <path d="m9 18 6-6-6-6" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['chevron-up']} viewBox="0 0 24 24">
          <path d="m18 15-6-6-6 6" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID.scale} viewBox="0 0 24 24">
          <path d="M12 3v18" />
          <path d="m19 8 3 8a5 5 0 0 1-6 0zV7" />
          <path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" />
          <path d="m5 8 3 8a5 5 0 0 1-6 0zV7" />
          <path d="M7 21h10" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['book-open']} viewBox="0 0 24 24">
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['graduation-cap']} viewBox="0 0 24 24">
          <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
          <path d="M22 10v6" />
          <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['train-front']} viewBox="0 0 24 24">
          <path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" />
          <path d="m9 15-1-1" />
          <path d="m15 15 1-1" />
          <path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" />
          <path d="m8 19-2 3" />
          <path d="m16 19 2 3" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['alert-triangle']} viewBox="0 0 24 24">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['map-pin']} viewBox="0 0 24 24">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID.layers} viewBox="0 0 24 24">
          <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
          <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
          <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['help-circle']} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </symbol>
        <symbol id={DVIEW_ICON_SYMBOL_ID['bar-chart-3']} viewBox="0 0 24 24">
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </symbol>
      </defs>
    </svg>
  );
}
