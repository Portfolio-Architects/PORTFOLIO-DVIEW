/**
 * @module adRefreshManager
 * @description Deterministic Ad Refresh Engine enforcing 30s dwell time
 * and 50% viewport intersection ratio guards for Google AdSense / GPT ad units.
 * Architecture Layer: Library / Analytics & Ads
 */

import { logger } from '@/lib/services/logger';

export const DWELL_TIME_THRESHOLD_MS = 30000;
export const MIN_INTERSECTION_RATIO = 0.50;

export interface AdSlotRegistration {
  slotId: string;
  domElement?: HTMLElement | null;
  lastRefreshedAt?: number;
  intersectionRatio?: number;
  initialRatio?: number;
  onRefreshKeyChange?: (nextKey: number) => void;
  onRefresh?: (refreshKey: number) => void;
  googletagSlot?: unknown;
}

export interface AdSlotState {
  slotId: string;
  lastRefreshedAt: number;
  intersectionRatio: number;
  refreshCount: number;
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

export class AdRefreshManager {
  private readonly slots: Map<string, AdSlotState> = new Map();

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
    let initialRatio = 0;
    let onRefresh: ((key: number) => void) | undefined = onRefreshCallback;
    let onRefreshKeyChange: ((nextKey: number) => void) | undefined = undefined;
    let domElement: HTMLElement | null = null;
    let googletagSlot: unknown = undefined;
    let lastRefreshedAt = Date.now();

    if (typeof optionsOrRatio === 'number') {
      initialRatio = Number.isFinite(optionsOrRatio) ? Math.max(0, Math.min(1, optionsOrRatio)) : 0;
    } else if (typeof optionsOrRatio === 'object' && optionsOrRatio !== null) {
      const rawRatio = optionsOrRatio.intersectionRatio ?? optionsOrRatio.initialRatio;
      if (typeof rawRatio === 'number' && Number.isFinite(rawRatio)) {
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
    }

    this.slots.set(slotId, {
      slotId,
      lastRefreshedAt,
      intersectionRatio: initialRatio,
      refreshCount: 0,
      onRefresh,
      onRefreshKeyChange,
      domElement,
      googletagSlot,
    });
  }

  /**
   * Unregisters an ad slot from refresh management.
   */
  public unregisterSlot(slotId: string): void {
    this.slots.delete(slotId);
  }

  /**
   * Updates the current viewport intersection ratio of a slot.
   */
  public updateIntersection(slotId: string, ratio: number): void {
    const slot = this.slots.get(slotId);
    if (!slot) return;
    const clampedRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
    slot.intersectionRatio = clampedRatio;
  }

  /**
   * Alias for updateIntersection to conform with SCOPE.md interface.
   */
  public updateVisibility(slotId: string, ratio: number): void {
    this.updateIntersection(slotId, ratio);
  }

  /**
   * Evaluates composite guard invariant:
   * G_refresh(now, slot) <=> (now - lastRefreshedAt >= 30,000ms) && (intersectionRatio >= 0.50)
   */
  public canRefresh(slotId: string, now: number = Date.now()): boolean {
    const slot = this.slots.get(slotId);
    if (!slot) {
      return false;
    }

    const elapsedMs = now - slot.lastRefreshedAt;
    const dwellTimeMet = elapsedMs >= DWELL_TIME_THRESHOLD_MS;
    const intersectionRatioMet = slot.intersectionRatio >= MIN_INTERSECTION_RATIO;

    return dwellTimeMet && intersectionRatioMet;
  }

  /**
   * Triggers dual-protocol refresh if composite guard passes:
   * 1. Updates lastRefreshedAt and increments refreshCount.
   * 2. Invokes window.googletag.pubads().refresh().
   * 3. Invokes React component key callbacks (onRefresh, onRefreshKeyChange).
   */
  public triggerRefresh(slotId: string, now: number = Date.now()): boolean {
    const slot = this.slots.get(slotId);
    if (!slot) {
      return false;
    }

    if (!this.canRefresh(slotId, now)) {
      return false;
    }

    slot.lastRefreshedAt = now;
    slot.refreshCount += 1;
    const nextKey = slot.refreshCount;

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
   * Clears all registered slots and history.
   */
  public reset(): void {
    this.slots.clear();
  }
}

export const adRefreshManager = new AdRefreshManager();
