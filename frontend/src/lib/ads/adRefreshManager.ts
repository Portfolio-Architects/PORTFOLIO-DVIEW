/**
 * @module adRefreshManager
 * @description Deterministic Ad Refresh & Smart Viewability Engine enforcing 30s dwell time,
 * 50% viewport intersection ratio guards, document.hidden visibility freeze, and maxRefreshes <= 10
 * for Google AdSense / GPT ad units.
 * Architecture Layer: Library / Analytics & Ads
 */

import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const DWELL_TIME_THRESHOLD_MS = 30000;
export const MIN_INTERSECTION_RATIO = 0.50;
export const MAX_REFRESHES_PER_SLOT = 10;
export const VIEWABILITY_TICK_INTERVAL_MS = 1000;

export const SmartViewabilityConfigSchema = z.object({
  slotId: z.string().min(1),
  threshold: z.number().min(0.1).max(1.0).default(0.50),
  dwellThresholdMs: z.number().int().min(10000).default(30000),
  maxRefreshes: z.number().int().min(1).max(20).default(10),
  rootMargin: z.string().default('0px'),
});

export type SmartViewabilityConfig = z.infer<typeof SmartViewabilityConfigSchema>;

export interface ViewabilitySlotState {
  slotId: string;
  element: HTMLElement | WeakRef<HTMLElement>;
  isIntersecting: boolean;
  intersectionRatio: number;
  dwellTimeMs: number;
  lastVisibleTimestamp: number | null;
  refreshCount: number;
  isPushed: boolean;
  status: 'IDLE' | 'OBSERVING' | 'VIEWABLE' | 'REFRESHING' | 'PAUSED';
}

export interface SmartViewabilityObserver {
  observe(slotId: string, element: HTMLElement, onRefresh: () => void): void;
  unobserve(slotId: string): void;
  handleVisibilityChange(isHidden: boolean): void;
  getState(slotId: string): ViewabilitySlotState | undefined;
}

export interface ObserveSlotOptions extends Partial<SmartViewabilityConfig> {
  onInitialPush?: () => void;
  skipDefaultAdSensePush?: boolean;
}

export interface AdSlotRegistration {
  slotId: string;
  domElement?: HTMLElement | null;
  lastRefreshedAt?: number;
  intersectionRatio?: number;
  initialRatio?: number;
  maxRefreshes?: number;
  dwellThresholdMs?: number;
  threshold?: number;
  onRefreshKeyChange?: (nextKey: number) => void;
  onRefresh?: (refreshKey: number) => void;
  googletagSlot?: unknown;
}

export interface AdSlotState {
  slotId: string;
  lastRefreshedAt: number;
  intersectionRatio: number;
  refreshCount: number;
  maxRefreshes?: number;
  dwellThresholdMs?: number;
  threshold?: number;
  onRefresh?: (refreshKey: number) => void;
  onRefreshKeyChange?: (nextKey: number) => void;
  domElement?: HTMLElement | null;
  googletagSlot?: unknown;
}

export interface TabSwitchRefreshResult {
  refreshed: string[];
  skipped: string[];
  count: number;
  valueOf(): number;
}

interface InternalViewabilityEntry {
  config: SmartViewabilityConfig;
  state: ViewabilitySlotState;
  observer: IntersectionObserver | null;
  onRefresh: (() => void) | null;
  onInitialPush: (() => void) | null;
  skipDefaultAdSensePush: boolean;
}

function derefElement(el: HTMLElement | WeakRef<HTMLElement> | null | undefined): HTMLElement | null {
  if (!el) return null;
  if (typeof WeakRef !== 'undefined' && el instanceof WeakRef) {
    return el.deref() ?? null;
  }
  return el as HTMLElement;
}

function executeDefaultAdSensePush(element: HTMLElement | null): void {
  if (typeof window === 'undefined') return;
  try {
    const insEl =
      element?.tagName?.toLowerCase() === 'ins'
        ? element
        : element?.querySelector?.('ins.adsbygoogle') ?? element;
    if (insEl && insEl.getAttribute?.('data-adsbygoogle-status')) {
      return;
    }
    const win = window as unknown as {
      adsbygoogle?: Array<Record<string, unknown>> | { push?: (...args: unknown[]) => void };
    };
    if (Array.isArray(win.adsbygoogle)) {
      win.adsbygoogle.push({});
    } else if (win.adsbygoogle && typeof win.adsbygoogle.push === 'function') {
      win.adsbygoogle.push({});
    } else {
      win.adsbygoogle = [{}];
    }
  } catch (err) {
    logger.warn('AdSlot', 'AdSense push warning', undefined, err as Error);
  }
}

export class AdRefreshManager implements SmartViewabilityObserver {
  private readonly slots: Map<string, AdSlotState> = new Map();
  private readonly viewabilitySlots: Map<string, InternalViewabilityEntry> = new Map();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private isHiddenState: boolean = false;
  private hiddenAtTimestamp: number | null = null;
  private visibilityListenerBound: boolean = false;

  private readonly onDocumentVisibilityChange = (): void => {
    if (typeof document !== 'undefined') {
      this.handleVisibilityChange(Boolean(document.hidden));
    }
  };

  private isDocumentHidden(): boolean {
    if (this.isHiddenState) return true;
    if (typeof document !== 'undefined' && document.hidden === true) {
      return true;
    }
    return false;
  }

  private ensureVisibilityListener(): void {
    if (this.visibilityListenerBound || typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', this.onDocumentVisibilityChange);
    this.visibilityListenerBound = true;
  }

  private removeVisibilityListener(): void {
    if (!this.visibilityListenerBound || typeof document === 'undefined') return;
    document.removeEventListener('visibilitychange', this.onDocumentVisibilityChange);
    this.visibilityListenerBound = false;
  }

  private hasActiveViewabilitySlots(): boolean {
    for (const entry of this.viewabilitySlots.values()) {
      if (entry.state.status !== 'IDLE') {
        return true;
      }
    }
    return false;
  }

  private startTickTimer(): void {
    if (this.tickTimer !== null || this.isDocumentHidden()) return;
    if (!this.hasActiveViewabilitySlots()) return;
    this.tickTimer = setInterval(() => {
      this.tick(Date.now());
    }, VIEWABILITY_TICK_INTERVAL_MS);
  }

  private stopTickTimer(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /**
   * SmartViewabilityObserver.observe:
   * Transitions f(IDLE, MOUNT) -> OBSERVING (or PAUSED if document.hidden)
   * Enforces ratio >= threshold (0.50) gate prior to initial push,
   * 30s dwell time refresh, and maxRefreshes <= 10 cap.
   */
  public observe(
    slotId: string,
    element: HTMLElement,
    onRefresh: () => void,
    options?: ObserveSlotOptions
  ): void {
    const cleanSlotId = typeof slotId === 'string' ? slotId.trim() : '';
    if (!cleanSlotId || !element) {
      return;
    }

    let parsed = SmartViewabilityConfigSchema.safeParse({
      slotId: cleanSlotId,
      threshold: options?.threshold,
      dwellThresholdMs: options?.dwellThresholdMs,
      maxRefreshes: options?.maxRefreshes,
      rootMargin: options?.rootMargin,
    });

    if (!parsed.success) {
      // Deterministic clamping recovery invariant for out-of-range numeric options
      const clampedThreshold =
        typeof options?.threshold === 'number' && Number.isFinite(options.threshold)
          ? Math.max(0.1, Math.min(1.0, options.threshold))
          : MIN_INTERSECTION_RATIO;
      const clampedDwell =
        typeof options?.dwellThresholdMs === 'number' && Number.isFinite(options.dwellThresholdMs)
          ? Math.max(10000, Math.round(options.dwellThresholdMs))
          : DWELL_TIME_THRESHOLD_MS;
      const clampedMaxRefreshes =
        typeof options?.maxRefreshes === 'number' && Number.isFinite(options.maxRefreshes)
          ? Math.max(1, Math.min(20, Math.round(options.maxRefreshes)))
          : MAX_REFRESHES_PER_SLOT;
      const safeRootMargin =
        typeof options?.rootMargin === 'string' && options.rootMargin.length > 0
          ? options.rootMargin
          : '0px';

      parsed = SmartViewabilityConfigSchema.safeParse({
        slotId: cleanSlotId,
        threshold: clampedThreshold,
        dwellThresholdMs: clampedDwell,
        maxRefreshes: clampedMaxRefreshes,
        rootMargin: safeRootMargin,
      });

      if (!parsed.success) {
        return;
      }
    }

    const config = parsed.data;

    // Clean up any pre-existing observer for this slotId
    const existing = this.viewabilitySlots.get(config.slotId);
    if (existing?.observer) {
      try {
        existing.observer.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      existing.observer = null;
    }

    const hiddenNow = this.isDocumentHidden();
    if (hiddenNow && !this.isHiddenState) {
      this.isHiddenState = true;
      if (this.hiddenAtTimestamp === null) {
        this.hiddenAtTimestamp = Date.now();
      }
    }

    const wrappedElement: HTMLElement | WeakRef<HTMLElement> =
      typeof WeakRef !== 'undefined' ? new WeakRef(element) : element;

    const existingSameElement =
      existing && derefElement(existing.state.element) === element;

    const initialState: ViewabilitySlotState = {
      slotId: config.slotId,
      element: wrappedElement,
      isIntersecting: existingSameElement ? existing.state.isIntersecting : false,
      intersectionRatio: existingSameElement ? existing.state.intersectionRatio : 0,
      dwellTimeMs: existingSameElement ? existing.state.dwellTimeMs : 0,
      lastVisibleTimestamp:
        existingSameElement && !hiddenNow ? existing.state.lastVisibleTimestamp : null,
      refreshCount: existingSameElement ? existing.state.refreshCount : 0,
      isPushed: existingSameElement ? existing.state.isPushed : false,
      status: hiddenNow
        ? 'PAUSED'
        : existingSameElement && existing.state.status === 'VIEWABLE'
        ? 'VIEWABLE'
        : 'OBSERVING',
    };

    let io: IntersectionObserver | null = null;
    if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function') {
      try {
        const thresholds = Array.from(new Set([0, config.threshold, 1.0])).sort((a, b) => a - b);
        const createdObserver = new window.IntersectionObserver(
          (entries: IntersectionObserverEntry[]) => {
            const activeEntry = this.viewabilitySlots.get(config.slotId);
            if (!activeEntry || activeEntry.observer !== createdObserver) return;
            if (!Array.isArray(entries) || entries.length === 0) return;
            for (const entry of entries) {
              if (!entry) continue;
              const rawRatio =
                typeof entry.intersectionRatio === 'number'
                  ? entry.intersectionRatio
                  : entry.isIntersecting
                  ? 1.0
                  : 0;
              this.handleSlotIntersection(
                config.slotId,
                rawRatio,
                entry.isIntersecting,
                Date.now()
              );
            }
          },
          {
            rootMargin: config.rootMargin,
            threshold: thresholds,
          }
        );
        io = createdObserver;
        io.observe(element);
      } catch (err) {
        logger.warn('AdRefreshManager', `IntersectionObserver init failed for ${config.slotId}`, undefined, err as Error);
      }
    }

    const entryRecord: InternalViewabilityEntry = {
      config,
      state: initialState,
      observer: io,
      onRefresh,
      onInitialPush: options?.onInitialPush ?? null,
      skipDefaultAdSensePush: Boolean(options?.skipDefaultAdSensePush),
    };

    // Maintain bounded map size by pruning oldest IDLE entries if needed
    if (this.viewabilitySlots.size >= 200) {
      for (const [k, v] of this.viewabilitySlots.entries()) {
        if (v.state.status === 'IDLE') {
          this.viewabilitySlots.delete(k);
          if (this.viewabilitySlots.size < 150) break;
        }
      }
    }

    this.viewabilitySlots.set(config.slotId, entryRecord);
    this.ensureVisibilityListener();

    if (!hiddenNow) {
      this.startTickTimer();
    }
  }

  /**
   * SmartViewabilityObserver.unobserve:
   * Transitions f(*, UNMOUNT) -> IDLE, disconnects observer, and releases strong references.
   */
  public unobserve(slotId: string, targetElement?: HTMLElement | null): void {
    if (!slotId || typeof slotId !== 'string') return;
    const entry = this.viewabilitySlots.get(slotId);
    if (!entry) return;

    if (targetElement) {
      const currentEl = derefElement(entry.state.element);
      if (currentEl && currentEl !== targetElement) {
        return;
      }
    }

    if (entry.observer) {
      try {
        const currentEl = derefElement(entry.state.element);
        if (currentEl && typeof entry.observer.unobserve === 'function') {
          entry.observer.unobserve(currentEl);
        }
        entry.observer.disconnect();
      } catch {
        // Ignore observer teardown exceptions
      }
      entry.observer = null;
    }

    entry.onRefresh = null;
    entry.onInitialPush = null;
    entry.state.status = 'IDLE';
    entry.state.isIntersecting = false;
    entry.state.intersectionRatio = 0;
    entry.state.dwellTimeMs = 0;
    entry.state.lastVisibleTimestamp = null;

    if (!this.hasActiveViewabilitySlots()) {
      this.stopTickTimer();
    }
  }

  /**
   * SmartViewabilityObserver.handleVisibilityChange:
   * Transitions:
   * - f(OBSERVING, TAB_HIDDEN) = PAUSED
   * - f(VIEWABLE, TAB_HIDDEN) = PAUSED (freezes dwell timer)
   * - f(PAUSED, TAB_VISIBLE) = VIEWABLE (if ratio >= 0.50) | OBSERVING (if ratio < 0.50)
   */
  public handleVisibilityChange(isHidden: boolean, now: number = Date.now()): void {
    const nextHidden = Boolean(isHidden);

    if (nextHidden) {
      if (!this.isHiddenState && this.hiddenAtTimestamp === null) {
        this.hiddenAtTimestamp = now;
      }
      this.isHiddenState = true;
      this.stopTickTimer();

      for (const entry of this.viewabilitySlots.values()) {
        if (entry.state.status === 'IDLE') continue;
        if (entry.state.status === 'VIEWABLE' && entry.state.lastVisibleTimestamp !== null) {
          entry.state.dwellTimeMs += Math.max(0, now - entry.state.lastVisibleTimestamp);
        }
        entry.state.lastVisibleTimestamp = null;
        entry.state.status = 'PAUSED';
      }
    } else {
      if (this.hiddenAtTimestamp !== null) {
        const hiddenStart = this.hiddenAtTimestamp;
        this.hiddenAtTimestamp = null;
        for (const slot of this.slots.values()) {
          const effectiveHiddenStart = Math.max(slot.lastRefreshedAt, hiddenStart);
          const slotHiddenDuration = Math.max(0, now - effectiveHiddenStart);
          slot.lastRefreshedAt += slotHiddenDuration;
        }
      }
      this.isHiddenState = false;

      for (const entry of this.viewabilitySlots.values()) {
        if (entry.state.status === 'IDLE') continue;
        const meetsRatio = entry.state.intersectionRatio >= entry.config.threshold;
        if (meetsRatio) {
          entry.state.status = 'VIEWABLE';
          entry.state.isIntersecting = true;
          entry.state.lastVisibleTimestamp = now;
          if (!entry.state.isPushed) {
            entry.state.isPushed = true;
            this.invokeInitialPush(entry);
          }
        } else {
          entry.state.status = 'OBSERVING';
          entry.state.isIntersecting = false;
          entry.state.lastVisibleTimestamp = null;
        }
      }

      if (this.hasActiveViewabilitySlots()) {
        this.startTickTimer();
      }
    }
  }

  /**
   * SmartViewabilityObserver.getState:
   * Returns current snapshot of ViewabilitySlotState for slotId.
   */
  public getState(slotId: string): ViewabilitySlotState | undefined {
    if (!slotId || typeof slotId !== 'string') return undefined;
    const entry = this.viewabilitySlots.get(slotId);
    if (!entry) return undefined;

    this.syncSlotDwell(entry, Date.now());
    return { ...entry.state };
  }

  /**
   * Synchronizes external refresh (e.g., via refreshKey prop transition) with viewability & legacy state,
   * resetting dwellTimeMs to 0 and enforcing viewability, 30s dwell time, and maxRefreshes <= 10 session cap.
   */
  public recordExternalRefresh(
    slotId: string,
    now: number = Date.now(),
    targetRefreshCount?: number
  ): boolean {
    if (!slotId || typeof slotId !== 'string') return false;
    if (this.isDocumentHidden()) return false;

    const entry = this.viewabilitySlots.get(slotId);
    const legacySlot = this.slots.get(slotId);

    const maxRefreshes =
      entry?.config.maxRefreshes ?? legacySlot?.maxRefreshes ?? MAX_REFRESHES_PER_SLOT;
    const currentRefreshCount = Math.max(
      entry?.state.refreshCount ?? 0,
      legacySlot?.refreshCount ?? 0
    );

    if (typeof targetRefreshCount === 'number' && Number.isFinite(targetRefreshCount)) {
      if (targetRefreshCount > maxRefreshes) {
        return false;
      }
      if (currentRefreshCount >= targetRefreshCount && targetRefreshCount > 0) {
        if (entry && entry.state.status !== 'IDLE') {
          entry.state.dwellTimeMs = 0;
          entry.state.lastVisibleTimestamp =
            entry.state.status === 'VIEWABLE' && !this.isDocumentHidden() ? now : null;
        }
        return true;
      }
    }

    if (currentRefreshCount >= maxRefreshes) {
      return false;
    }

    if (entry && entry.state.status !== 'IDLE') {
      if (entry.state.status !== 'VIEWABLE') {
        return false;
      }
      const pendingElapsed =
        entry.state.intersectionRatio >= entry.config.threshold &&
        entry.state.lastVisibleTimestamp !== null
          ? Math.max(0, now - entry.state.lastVisibleTimestamp)
          : 0;
      const effectiveDwellMs = entry.state.dwellTimeMs + pendingElapsed;
      if (
        effectiveDwellMs < entry.config.dwellThresholdMs ||
        entry.state.intersectionRatio < entry.config.threshold
      ) {
        return false;
      }
    } else if (legacySlot) {
      const elapsedMs = now - legacySlot.lastRefreshedAt;
      const dwellThreshold = legacySlot.dwellThresholdMs ?? DWELL_TIME_THRESHOLD_MS;
      const ratioThreshold = legacySlot.threshold ?? MIN_INTERSECTION_RATIO;
      if (elapsedMs < dwellThreshold || legacySlot.intersectionRatio < ratioThreshold) {
        return false;
      }
    }

    const nextCount = currentRefreshCount + 1;

    if (entry && entry.state.status !== 'IDLE') {
      entry.state.refreshCount = nextCount;
      entry.state.dwellTimeMs = 0;
      entry.state.lastVisibleTimestamp =
        entry.state.status === 'VIEWABLE' && !this.isDocumentHidden() ? now : null;
    }

    if (legacySlot) {
      legacySlot.refreshCount = nextCount;
      legacySlot.lastRefreshedAt = now;
    }

    return true;
  }

  private invokeInitialPush(entry: InternalViewabilityEntry): void {
    if (entry.onInitialPush) {
      try {
        entry.onInitialPush();
      } catch (err) {
        logger.warn('AdRefreshManager', `onInitialPush callback error for ${entry.config.slotId}`, undefined, err as Error);
      }
      return;
    }

    if (!entry.skipDefaultAdSensePush) {
      const targetEl = derefElement(entry.state.element);
      executeDefaultAdSensePush(targetEl);
    }
  }

  private handleSlotIntersection(
    slotId: string,
    rawRatio: number,
    isIntersectingFlag?: boolean,
    now: number = Date.now()
  ): void {
    const entry = this.viewabilitySlots.get(slotId);
    if (!entry || entry.state.status === 'IDLE') return;

    const finiteRatio = Number.isFinite(rawRatio) ? Math.max(0, Math.min(1, rawRatio)) : 0;
    const clampedRatio =
      isIntersectingFlag === false && finiteRatio >= entry.config.threshold ? 0 : finiteRatio;
    const ratioGeThreshold =
      clampedRatio >= entry.config.threshold && isIntersectingFlag !== false;

    entry.state.intersectionRatio = clampedRatio;
    entry.state.isIntersecting = ratioGeThreshold;

    // Also synchronize with AdRefreshManager slot state if registered
    const legacySlot = this.slots.get(slotId);
    if (legacySlot) {
      legacySlot.intersectionRatio = clampedRatio;
    }

    // If tab is currently hidden / PAUSED: record ratio change but keep status PAUSED
    if (this.isDocumentHidden() || entry.state.status === 'PAUSED') {
      entry.state.status = 'PAUSED';
      entry.state.lastVisibleTimestamp = null;
      return;
    }

    if (ratioGeThreshold) {
      // f(OBSERVING, RATIO_GE_50) = VIEWABLE
      if (entry.state.status !== 'VIEWABLE') {
        entry.state.status = 'VIEWABLE';
        entry.state.lastVisibleTimestamp = now;
      } else if (entry.state.lastVisibleTimestamp === null) {
        entry.state.lastVisibleTimestamp = now;
      }

      if (!entry.state.isPushed) {
        entry.state.isPushed = true;
        this.invokeInitialPush(entry);
      }
    } else {
      // f(VIEWABLE, RATIO_LT_50) = OBSERVING (pause dwell timer accumulation)
      if (entry.state.status === 'VIEWABLE' && entry.state.lastVisibleTimestamp !== null) {
        entry.state.dwellTimeMs += Math.max(0, now - entry.state.lastVisibleTimestamp);
      }
      entry.state.lastVisibleTimestamp = null;
      entry.state.status = 'OBSERVING';
    }
  }

  private syncSlotDwell(entry: InternalViewabilityEntry, now: number): void {
    if (entry.state.status === 'IDLE' || entry.state.status === 'PAUSED') return;

    if (this.isDocumentHidden()) {
      this.handleVisibilityChange(true, now);
      return;
    }

    const currentEl = derefElement(entry.state.element);
    if (typeof WeakRef !== 'undefined' && entry.state.element instanceof WeakRef && !currentEl) {
      this.unobserve(entry.config.slotId);
      return;
    }

    if (
      entry.state.status === 'VIEWABLE' &&
      entry.state.intersectionRatio >= entry.config.threshold
    ) {
      if (entry.state.lastVisibleTimestamp !== null) {
        const elapsed = now - entry.state.lastVisibleTimestamp;
        if (elapsed > 0) {
          entry.state.dwellTimeMs += elapsed;
          entry.state.lastVisibleTimestamp = now;
        } else if (elapsed < 0) {
          // Guard against negative clock skew
          entry.state.lastVisibleTimestamp = now;
        }
      } else {
        entry.state.lastVisibleTimestamp = now;
      }

      if (entry.state.dwellTimeMs >= entry.config.dwellThresholdMs) {
        if (entry.state.refreshCount < entry.config.maxRefreshes) {
          // f(VIEWABLE, DWELL_30S) = REFRESHING -> VIEWABLE
          entry.state.status = 'REFRESHING';
          entry.state.refreshCount += 1;
          entry.state.dwellTimeMs = 0;
          entry.state.lastVisibleTimestamp = now;

          const legacySlot = this.slots.get(entry.config.slotId);
          if (legacySlot) {
            legacySlot.lastRefreshedAt = now;
            legacySlot.refreshCount = entry.state.refreshCount;
            try {
              if (typeof legacySlot.onRefresh === 'function') {
                legacySlot.onRefresh(entry.state.refreshCount);
              }
              if (typeof legacySlot.onRefreshKeyChange === 'function') {
                legacySlot.onRefreshKeyChange(entry.state.refreshCount);
              }
            } catch (err) {
              logger.warn(
                'AdRefreshManager',
                `Legacy onRefreshKeyChange error for slot ${entry.config.slotId}`,
                undefined,
                err as Error
              );
            }
          }

          if (typeof entry.onRefresh === 'function') {
            try {
              entry.onRefresh();
            } catch (err) {
              logger.warn(
                'AdRefreshManager',
                `Viewability onRefresh error for slot ${entry.config.slotId}`,
                undefined,
                err as Error
              );
            }
          }

          entry.state.status = 'VIEWABLE';
        } else {
          // Cap dwellTimeMs at threshold once maxRefreshes is reached
          entry.state.dwellTimeMs = entry.config.dwellThresholdMs;
          entry.state.lastVisibleTimestamp = now;
        }
      }
    }
  }

  /**
   * Executes 1-second periodic evaluation across all active observed slots: O(K) where K <= 8.
   */
  public tick(now: number = Date.now()): void {
    if (this.isDocumentHidden()) {
      if (!this.isHiddenState) {
        this.handleVisibilityChange(true, now);
      }
      return;
    }

    for (const entry of this.viewabilitySlots.values()) {
      this.syncSlotDwell(entry, now);
    }
  }

  /**
   * Registers an ad slot with initial state.
   * Default lastRefreshedAt is initialized to Date.now(),
   * enforcing the 30s dwell time guard before any subsequent refresh.
   */
  public registerSlot(
    slotId: string,
    optionsOrRatio?: number | Partial<AdSlotRegistration>,
    onRefreshCallback?: (key: number) => void
  ): void {
    if (!slotId || typeof slotId !== 'string') return;

    if (this.isDocumentHidden() && !this.isHiddenState) {
      this.isHiddenState = true;
      if (this.hiddenAtTimestamp === null) {
        this.hiddenAtTimestamp = Date.now();
      }
    }

    let initialRatio = 0;
    let explicitRatioProvided = false;
    let onRefresh: ((key: number) => void) | undefined = onRefreshCallback;
    let onRefreshKeyChange: ((nextKey: number) => void) | undefined = undefined;
    let domElement: HTMLElement | null = null;
    let googletagSlot: unknown = undefined;
    let lastRefreshedAt = Date.now();
    let maxRefreshes = MAX_REFRESHES_PER_SLOT;
    let dwellThresholdMs = DWELL_TIME_THRESHOLD_MS;
    let threshold = MIN_INTERSECTION_RATIO;

    if (typeof optionsOrRatio === 'number') {
      explicitRatioProvided = true;
      initialRatio = Number.isFinite(optionsOrRatio) ? Math.max(0, Math.min(1, optionsOrRatio)) : 0;
    } else if (typeof optionsOrRatio === 'object' && optionsOrRatio !== null) {
      const rawRatio = optionsOrRatio.intersectionRatio ?? optionsOrRatio.initialRatio;
      if (typeof rawRatio === 'number' && Number.isFinite(rawRatio)) {
        explicitRatioProvided = rawRatio > 0;
        initialRatio = Math.max(0, Math.min(1, rawRatio));
      }
      if (typeof optionsOrRatio.onRefresh === 'function') {
        onRefresh = optionsOrRatio.onRefresh;
      }
      if (typeof optionsOrRatio.onRefreshKeyChange === 'function') {
        onRefreshKeyChange = optionsOrRatio.onRefreshKeyChange;
      }
      if (optionsOrRatio.domElement !== undefined) {
        domElement = optionsOrRatio.domElement;
      }
      if (optionsOrRatio.googletagSlot !== undefined) {
        googletagSlot = optionsOrRatio.googletagSlot;
      }
      if (typeof optionsOrRatio.lastRefreshedAt === 'number') {
        lastRefreshedAt = optionsOrRatio.lastRefreshedAt;
      }
      if (typeof optionsOrRatio.maxRefreshes === 'number' && optionsOrRatio.maxRefreshes > 0) {
        maxRefreshes = optionsOrRatio.maxRefreshes;
      }
      if (typeof optionsOrRatio.dwellThresholdMs === 'number' && optionsOrRatio.dwellThresholdMs >= 10000) {
        dwellThresholdMs = optionsOrRatio.dwellThresholdMs;
      }
      if (typeof optionsOrRatio.threshold === 'number' && optionsOrRatio.threshold >= 0.1 && optionsOrRatio.threshold <= 1.0) {
        threshold = optionsOrRatio.threshold;
      }
    }

    const existingSlot = this.slots.get(slotId);
    const existingViewEntry = this.viewabilitySlots.get(slotId);
    if (
      !explicitRatioProvided &&
      initialRatio === 0 &&
      existingViewEntry &&
      existingViewEntry.state.status !== 'IDLE' &&
      existingViewEntry.state.intersectionRatio > 0
    ) {
      initialRatio = existingViewEntry.state.intersectionRatio;
    }

    this.slots.set(slotId, {
      slotId,
      lastRefreshedAt,
      intersectionRatio: initialRatio,
      refreshCount: existingViewEntry && existingViewEntry.state.status !== 'IDLE'
        ? existingViewEntry.state.refreshCount
        : (existingSlot ? existingSlot.refreshCount : 0),
      maxRefreshes,
      dwellThresholdMs,
      threshold,
      onRefresh: onRefresh ?? existingSlot?.onRefresh,
      onRefreshKeyChange: onRefreshKeyChange ?? existingSlot?.onRefreshKeyChange,
      domElement: domElement ?? existingSlot?.domElement ?? null,
      googletagSlot: googletagSlot ?? existingSlot?.googletagSlot,
    });
  }

  /**
   * Unregisters an ad slot from refresh management.
   */
  public unregisterSlot(slotId: string): void {
    this.slots.delete(slotId);
    const entry = this.viewabilitySlots.get(slotId);
    if (entry) {
      const currentEl = derefElement(entry.state.element);
      if (!currentEl || !currentEl.isConnected) {
        this.unobserve(slotId);
        this.viewabilitySlots.delete(slotId);
      }
    }
  }

  /**
   * Updates the current viewport intersection ratio of a slot.
   */
  public updateIntersection(slotId: string, ratio: number): void {
    if (!slotId || typeof slotId !== 'string') return;
    const clampedRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;

    const slot = this.slots.get(slotId);
    if (slot) {
      slot.intersectionRatio = clampedRatio;
    }

    if (this.viewabilitySlots.has(slotId)) {
      this.handleSlotIntersection(slotId, clampedRatio, clampedRatio > 0, Date.now());
    }
  }

  /**
   * Alias for updateIntersection to conform with SCOPE.md interface.
   */
  public updateVisibility(slotId: string, ratio: number): void {
    this.updateIntersection(slotId, ratio);
  }

  /**
   * Evaluates composite guard invariant:
   * G_refresh(now, slot) <=>
   *   !document.hidden &&
   *   (refreshCount < maxRefreshes) &&
   *   (now - lastRefreshedAt >= 30,000ms) &&
   *   (intersectionRatio >= 0.50)
   */
  public canRefresh(slotId: string, now: number = Date.now()): boolean {
    if (!slotId || typeof slotId !== 'string') {
      return false;
    }

    if (this.isDocumentHidden()) {
      return false;
    }

    const slot = this.slots.get(slotId);
    const viewEntry = this.viewabilitySlots.get(slotId);

    if (viewEntry && viewEntry.state.status !== 'IDLE') {
      if (viewEntry.state.status !== 'VIEWABLE') {
        return false;
      }
      const pendingElapsed =
        viewEntry.state.intersectionRatio >= viewEntry.config.threshold &&
        viewEntry.state.lastVisibleTimestamp !== null
          ? Math.max(0, now - viewEntry.state.lastVisibleTimestamp)
          : 0;
      const effectiveDwellMs = viewEntry.state.dwellTimeMs + pendingElapsed;
      const maxRefreshes = slot?.maxRefreshes ?? viewEntry.config.maxRefreshes;
      const effectiveRefreshCount = Math.max(
        slot?.refreshCount ?? 0,
        viewEntry.state.refreshCount
      );
      return (
        effectiveRefreshCount < maxRefreshes &&
        effectiveDwellMs >= viewEntry.config.dwellThresholdMs &&
        viewEntry.state.intersectionRatio >= viewEntry.config.threshold
      );
    }

    if (!slot) {
      return false;
    }

    const maxRefreshes = slot.maxRefreshes ?? MAX_REFRESHES_PER_SLOT;
    if (slot.refreshCount >= maxRefreshes) {
      return false;
    }

    const elapsedMs = now - slot.lastRefreshedAt;
    const dwellTimeMet = elapsedMs >= (slot.dwellThresholdMs ?? DWELL_TIME_THRESHOLD_MS);
    const intersectionRatioMet = slot.intersectionRatio >= (slot.threshold ?? MIN_INTERSECTION_RATIO);

    return dwellTimeMet && intersectionRatioMet;
  }

  /**
   * Triggers dual-protocol refresh if composite guard passes:
   * 1. Updates lastRefreshedAt and increments refreshCount.
   * 2. Invokes window.googletag.pubads().refresh().
   * 3. Invokes React component key callbacks (onRefresh, onRefreshKeyChange).
   */
  public triggerRefresh(slotId: string, now: number = Date.now()): boolean {
    if (!slotId || typeof slotId !== 'string') {
      return false;
    }

    if (!this.canRefresh(slotId, now)) {
      return false;
    }

    const slot = this.slots.get(slotId);
    const viewEntry = this.viewabilitySlots.get(slotId);

    if (!slot && viewEntry) {
      this.syncSlotDwell(viewEntry, now);
      return true;
    }

    if (!slot) {
      return false;
    }

    slot.lastRefreshedAt = now;
    slot.refreshCount += 1;
    const nextKey = slot.refreshCount;

    if (viewEntry && viewEntry.state.status !== 'IDLE') {
      viewEntry.state.dwellTimeMs = 0;
      viewEntry.state.lastVisibleTimestamp =
        viewEntry.state.status === 'VIEWABLE' && !this.isDocumentHidden() ? now : null;
      viewEntry.state.refreshCount = Math.max(viewEntry.state.refreshCount + 1, nextKey);
      slot.refreshCount = viewEntry.state.refreshCount;
    }

    // 1. Google Publisher Tag (GPT) refresh invocation
    try {
      if (typeof window !== 'undefined' && window.googletag) {
        const pubads = window.googletag.pubads?.();
        if (pubads && typeof pubads.refresh === 'function') {
          if (slot.googletagSlot) {
            pubads.refresh([slot.googletagSlot]);
          } else {
            pubads.refresh();
          }
        }
      }
    } catch (error) {
      logger.warn('AdRefreshManager', `googletag refresh invocation error for slot ${slotId}`, undefined, error as Error);
    }

    // 2. React component key callback notification
    try {
      if (typeof slot.onRefresh === 'function') {
        slot.onRefresh(nextKey);
      }
      if (typeof slot.onRefreshKeyChange === 'function') {
        slot.onRefreshKeyChange(nextKey);
      }
    } catch (error) {
      logger.warn('AdRefreshManager', `onRefresh callback execution error for slot ${slotId}`, undefined, error as Error);
    }

    // 3. Viewability observer refresh callback notification
    if (viewEntry && viewEntry.state.status !== 'IDLE' && typeof viewEntry.onRefresh === 'function') {
      try {
        viewEntry.onRefresh();
      } catch (error) {
        logger.warn('AdRefreshManager', `Viewability onRefresh error for slot ${slotId}`, undefined, error as Error);
      }
    }

    return true;
  }

  /**
   * Handles tab switch event across chapter navigation:
   * Evaluates active slots and triggers refresh for eligible slots.
   */
  public onTabSwitch(
    candidateSlotIds?: string[],
    now: number = Date.now()
  ): TabSwitchRefreshResult {
    const targetIds = candidateSlotIds && candidateSlotIds.length > 0
      ? candidateSlotIds
      : Array.from(this.slots.keys());

    const refreshed: string[] = [];
    const skipped: string[] = [];

    for (const slotId of targetIds) {
      const success = this.triggerRefresh(slotId, now);
      if (success) {
        refreshed.push(slotId);
      } else {
        skipped.push(slotId);
      }
    }

    return {
      refreshed,
      skipped,
      count: refreshed.length,
      valueOf() {
        return this.refreshed.length;
      },
    };
  }

  /**
   * Retrieves snapshot of slot state.
   */
  public getSlot(slotId: string): AdSlotState | undefined {
    const slot = this.slots.get(slotId);
    return slot ? { ...slot } : undefined;
  }

  /**
   * Returns list of currently registered slot IDs.
   */
  public getRegisteredSlotIds(): string[] {
    return Array.from(this.slots.keys());
  }

  /**
   * Clears all registered slots, viewability observers, and timers.
   */
  public reset(): void {
    this.stopTickTimer();
    this.removeVisibilityListener();
    for (const entry of this.viewabilitySlots.values()) {
      if (entry.observer) {
        try {
          entry.observer.disconnect();
        } catch {
          // Ignore disconnect error
        }
      }
    }
    this.viewabilitySlots.clear();
    this.slots.clear();
    this.isHiddenState = false;
    this.hiddenAtTimestamp = null;
  }
}

export { AdRefreshManager as SmartViewabilityEngine };
export const adRefreshManager = new AdRefreshManager();
export const smartViewabilityObserver: SmartViewabilityObserver = adRefreshManager;
export function createSmartViewabilityObserver(): AdRefreshManager {
  return new AdRefreshManager();
}

export {
  CASCADE_TIMEOUT_MS,
  MAX_FALLBACK_TRANSITION_MS,
  CpaCampaignIdSchema,
  type CpaCampaignId,
  CpaSourceTriggerSchema,
  type CpaSourceTrigger,
  NativeCpaFallbackPayloadSchema,
  type NativeCpaFallbackPayload,
  AdTelemetryEventTypeSchema,
  type AdTelemetryEventType,
  AdTelemetryBeaconSchema,
  type AdTelemetryBeacon,
  type CascadeSlotStatus,
  type CascadeSlotEvent,
  type CascadeTransitionResult,
  CPA_CAMPAIGN_CATALOG,
  selectDeterministicCampaignId,
  resolveNativeCpaFallbackPayload,
  transitionCascadeStateWithPath,
  transitionCascadeState,
  CascadeFallbackStateMachine,
  createCascadeFallbackStateMachine,
  sendAdTelemetryBeacon,
} from './cascadeFallback';

