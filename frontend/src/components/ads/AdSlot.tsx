'use client';

import React, { useRef, useState, useCallback, useId, useEffect, useMemo } from 'react';
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';
import { logger } from '@/lib/services/logger';
import {
  adRefreshManager,
  DWELL_TIME_THRESHOLD_MS,
  MIN_INTERSECTION_RATIO,
  MAX_REFRESHES_PER_SLOT,
  SmartViewabilityConfigSchema,
  type SmartViewabilityConfig,
  type ViewabilitySlotState,
  type SmartViewabilityObserver,
} from '@/lib/ads/adRefreshManager';
import {
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
  UserAgentCategorySchema,
  type UserAgentCategory,
  AdTelemetryClosedLoopEventSchema,
  type AdTelemetryClosedLoopEvent,
  TelemetryApiResponseSchema,
  type TelemetryApiResponse,
  detectUserAgentCategory,
  type ClosedLoopTelemetryInput,
  GA4_MAX_PARAM_VALUE_LENGTH,
  VIEWABLE_IMPRESSION_DWELL_MS,
  dispatchGa4AdTelemetry,
  sendTelemetry,
  ClosedLoopSlotStatusSchema,
  type ClosedLoopSlotStatus,
  type ClosedLoopSlotState,
  type ClosedLoopSlotAction,
  createInitialClosedLoopState,
  transitionClosedLoopState,
  ClosedLoopTelemetryController,
  createClosedLoopTelemetryController,
} from '@/lib/ads/cascadeFallback';
import {
  getAdSlotMinHeightClass,
  type AdSlotFormat,
} from './core/adSlotGeometry';
import { useAdSlotCascade } from './core/useAdSlotCascade';
import { useAdSlotViewability } from './core/useAdSlotViewability';
import { useInsDomInterceptor } from './core/useInsDomInterceptor';
import { AdSlotSkeletonView } from './views/AdSlotSkeletonView';
import { AdSlotPlaceholderView } from './views/AdSlotPlaceholderView';
import { AdSlotAdBlockView } from './views/AdSlotAdBlockView';
import { AdSlotCascadeFallbackView } from './views/AdSlotCascadeFallbackView';

export {
  SmartViewabilityConfigSchema,
  type SmartViewabilityConfig,
  type ViewabilitySlotState,
  type SmartViewabilityObserver,
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
  UserAgentCategorySchema,
  type UserAgentCategory,
  AdTelemetryClosedLoopEventSchema,
  type AdTelemetryClosedLoopEvent,
  TelemetryApiResponseSchema,
  type TelemetryApiResponse,
  detectUserAgentCategory,
  type ClosedLoopTelemetryInput,
  GA4_MAX_PARAM_VALUE_LENGTH,
  VIEWABLE_IMPRESSION_DWELL_MS,
  dispatchGa4AdTelemetry,
  sendTelemetry,
  ClosedLoopSlotStatusSchema,
  type ClosedLoopSlotStatus,
  type ClosedLoopSlotState,
  type ClosedLoopSlotAction,
  createInitialClosedLoopState,
  transitionClosedLoopState,
  ClosedLoopTelemetryController,
  createClosedLoopTelemetryController,
  getAdSlotMinHeightClass,
};

export interface AdSlotProps {
  slotId?: string; // AdSense ad unit ID (e.g., "1234567890")
  refreshSlotId?: string; // Optional distinct slot key for AdRefreshManager registration (e.g., "1000000002_ch02")
  format?: AdSlotFormat;
  responsive?: boolean;
  className?: string;
  testMode?: boolean; // Force mock rendering for snapshot tests & Storybook
  fallbackType?: 'mbti-promo' | 'dashboard-promo' | 'minimal' | 'cpa';
  minHeightClass?: string;
  refreshKey?: number | string;
  viewabilityThreshold?: number;
  dwellThresholdMs?: number;
  maxRefreshes?: number;
  cpaCampaignId?: CpaCampaignId;
  apartmentName?: string;
  dong?: string;
  cascadeTimeoutMs?: number;
  customCpaPayload?: Partial<NativeCpaFallbackPayload>;
}

function trimNonEmptySlotId(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function resolveDefaultAdSenseSlotId(format: AdSlotFormat = 'auto'): string {
  const loungeDetail = trimNonEmptySlotId(process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOUNGE_DETAIL);
  const aptModal = trimNonEmptySlotId(process.env.NEXT_PUBLIC_ADSENSE_SLOT_APT_MODAL);
  const gapExplorer = trimNonEmptySlotId(process.env.NEXT_PUBLIC_ADSENSE_SLOT_GAP_EXPLORER);
  const anchor = trimNonEmptySlotId(process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR);
  const dashboardBottom = trimNonEmptySlotId(process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM);

  const formatSpecificSlotId =
    format === 'in-feed'
      ? loungeDetail
      : format === 'banner'
      ? aptModal
      : format === 'rectangle'
      ? gapExplorer || aptModal
      : format === 'horizontal-strip'
      ? anchor || dashboardBottom
      : dashboardBottom;

  return (
    formatSpecificSlotId ||
    dashboardBottom ||
    aptModal ||
    loungeDetail ||
    gapExplorer ||
    anchor ||
    '6782594447'
  );
}

export function AdSlot({
  slotId,
  refreshSlotId,
  format = 'auto',
  responsive = true,
  className = '',
  testMode = false,
  fallbackType = 'cpa',
  minHeightClass: propMinHeightClass,
  refreshKey,
  viewabilityThreshold = MIN_INTERSECTION_RATIO,
  dwellThresholdMs = DWELL_TIME_THRESHOLD_MS,
  maxRefreshes = MAX_REFRESHES_PER_SLOT,
  cpaCampaignId,
  apartmentName = 'GLOBAL',
  dong = '',
  cascadeTimeoutMs = CASCADE_TIMEOUT_MS,
  customCpaPayload,
}: AdSlotProps) {
  const instanceId = useId();
  const { isAdBlockActive } = useAdBlockDetector();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [totalRefreshCount, setTotalRefreshCount] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const insRef = useRef<HTMLModElement | null>(null);
  const isPushedRef = useRef(false);
  const isViewableRef = useRef(false);
  const pushedCycleRef = useRef<number>(-1);
  const currentCycleRef = useRef<number>(0);
  const totalRefreshCountRef = useRef<number>(0);
  const lastRefreshAtRef = useRef<number | null>(null);
  const registeredKeyRef = useRef<string | null>(null);
  const registeredBaseSlotRef = useRef<string | null>(null);
  const registeredEffectiveSlotRef = useRef<string | null>(null);
  const adblockBeaconSentRef = useRef<boolean>(false);
  const impressionSentCycleRef = useRef<number>(-1);
  const viewableImpressionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewableImpressionSentCycleRef = useRef<number>(-1);
  const syncViewableImpressionTimerRef = useRef<() => void>(() => {});

  const [initialNumericRefreshKey] = useState<number | null>(() =>
    typeof refreshKey === 'number' && Number.isFinite(refreshKey) ? refreshKey : null
  );

  const effectiveMaxRefreshes =
    typeof maxRefreshes === 'number' && Number.isFinite(maxRefreshes)
      ? Math.max(1, Math.min(20, Math.round(maxRefreshes)))
      : MAX_REFRESHES_PER_SLOT;

  const effectiveDwellThresholdMs =
    typeof dwellThresholdMs === 'number' && Number.isFinite(dwellThresholdMs)
      ? Math.max(10000, Math.round(dwellThresholdMs))
      : DWELL_TIME_THRESHOLD_MS;

  const effectiveCascadeTimeoutMs =
    typeof cascadeTimeoutMs === 'number' && Number.isFinite(cascadeTimeoutMs) && cascadeTimeoutMs > 0
      ? Math.round(cascadeTimeoutMs)
      : CASCADE_TIMEOUT_MS;

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const isDev = process.env.NODE_ENV === 'development';
  const isPlaceholder = Boolean(testMode || !clientId || (isDev && !testMode));

  const minHeightClass = propMinHeightClass || getAdSlotMinHeightClass(format);

  const defaultSlotId = resolveDefaultAdSenseSlotId(format);
  const effectiveSlotId = trimNonEmptySlotId(slotId) || defaultSlotId;
  const normalizedRefreshSlotId = trimNonEmptySlotId(refreshSlotId);
  const baseObserverSlotId = normalizedRefreshSlotId || effectiveSlotId;
  const effectiveCampaignId =
    cpaCampaignId ?? selectDeterministicCampaignId(baseObserverSlotId);

  const getSlotTelemetryMetrics = useCallback(
    (minimumDwellMs = 0) => {
      const activeKey = registeredKeyRef.current || baseObserverSlotId;
      const managerState = adRefreshManager.getState(activeKey);
      const computedDwell =
        managerState && managerState.dwellTimeMs > 0
          ? managerState.dwellTimeMs
          : lastRefreshAtRef.current !== null
          ? Math.max(0, Date.now() - lastRefreshAtRef.current)
          : 0;
      const dwellTimeMs = Math.max(minimumDwellMs, computedDwell);
      const intersectionRatio =
        managerState && managerState.intersectionRatio > 0
          ? managerState.intersectionRatio
          : isViewableRef.current
          ? Math.min(1, Math.max(0.5, viewabilityThreshold))
          : 0;
      return { dwellTimeMs, intersectionRatio };
    },
    [baseObserverSlotId, viewabilityThreshold]
  );

  const effectiveRefreshKey = (() => {
    if (isPlaceholder || isAdBlockActive) {
      return refreshKey;
    }
    const cappedRefreshCount = Math.min(effectiveMaxRefreshes, totalRefreshCount);
    if (refreshKey !== undefined) {
      if (typeof refreshKey === 'number' && Number.isFinite(refreshKey)) {
        const baseNumericKey = initialNumericRefreshKey ?? 0;
        return baseNumericKey + cappedRefreshCount;
      }
      return cappedRefreshCount > 0 ? `${refreshKey}-${cappedRefreshCount}` : refreshKey;
    }
    return cappedRefreshCount > 0 ? cappedRefreshCount : undefined;
  })();

  const latestTelemetryContextRef = useRef({
    apartmentName,
    dong,
    campaignId: effectiveCampaignId,
    effectiveSlotId,
  });

  const clearViewableImpressionTimer = useCallback(() => {
    if (viewableImpressionTimerRef.current !== null) {
      clearTimeout(viewableImpressionTimerRef.current);
      viewableImpressionTimerRef.current = null;
    }
  }, []);

  const onSlotFilled = useCallback(() => {
    if (
      !isPlaceholder &&
      !isAdBlockActive &&
      impressionSentCycleRef.current !== currentCycleRef.current
    ) {
      impressionSentCycleRef.current = currentCycleRef.current;
      const activeKey = registeredKeyRef.current || baseObserverSlotId;
      const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(0);
      const ctx = latestTelemetryContextRef.current;
      dispatchGa4AdTelemetry({
        eventType: 'IMPRESSION',
        slotId: ctx.effectiveSlotId,
        placementSlotId: activeKey,
        campaignId: ctx.campaignId,
        apartmentName: ctx.apartmentName,
        dong: ctx.dong,
        dwellTimeMs,
        intersectionRatio,
        timestamp: new Date().toISOString(),
      });
    }
    syncViewableImpressionTimerRef.current();
  }, [baseObserverSlotId, getSlotTelemetryMetrics, isAdBlockActive, isPlaceholder]);

  const {
    cascadeStatus,
    setCascadeStatus,
    cascadeTrigger,
    lateFillDiscarded,
    setLateFillDiscarded,
    cascadeStatusRef,
    explicitlyFilledRef,
    cascadeTimeoutRef,
    cascadeRemainingMsRef,
    cascadeTimerStartedAtRef,
    unfilledBeaconSentCycleRef,
    clickBeaconSentCycleRef,
    clearCascadeTimeout,
    activateCascadeFallback,
    discardLateFilledResponse,
    startCascadeTimeout,
    resetInsDomForRefresh,
    handleCascadeCtaClick,
    handleAdBlockFallbackClick,
    isCascadeFallbackActive,
  } = useAdSlotCascade({
    insRef,
    isPlaceholder,
    isAdBlockActive,
    isPushedRef,
    currentCycleRef,
    effectiveCascadeTimeoutMs,
    effectiveSlotId,
    baseObserverSlotId,
    effectiveCampaignId,
    customCpaPayload,
    apartmentName,
    dong,
    getSlotTelemetryMetrics,
    setIsAdLoaded,
    clearViewableImpressionTimer,
    onSlotFilled,
  });

  const executeAdPush = useCallback(() => {
    if (process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true' && !testMode) return;
    if (isPushedRef.current) return;
    if (typeof window === 'undefined' || !clientId) return;
    if (isAdBlockActive || isPlaceholder) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    try {
      if (insRef.current && !insRef.current.getAttribute('data-adsbygoogle-status')) {
        const win = window as unknown as {
          adsbygoogle?: Array<Record<string, unknown>> | { push?: (...args: unknown[]) => void };
        };
        if (Array.isArray(win.adsbygoogle)) {
          win.adsbygoogle.push({});
          isPushedRef.current = true;
          pushedCycleRef.current = currentCycleRef.current;
        } else if (win.adsbygoogle && typeof win.adsbygoogle.push === 'function') {
          win.adsbygoogle.push({});
          isPushedRef.current = true;
          pushedCycleRef.current = currentCycleRef.current;
        } else {
          win.adsbygoogle = [{}];
          isPushedRef.current = true;
          pushedCycleRef.current = currentCycleRef.current;
        }
        cascadeRemainingMsRef.current = effectiveCascadeTimeoutMs;
        startCascadeTimeout(effectiveCascadeTimeoutMs);
      }
    } catch (err) {
      logger.warn('AdSlot', 'AdSense push warning', undefined, err as Error);
    }
  }, [clientId, isAdBlockActive, isPlaceholder, testMode, effectiveCascadeTimeoutMs, startCascadeTimeout, currentCycleRef, insRef, isPushedRef, cascadeRemainingMsRef]);

  const cpaPayload = resolveNativeCpaFallbackPayload({
    slotId: effectiveSlotId,
    sourceTrigger: isAdBlockActive ? 'ADBLOCK_ACTIVE' : cascadeTrigger,
    cpaCampaignId: effectiveCampaignId,
    overrides: customCpaPayload,
  });

  const cpaTemplate = CPA_CAMPAIGN_CATALOG[cpaPayload.cpaCampaignId];

  const telemetryContext = useMemo(
    () => ({
      apartmentName,
      dong,
      campaignId: cpaPayload.cpaCampaignId,
      effectiveSlotId,
    }),
    [apartmentName, dong, cpaPayload.cpaCampaignId, effectiveSlotId]
  );

  useEffect(() => {
    latestTelemetryContextRef.current = telemetryContext;
  }, [telemetryContext]);

  const syncViewableImpressionTimer = useCallback(() => {
    const isHidden = typeof document !== 'undefined' && Boolean(document.hidden);
    const activeKey = registeredKeyRef.current || baseObserverSlotId;
    const managerState = adRefreshManager.getState(activeKey);
    const isActivelyViewable = managerState
      ? (managerState.status === 'VIEWABLE' || managerState.status === 'REFRESHING') &&
        managerState.isIntersecting &&
        managerState.intersectionRatio >= viewabilityThreshold
      : isViewableRef.current;

    const shouldRun =
      !isPlaceholder &&
      !isAdBlockActive &&
      !isHidden &&
      explicitlyFilledRef.current &&
      cascadeStatusRef.current === 'FILLED' &&
      insRef.current?.getAttribute('data-ad-status') !== 'unfilled' &&
      isActivelyViewable &&
      viewableImpressionSentCycleRef.current !== currentCycleRef.current;

    if (!shouldRun) {
      clearViewableImpressionTimer();
      return;
    }

    if (viewableImpressionTimerRef.current !== null) {
      return;
    }

    const scheduledCycle = currentCycleRef.current;
    const scheduledSlotId = latestTelemetryContextRef.current.effectiveSlotId;
    viewableImpressionTimerRef.current = setTimeout(() => {
      viewableImpressionTimerRef.current = null;
      const hiddenNow = typeof document !== 'undefined' && Boolean(document.hidden);
      const currentKey = registeredKeyRef.current || baseObserverSlotId;
      const currentState = adRefreshManager.getState(currentKey);
      const viewableNow = currentState
        ? (currentState.status === 'VIEWABLE' || currentState.status === 'REFRESHING') &&
          currentState.isIntersecting &&
          currentState.intersectionRatio >= viewabilityThreshold
        : isViewableRef.current;
      const ctx = latestTelemetryContextRef.current;

      if (
        isPlaceholder ||
        isAdBlockActive ||
        hiddenNow ||
        !explicitlyFilledRef.current ||
        cascadeStatusRef.current !== 'FILLED' ||
        insRef.current?.getAttribute('data-ad-status') === 'unfilled' ||
        !viewableNow ||
        ctx.effectiveSlotId !== scheduledSlotId ||
        currentCycleRef.current !== scheduledCycle ||
        viewableImpressionSentCycleRef.current === scheduledCycle
      ) {
        return;
      }

      viewableImpressionSentCycleRef.current = scheduledCycle;
      const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(
        VIEWABLE_IMPRESSION_DWELL_MS
      );
      dispatchGa4AdTelemetry({
        eventType: 'VIEWABLE_IMPRESSION',
        slotId: ctx.effectiveSlotId,
        placementSlotId: currentKey,
        campaignId: ctx.campaignId,
        apartmentName: ctx.apartmentName,
        dong: ctx.dong,
        dwellTimeMs,
        intersectionRatio,
        timestamp: new Date().toISOString(),
      });
    }, VIEWABLE_IMPRESSION_DWELL_MS);
  }, [
    baseObserverSlotId,
    clearViewableImpressionTimer,
    cascadeStatusRef,
    explicitlyFilledRef,
    getSlotTelemetryMetrics,
    isAdBlockActive,
    isPlaceholder,
    viewabilityThreshold,
  ]);

  useEffect(() => {
    syncViewableImpressionTimerRef.current = syncViewableImpressionTimer;
  }, [syncViewableImpressionTimer]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => {
        clearViewableImpressionTimer();
      };
    }
    const onVisibilityChange = () => {
      syncViewableImpressionTimerRef.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearViewableImpressionTimer();
    };
  }, [clearViewableImpressionTimer]);

  // Dispatch ADBLOCK_FALLBACK beacon when adblock fallback is active
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true' && !testMode) {
      return;
    }
    if (!isAdBlockActive) {
      adblockBeaconSentRef.current = false;
      return;
    }
    if (!adblockBeaconSentRef.current) {
      adblockBeaconSentRef.current = true;
      const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(0);
      sendTelemetry({
        slotId: effectiveSlotId,
        placementSlotId: baseObserverSlotId,
        eventType: 'ADBLOCK_FALLBACK',
        campaignId: cpaPayload.cpaCampaignId,
        apartmentName,
        dong,
        dwellTimeMs,
        intersectionRatio,
        timestamp: new Date().toISOString(),
      });
    }
  }, [
    isAdBlockActive,
    testMode,
    effectiveSlotId,
    baseObserverSlotId,
    cpaPayload.cpaCampaignId,
    apartmentName,
    dong,
    getSlotTelemetryMetrics,
  ]);

  useAdSlotViewability({
    containerRef,
    insRef,
    clientId,
    isPlaceholder,
    isAdBlockActive,
    refreshKey,
    baseObserverSlotId,
    refreshSlotId: normalizedRefreshSlotId,
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
  });

  useInsDomInterceptor({
    insRef,
    isPlaceholder,
    isAdBlockActive,
    effectiveRefreshKey,
    isPushedRef,
    cascadeStatusRef,
    explicitlyFilledRef,
    cascadeTimeoutRef,
    cascadeRemainingMsRef,
    cascadeTimerStartedAtRef,
    setCascadeStatus,
    setIsAdLoaded,
    setLateFillDiscarded,
    activateCascadeFallback,
    clearCascadeTimeout,
    clearViewableImpressionTimer,
    onSlotFilled,
    discardLateFilledResponse,
    startCascadeTimeout,
  });

  const isApprovalMode = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true';
  if (isApprovalMode && !testMode) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid="ad-slot-container"
      data-slot-format={format}
      data-refresh-key={effectiveRefreshKey}
      data-cascade-status={cascadeStatus}
      style={{ contain: 'layout paint' }}
      className={`w-full relative overflow-hidden flex flex-col justify-center items-center transition-all ${minHeightClass} ${className}`}
    >
      <span
        data-testid="ad-slot-label"
        className="absolute top-1.5 left-2.5 z-10 pointer-events-none text-[10px] text-tertiary font-bold tracking-wider select-none"
      >
        광고
      </span>
      {isAdBlockActive ? (
        <AdSlotAdBlockView
          fallbackType={fallbackType}
          cpaPayload={cpaPayload}
          cpaTemplate={cpaTemplate}
          minHeightClass={minHeightClass}
          onAdBlockFallbackClick={handleAdBlockFallbackClick}
        />
      ) : isPlaceholder ? (
        <AdSlotPlaceholderView
          format={format}
          slotId={effectiveSlotId}
          minHeightClass={minHeightClass}
        />
      ) : (
        <div className={`w-full h-full relative flex items-center justify-center ${minHeightClass}`}>
          {!isAdLoaded && !isCascadeFallbackActive && <AdSlotSkeletonView />}

          {isCascadeFallbackActive && (
            <AdSlotCascadeFallbackView
              cpaPayload={cpaPayload}
              cpaTemplate={cpaTemplate}
              cascadeStatus={cascadeStatus}
              lateFillDiscarded={lateFillDiscarded}
              minHeightClass={minHeightClass}
              onCascadeCtaClick={handleCascadeCtaClick}
            />
          )}

          <ins
            ref={insRef}
            className={`adsbygoogle ${responsive ? 'w-full block' : ''} ${
              isCascadeFallbackActive ? 'hidden pointer-events-none' : ''
            }`}
            style={
              isCascadeFallbackActive
                ? { display: 'none', width: 0, height: 0, minHeight: 0 }
                : { display: 'block', width: '100%', minHeight: 'inherit' }
            }
            aria-hidden={isCascadeFallbackActive ? 'true' : undefined}
            data-cascade-suppressed={isCascadeFallbackActive ? 'true' : undefined}
            data-ad-client={clientId}
            data-ad-slot={effectiveSlotId}
            data-ad-format={
              format === 'in-feed'
                ? 'fluid'
                : format === 'horizontal-strip'
                ? 'horizontal'
                : format === 'rectangle'
                ? 'rectangle'
                : 'auto'
            }
            data-ad-layout-key={format === 'in-feed' ? '-fb+5w+4e-db+86' : undefined}
            data-full-width-responsive={responsive ? 'true' : 'false'}
          />
        </div>
      )}
    </div>
  );
}

export default AdSlot;
