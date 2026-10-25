/**
 * DVIEW — Ad Money v5.0 Global Control & Toggle Design System Tokens
 *
 * Single Source of Truth (SSOT) for all segmented toggles, filter dropdowns,
 * inline search inputs, and quick filter pills across the production application.
 *
 * Geometry Invariant (Concentric Radius):
 * - Outer Track / Control Field Radius: 10px
 * - Track Padding: 3px
 * - Inner Toggle Button Radius: 7px (10px - 3px = 7px)
 */

export type ControlSize = 'sm' | 'md';
export type ToggleActiveTone = 'blue' | 'emerald' | 'neutral';

export const DVIEW_CONTROL_CLASSES = {
  track:
    'dview-toggle-track inline-flex items-center gap-0.5 p-[3px] rounded-[10px] bg-[#f2f4f6] dark:bg-[#202027] shrink-0 select-none',
  btnBase:
    'dview-toggle-btn inline-flex items-center justify-center gap-1.5 rounded-[7px] font-extrabold transition-all cursor-pointer whitespace-nowrap',
  btnSize: {
    sm: 'dview-toggle-btn-sm min-h-[26px] sm:min-h-[28px] px-2.5 sm:px-3 py-0.5 text-[11.5px] sm:text-[12px]',
    md: 'min-h-[28px] sm:min-h-[30px] px-3 sm:px-3.5 py-1 text-[12px] sm:text-[13px]',
  },
  btnActive: {
    blue: 'dview-toggle-btn-active bg-surface dark:bg-[#2c2c35] text-blue-600 dark:text-blue-400 shadow-xs font-black',
    emerald:
      'dview-toggle-btn-active-emerald bg-surface dark:bg-[#2c2c35] text-emerald-600 dark:text-emerald-400 shadow-xs font-black',
    neutral:
      'dview-toggle-btn-active-neutral bg-surface dark:bg-[#2c2c35] text-primary shadow-xs font-black',
  },
  btnInactive:
    'dview-toggle-btn-inactive bg-transparent text-secondary hover:text-primary',
  select:
    'dview-control-select h-[34px] sm:h-[36px] px-2.5 sm:px-3 rounded-[10px] bg-elevated hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] text-[12px] sm:text-[13px] font-extrabold text-secondary hover:text-primary transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-600/20',
  input:
    'dview-control-input h-[34px] sm:h-[36px] rounded-[10px] bg-elevated dark:bg-[#202027] text-[12px] sm:text-[13px] font-bold text-primary placeholder:text-tertiary transition-colors outline-none focus:bg-surface dark:focus:bg-[#2c2c35] focus:ring-2 focus:ring-blue-600/20',
  pill:
    'dview-control-pill h-[34px] sm:h-[36px] px-3 sm:px-3.5 rounded-[10px] bg-elevated hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] text-[12px] sm:text-[13px] font-extrabold text-secondary hover:text-primary inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0',
  pillActive:
    'dview-control-pill-active bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 hover:text-white shadow-xs',
} as const;

const DISPLAY_OVERRIDE_TOKEN_REGEX = /(?:^|\s)(?:(?:inline-)?grid|flex|block)(?:\s|$)/;

export function getToggleTrackClass(extraClass = ''): string {
  const trimmed = extraClass.trim();
  const base = DISPLAY_OVERRIDE_TOKEN_REGEX.test(trimmed)
    ? DVIEW_CONTROL_CLASSES.track.replace('inline-flex ', '')
    : DVIEW_CONTROL_CLASSES.track;
  return trimmed ? `${base} ${trimmed}` : base;
}

export interface ToggleBtnOptions {
  active?: boolean;
  size?: ControlSize;
  tone?: ToggleActiveTone;
  extraClass?: string;
}

export function getToggleBtnClass(
  optionsOrActive?: ToggleBtnOptions | boolean,
  secondOptions?: Omit<ToggleBtnOptions, 'active'>
): string {
  const resolved: ToggleBtnOptions =
    typeof optionsOrActive === 'boolean'
      ? { active: optionsOrActive, ...secondOptions }
      : optionsOrActive || {};
  const {
    active = false,
    size = 'md',
    tone = 'blue',
    extraClass = '',
  } = resolved;
  const sizeCls = DVIEW_CONTROL_CLASSES.btnSize[size];
  const stateCls = active
    ? DVIEW_CONTROL_CLASSES.btnActive[tone]
    : DVIEW_CONTROL_CLASSES.btnInactive;
  return [DVIEW_CONTROL_CLASSES.btnBase, sizeCls, stateCls, extraClass.trim()]
    .filter(Boolean)
    .join(' ');
}

export function getControlSelectClass(extraClass = ''): string {
  const trimmed = extraClass.trim();
  return trimmed
    ? `${DVIEW_CONTROL_CLASSES.select} ${trimmed}`
    : DVIEW_CONTROL_CLASSES.select;
}

export function getControlInputClass(extraClass = ''): string {
  const trimmed = extraClass.trim();
  return trimmed
    ? `${DVIEW_CONTROL_CLASSES.input} ${trimmed}`
    : DVIEW_CONTROL_CLASSES.input;
}

export function getControlPillClass(
  optionsOrActive?: { active?: boolean; extraClass?: string } | boolean,
  extraClassArg = ''
): string {
  const { active = false, extraClass = '' } =
    typeof optionsOrActive === 'boolean'
      ? { active: optionsOrActive, extraClass: extraClassArg }
      : optionsOrActive || {};
  return [
    DVIEW_CONTROL_CLASSES.pill,
    active ? DVIEW_CONTROL_CLASSES.pillActive : '',
    extraClass.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}
