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
  const adblockBeaconSentRef = useRef<boolean>(false);

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

  const defaultSlotId =
    (format === 'in-feed'
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOUNGE_DETAIL
      : format === 'banner'
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_APT_MODAL
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM) ||
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM ||
    '6782594447';

  const effectiveSlotId = slotId || defaultSlotId;
  const baseObserverSlotId = refreshSlotId || effectiveSlotId;
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
    effectiveCampaignId,
    customCpaPayload,
    apartmentName,
    dong,
    getSlotTelemetryMetrics,
    setIsAdLoaded,
  });

  const executeAdPush = useCallback(() => {
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
  }, [clientId, isAdBlockActive, isPlaceholder, effectiveCascadeTimeoutMs, startCascadeTimeout, currentCycleRef, insRef, isPushedRef, cascadeRemainingMsRef]);

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

  const latestTelemetryContextRef = useRef(telemetryContext);

  useEffect(() => {
    latestTelemetryContextRef.current = telemetryContext;
  }, [telemetryContext]);

  // Dispatch ADBLOCK_FALLBACK beacon when adblock fallback is active
  useEffect(() => {
    if (!isAdBlockActive) {
      adblockBeaconSentRef.current = false;
      return;
    }
    if (!adblockBeaconSentRef.current) {
      adblockBeaconSentRef.current = true;
      const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(0);
      sendTelemetry({
        slotId: effectiveSlotId,
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
    effectiveSlotId,
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
    unfilledBeaconSentCycleRef,
    clickBeaconSentCycleRef,
    latestTelemetryContextRef,
    executeAdPush,
    resetInsDomForRefresh,
    setIsAdLoaded,
    setTotalRefreshCount,
    getSlotTelemetryMetrics,
    clearCascadeTimeout,
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
      className={`w-full relative overflow-hidden flex flex-col justify-center items-center transition-all ${minHeightClass} ${className}`}
    >
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
          slotId={slotId}
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
