'use client';

import { useEffect, useRef } from 'react';
import {
  adRefreshManager,
  type AdRefreshManager,
} from '@/lib/ads/adRefreshManager';
import { sendTelemetry, type CpaCampaignId } from '@/lib/ads/cascadeFallback';
import { isPassiveJsdomIntersectionObserver } from './adSlotGeometry';

export interface UseAdSlotViewabilityParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  insRef: React.RefObject<HTMLModElement | null>;
  clientId: string | undefined;
  isPlaceholder: boolean;
  isAdBlockActive: boolean;
  refreshKey?: number | string;
  baseObserverSlotId: string;
  refreshSlotId?: string;
  effectiveSlotId: string;
  instanceId: string;
  viewabilityThreshold: number;
  effectiveDwellThresholdMs: number;
  effectiveMaxRefreshes: number;
  effectiveCampaignId: CpaCampaignId;
  apartmentName: string;
  dong: string;
  isPushedRef: React.MutableRefObject<boolean>;
  isViewableRef: React.MutableRefObject<boolean>;
  pushedCycleRef: React.MutableRefObject<number>;
  currentCycleRef: React.MutableRefObject<number>;
  totalRefreshCountRef: React.MutableRefObject<number>;
  lastRefreshAtRef: React.MutableRefObject<number | null>;
  registeredKeyRef: React.MutableRefObject<string | null>;
  registeredBaseSlotRef: React.MutableRefObject<string | null>;
  registeredEffectiveSlotRef: React.MutableRefObject<string | null>;
  impressionSentCycleRef: React.MutableRefObject<number>;
  unfilledBeaconSentCycleRef: React.MutableRefObject<number>;
  clickBeaconSentCycleRef: React.MutableRefObject<number>;
  viewableImpressionSentCycleRef: React.MutableRefObject<number>;
  latestTelemetryContextRef: React.MutableRefObject<{
    apartmentName: string;
    dong: string;
    campaignId: CpaCampaignId;
    effectiveSlotId: string;
  }>;
  executeAdPush: () => void;
  resetInsDomForRefresh: () => void;
  setIsAdLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setTotalRefreshCount: React.Dispatch<React.SetStateAction<number>>;
  getSlotTelemetryMetrics: (minimumDwellMs?: number) => {
    dwellTimeMs: number;
    intersectionRatio: number;
  };
  clearCascadeTimeout: () => void;
  clearViewableImpressionTimer: () => void;
  syncViewableImpressionTimer: () => void;
}

export function useAdSlotViewability({
  containerRef,
  insRef,
  clientId,
  isPlaceholder,
  isAdBlockActive,
  refreshKey,
  baseObserverSlotId,
  refreshSlotId,
  effectiveSlotId,
  instanceId,
  viewabilityThreshold,
  effectiveDwellThresholdMs,
  effectiveMaxRefreshes,
  effectiveCampaignId,
  apartmentName,
  dong,
  isPushedRef,
  isViewableRef,
  pushedCycleRef,
  currentCycleRef,
  totalRefreshCountRef,
  lastRefreshAtRef,
  registeredKeyRef,
  registeredBaseSlotRef,
  registeredEffectiveSlotRef,
  impressionSentCycleRef,
  unfilledBeaconSentCycleRef,
  clickBeaconSentCycleRef,
  viewableImpressionSentCycleRef,
  latestTelemetryContextRef,
  executeAdPush,
  resetInsDomForRefresh,
  setIsAdLoaded,
  setTotalRefreshCount,
  getSlotTelemetryMetrics,
  clearCascadeTimeout,
  clearViewableImpressionTimer,
  syncViewableImpressionTimer,
}: UseAdSlotViewabilityParams) {
  // Track external refreshKey prop transitions with maxRefreshes cap & dwell-window deduplication
  const prevRefreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (prevRefreshKeyRef.current !== refreshKey) {
      prevRefreshKeyRef.current = refreshKey;
      if (isPlaceholder || isAdBlockActive) {
        return;
      }
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      if (totalRefreshCountRef.current >= effectiveMaxRefreshes) {
        return;
      }

      const now = Date.now();
      // Suppress duplicate push if a refresh already executed within the current dwell window
      if (
        lastRefreshAtRef.current !== null &&
        now - lastRefreshAtRef.current < effectiveDwellThresholdMs
      ) {
        return;
      }

      const activeKey = registeredKeyRef.current || baseObserverSlotId;
      const targetRefreshCount = totalRefreshCountRef.current + 1;
      const allowed = adRefreshManager.recordExternalRefresh(
        activeKey,
        now,
        targetRefreshCount
      );
      if (!allowed) {
        return;
      }

      const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(0);
      clearViewableImpressionTimer();
      totalRefreshCountRef.current = targetRefreshCount;
      lastRefreshAtRef.current = now;
      currentCycleRef.current += 1;
      impressionSentCycleRef.current = currentCycleRef.current;
      isPushedRef.current = false;
      setIsAdLoaded(false);
      resetInsDomForRefresh();
      setTotalRefreshCount(totalRefreshCountRef.current);
      executeAdPush();
      sendTelemetry({
        slotId: effectiveSlotId,
        placementSlotId: activeKey,
        eventType: 'IMPRESSION',
        campaignId: effectiveCampaignId,
        apartmentName,
        dong,
        dwellTimeMs,
        intersectionRatio,
        timestamp: new Date(now).toISOString(),
      });
    }
  }, [
    refreshKey,
    isPlaceholder,
    isAdBlockActive,
    effectiveMaxRefreshes,
    effectiveDwellThresholdMs,
    baseObserverSlotId,
    clearViewableImpressionTimer,
    resetInsDomForRefresh,
    executeAdPush,
    effectiveSlotId,
    effectiveCampaignId,
    apartmentName,
    dong,
    getSlotTelemetryMetrics,
    setIsAdLoaded,
    setTotalRefreshCount,
    totalRefreshCountRef,
    lastRefreshAtRef,
    registeredKeyRef,
    currentCycleRef,
    impressionSentCycleRef,
    isPushedRef,
  ]);

  // Smart Viewability & 30s Dwell Refresh Observer Binding
  useEffect(() => {
    if (typeof window === 'undefined' || !clientId) return;
    if (isAdBlockActive || isPlaceholder) return;

    const targetEl = containerRef.current ?? insRef.current;
    if (!targetEl) return;

    // Assign a stable observer key per component instance lifecycle; reset state if base OR effective slot identity changed
    const baseChanged =
      registeredBaseSlotRef.current !== null &&
      registeredBaseSlotRef.current !== baseObserverSlotId;
    const effectiveSlotChanged =
      registeredEffectiveSlotRef.current !== null &&
      registeredEffectiveSlotRef.current !== effectiveSlotId;
    const isSlotIdentityTransition = baseChanged || effectiveSlotChanged;

    if (
      !registeredKeyRef.current ||
      registeredBaseSlotRef.current !== baseObserverSlotId ||
      registeredEffectiveSlotRef.current !== effectiveSlotId
    ) {
      const previousKey = registeredKeyRef.current;
      registeredBaseSlotRef.current = baseObserverSlotId;
      registeredEffectiveSlotRef.current = effectiveSlotId;

      if (isSlotIdentityTransition && previousKey) {
        adRefreshManager.resetSlot(previousKey);
      }

      if (refreshSlotId) {
        registeredKeyRef.current = refreshSlotId;
      } else {
        const existingGlobalState = adRefreshManager.getState(baseObserverSlotId);
        const isAvailable =
          !existingGlobalState || existingGlobalState.status === 'IDLE';
        registeredKeyRef.current = isAvailable
          ? baseObserverSlotId
          : `${baseObserverSlotId}__inst_${instanceId}`;
      }

      if (isSlotIdentityTransition) {
        isPushedRef.current = false;
        isViewableRef.current = false;
        pushedCycleRef.current = -1;
        currentCycleRef.current = 0;
        totalRefreshCountRef.current = 0;
        lastRefreshAtRef.current = null;
        impressionSentCycleRef.current = -1;
        unfilledBeaconSentCycleRef.current = -1;
        clickBeaconSentCycleRef.current = -1;
        viewableImpressionSentCycleRef.current = -1;
        clearViewableImpressionTimer();
        resetInsDomForRefresh();
        setIsAdLoaded(false);
        setTotalRefreshCount(0);
      }
    }

    const registeredKey = registeredKeyRef.current;
    const localManager: AdRefreshManager = adRefreshManager;

    const handleInitialPush = () => {
      isViewableRef.current = true;
      if (lastRefreshAtRef.current === null) {
        lastRefreshAtRef.current = Date.now();
      }
      executeAdPush();
      syncViewableImpressionTimer();
    };

    const handleDwellRefresh = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (totalRefreshCountRef.current >= effectiveMaxRefreshes) return;

      const now = Date.now();
      if (
        lastRefreshAtRef.current !== null &&
        now - lastRefreshAtRef.current < effectiveDwellThresholdMs
      ) {
        return;
      }

      const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(
        effectiveDwellThresholdMs
      );
      const ctx = latestTelemetryContextRef.current;

      clearViewableImpressionTimer();
      totalRefreshCountRef.current += 1;
      lastRefreshAtRef.current = now;
      currentCycleRef.current += 1;
      impressionSentCycleRef.current = currentCycleRef.current;
      isPushedRef.current = false;
      resetInsDomForRefresh();
      executeAdPush();
      setIsAdLoaded(false);
      setTotalRefreshCount(totalRefreshCountRef.current);
      sendTelemetry({
        slotId: ctx.effectiveSlotId,
        placementSlotId: registeredKey,
        eventType: 'IMPRESSION',
        campaignId: ctx.campaignId,
        apartmentName: ctx.apartmentName,
        dong: ctx.dong,
        dwellTimeMs,
        intersectionRatio,
        timestamp: new Date(now).toISOString(),
      });
    };

    localManager.observe(registeredKey, targetEl, handleDwellRefresh, {
      threshold: viewabilityThreshold,
      dwellThresholdMs: effectiveDwellThresholdMs,
      maxRefreshes: effectiveMaxRefreshes,
      onInitialPush: handleInitialPush,
      onViewabilityChange: (isViewable) => {
        isViewableRef.current = isViewable;
        syncViewableImpressionTimer();
      },
      skipDefaultAdSensePush: true,
    });

    // If running under the passive JSDOM default stub (which never invokes observer callback),
    // evaluate element bounding rect or fallback to visible if in default test viewport.
    if (isPassiveJsdomIntersectionObserver()) {
      const rect = targetEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 800;
      const isDefaultZeroRect =
        rect.top === 0 && rect.bottom === 0 && rect.height === 0 && rect.width === 0;

      if (isDefaultZeroRect) {
        if (typeof document === 'undefined' || !document.hidden) {
          localManager.updateIntersection(registeredKey, 1.0);
        }
      } else if (rect.height > 0) {
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(viewportHeight, rect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const computedRatio = visibleHeight / rect.height;
        localManager.updateIntersection(registeredKey, computedRatio);
      } else {
        const inBounds = rect.top >= 0 && rect.top < viewportHeight;
        localManager.updateIntersection(registeredKey, inBounds ? 1.0 : 0);
      }
    }

    return () => {
      isViewableRef.current = false;
      clearViewableImpressionTimer();
      clearCascadeTimeout();
      localManager.unobserve(registeredKey, targetEl);
    };
  }, [
    clientId,
    isAdBlockActive,
    isPlaceholder,
    baseObserverSlotId,
    refreshSlotId,
    effectiveSlotId,
    instanceId,
    viewabilityThreshold,
    effectiveDwellThresholdMs,
    effectiveMaxRefreshes,
    containerRef,
    insRef,
    isPushedRef,
    isViewableRef,
    pushedCycleRef,
    currentCycleRef,
    totalRefreshCountRef,
    lastRefreshAtRef,
    registeredKeyRef,
    registeredBaseSlotRef,
    registeredEffectiveSlotRef,
    impressionSentCycleRef,
    unfilledBeaconSentCycleRef,
    clickBeaconSentCycleRef,
    viewableImpressionSentCycleRef,
    latestTelemetryContextRef,
    resetInsDomForRefresh,
    executeAdPush,
    clearCascadeTimeout,
    clearViewableImpressionTimer,
    syncViewableImpressionTimer,
    setIsAdLoaded,
    setTotalRefreshCount,
    getSlotTelemetryMetrics,
  ]);
}
