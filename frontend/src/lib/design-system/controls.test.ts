import fs from 'fs';
import path from 'path';
import {
  DVIEW_CONTROL_CLASSES,
  getToggleTrackClass,
  getToggleBtnClass,
  getControlSelectClass,
  getControlInputClass,
  getControlPillClass,
} from './controls';

describe('Global Control & Toggle System SSOT (controls.ts & globals.css)', () => {
  describe('getToggleTrackClass', () => {
    it('returns inline-flex and concentric 10px track radius by default', () => {
      const cls = getToggleTrackClass();
      expect(cls).toContain(DVIEW_CONTROL_CLASSES.track);
      expect(cls).toContain('inline-flex');
      expect(cls).toContain('rounded-[10px]');
      expect(cls).toContain('p-[3px]');
    });

    it('omits base inline-flex when extraClass contains grid layout to prevent mobile grid collision', () => {
      const cls = getToggleTrackClass('grid grid-cols-2 sm:inline-flex w-full sm:w-auto');
      const tokens = cls.split(/\s+/);
      expect(tokens).not.toContain('inline-flex');
      expect(tokens).toContain('grid');
      expect(tokens).toContain('grid-cols-2');
      expect(tokens).toContain('sm:inline-flex');
    });

    it('retains inline-flex when extraClass contains a non-display class with the substring "grid"', () => {
      const cls = getToggleTrackClass('my-grid-item shrink-0');
      const tokens = cls.split(/\s+/);
      expect(tokens).toContain('inline-flex');
      expect(tokens).toContain('my-grid-item');
    });

    it('handles empty or whitespace-only extraClass cleanly', () => {
      expect(getToggleTrackClass('')).toBe(getToggleTrackClass());
      expect(getToggleTrackClass('   ')).toBe(getToggleTrackClass());
    });
  });

  describe('getToggleBtnClass', () => {
    it('returns concentric 7px inner radius, active blue state, and elevated dark thumb (#2c2c35) when active', () => {
      const clsObj = getToggleBtnClass({ active: true });
      const clsBool = getToggleBtnClass(true);
      expect(clsObj).toBe(clsBool);
      expect(clsObj).toContain(DVIEW_CONTROL_CLASSES.btnBase);
      expect(clsObj).toContain(DVIEW_CONTROL_CLASSES.btnActive.blue);
      expect(clsObj).toContain('rounded-[7px]');
      expect(clsObj).toContain('dark:bg-[#2c2c35]');
      expect(clsObj).toContain('text-blue-600');
      expect(clsObj).toContain('font-black');
    });

    it('returns inactive secondary text state when inactive', () => {
      const cls = getToggleBtnClass({ active: false });
      expect(cls).toContain(DVIEW_CONTROL_CLASSES.btnBase);
      expect(cls).toContain(DVIEW_CONTROL_CLASSES.btnInactive);
      expect(cls).not.toContain(DVIEW_CONTROL_CLASSES.btnActive.blue);
      expect(cls).toContain('text-secondary');
      expect(cls).toContain('font-extrabold');
    });

    it('supports emerald and neutral active tones with elevated dark thumb (#2c2c35)', () => {
      const emeraldCls = getToggleBtnClass({ active: true, tone: 'emerald' });
      expect(emeraldCls).toContain(DVIEW_CONTROL_CLASSES.btnActive.emerald);
      expect(emeraldCls).toContain('dark:bg-[#2c2c35]');
      expect(emeraldCls).toContain('text-emerald-600');

      const neutralCls = getToggleBtnClass({ active: true, tone: 'neutral' });
      expect(neutralCls).toContain(DVIEW_CONTROL_CLASSES.btnActive.neutral);
      expect(neutralCls).toContain('dark:bg-[#2c2c35]');
      expect(neutralCls).toContain('text-primary');
    });

    it('supports sm size variant for high-density 6-button timeframe controls', () => {
      const smCls = getToggleBtnClass({ active: true, size: 'sm', extraClass: 'tabular-nums' });
      expect(smCls).toContain(DVIEW_CONTROL_CLASSES.btnSize.sm);
      expect(smCls).toContain('min-h-[26px]');
      expect(smCls).toContain('tabular-nums');
    });
  });

  describe('getControlSelectClass, getControlInputClass, getControlPillClass', () => {
    it('returns unified 34px/36px height, 10px radius, and dark:bg-[#202027] surface for selects and inputs', () => {
      const selectCls = getControlSelectClass('pr-7');
      expect(selectCls).toContain(DVIEW_CONTROL_CLASSES.select);
      expect(selectCls).toContain('h-[34px]');
      expect(selectCls).toContain('rounded-[10px]');
      expect(selectCls).toContain('dark:bg-[#202027]');
      expect(selectCls).toContain('pr-7');

      const inputCls = getControlInputClass('pl-8 pr-8');
      expect(inputCls).toContain(DVIEW_CONTROL_CLASSES.input);
      expect(inputCls).toContain('h-[34px]');
      expect(inputCls).toContain('rounded-[10px]');
      expect(inputCls).toContain('dark:bg-[#202027]');
      expect(inputCls).toContain('pl-8');
    });

    it('returns active and inactive pill states accurately with unified dark surface', () => {
      const inactivePill = getControlPillClass(false);
      expect(inactivePill).toContain(DVIEW_CONTROL_CLASSES.pill);
      expect(inactivePill).toContain('dark:bg-[#202027]');
      expect(inactivePill).not.toContain(DVIEW_CONTROL_CLASSES.pillActive);

      const activePill = getControlPillClass(true, 'ml-auto');
      expect(activePill).toContain(DVIEW_CONTROL_CLASSES.pill);
      expect(activePill).toContain(DVIEW_CONTROL_CLASSES.pillActive);
      expect(activePill).toContain('bg-blue-600');
      expect(activePill).toContain('ml-auto');
    });
  });

  describe('globals.css Turbopack & Cascade Layer Contract', () => {
    const globalsCssPath = path.resolve(__dirname, '../../app/globals.css');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf-8');

    it('defines .dview-* rules inside @layer components without fragile @apply directives', () => {
      expect(cssContent).toContain('@layer components');
      expect(cssContent).toContain('.dview-toggle-track');
      expect(cssContent).toContain('.dview-toggle-btn');
      expect(cssContent).toContain('.dview-control-select');
      expect(cssContent).toContain('.dview-control-input');
      expect(cssContent).toContain('.dview-control-pill');
      expect(cssContent).not.toContain('@apply');
    });

    it('defines concentric radius and dark-mode elevated active thumb CSS variables', () => {
      expect(cssContent).toContain('--control-radius-track: 10px');
      expect(cssContent).toContain('--control-radius-item: 7px');
      expect(cssContent).toContain('--control-active-bg: #2c2c35');
      expect(cssContent).toContain('--control-surface-bg: #202027');
    });
  });
});
