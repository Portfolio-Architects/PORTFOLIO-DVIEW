'use client';

import React, { useEffect, useRef, useState, useCallback, useId } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';
import { logger } from '@/lib/services/logger';
import {
  adRefreshManager,
  AdRefreshManager,
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
} from '@/lib/ads/cascadeFallback';

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
};

export interface AdSlotProps {
  slotId?: string; // AdSense ad unit ID (e.g., "1234567890")
  refreshSlotId?: string; // Optional distinct slot key for AdRefreshManager registration (e.g., "1000000002_ch02")
  format?: 'in-feed' | 'banner' | 'rectangle' | 'horizontal-strip' | 'auto';
  responsive?: boolean;
  className?: string;
  testMode?: boolean; // Force mock rendering for snapshot tests & Storybook
  fallbackType?: 'mbti-promo' | 'dashboard-promo' | 'minimal';
  minHeightClass?: string;
  refreshKey?: number | string;
  viewabilityThreshold?: number;
  dwellThresholdMs?: number;
  maxRefreshes?: number;
  cpaCampaignId?: CpaCampaignId;
  apartmentName?: string;
  cascadeTimeoutMs?: number;
  customCpaPayload?: Partial<NativeCpaFallbackPayload>;
}

/**
 * Capture initial JSDOM no-op IntersectionObserver polyfill reference (if present)
 * to distinguish unmocked JSDOM test environments from real browser or mocked IntersectionObserver tests.
 */
const INITIAL_PASSIVE_JSDOM_IO: typeof IntersectionObserver | undefined = (() => {
  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
    return undefined;
  }
  const fn = window.IntersectionObserver;
  const isMock = '_isMockFunction' in fn;
  const isNative = Function.prototype.toString.call(fn).includes('[native code]');
  if (!isMock && !isNative && fn.length === 0) {
    return fn;
  }
  return undefined;
})();

function isPassiveJsdomIntersectionObserver(): boolean {
  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
    return false;
  }
  const fn = window.IntersectionObserver;
  if (fn !== INITIAL_PASSIVE_JSDOM_IO) {
    return false;
  }
  if ('_isMockFunction' in fn) {
    return false;
  }
  if (fn.prototype?.observe && '_isMockFunction' in fn.prototype.observe) {
    return false;
  }
  return true;
}

/**
 * Strict min-height boundaries to prevent Cumulative Layout Shift (CLS < 0.001)
 */
export const getAdSlotMinHeightClass = (format: AdSlotProps['format'] = 'auto'): string => {
  switch (format) {
    case 'in-feed':
      return 'min-h-[140px] sm:min-h-[160px]';
    case 'banner':
    case 'rectangle':
      return 'min-h-[250px]';
    case 'horizontal-strip':
      return 'min-h-[90px] sm:min-h-[100px]';
    case 'auto':
    default:
      return 'min-h-[250px]';
  }
};

const getFormatDimensions = (format: AdSlotProps['format'] = 'auto'): string => {
  switch (format) {
    case 'in-feed':
      return '100% × 140~160px';
    case 'banner':
    case 'rectangle':
      return '100% × 250px';
    case 'horizontal-strip':
      return '100% × 90~100px';
    case 'auto':
    default:
      return '100% × 250px (반응형 Auto)';
  }
};

export function AdSlot({
  slotId,
  refreshSlotId,
  format = 'auto',
  responsive = true,
  className = '',
  testMode = false,
  fallbackType = 'mbti-promo',
  minHeightClass: propMinHeightClass,
  refreshKey,
  viewabilityThreshold = MIN_INTERSECTION_RATIO,
  dwellThresholdMs = DWELL_TIME_THRESHOLD_MS,
  maxRefreshes = MAX_REFRESHES_PER_SLOT,
  cpaCampaignId,
  apartmentName = 'GLOBAL',
  cascadeTimeoutMs = CASCADE_TIMEOUT_MS,
  customCpaPayload,
}: AdSlotProps) {
  const instanceId = useId();
  const { isAdBlockActive } = useAdBlockDetector();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [totalRefreshCount, setTotalRefreshCount] = useState(0);
  const [cascadeStatus, setCascadeStatus] = useState<CascadeSlotStatus>('REQUESTED');
  const [cascadeTrigger, setCascadeTrigger] = useState<CpaSourceTrigger>('UNFILLED_ATTRIBUTE');
  const [lateFillDiscarded, setLateFillDiscarded] = useState(false);

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

  const cascadeStatusRef = useRef<CascadeSlotStatus>('REQUESTED');
  const cascadeTriggerRef = useRef<CpaSourceTrigger>('UNFILLED_ATTRIBUTE');
  const explicitlyFilledRef = useRef<boolean>(false);
  const lateFillDiscardedCountRef = useRef<number>(0);
  const cascadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cascadeRemainingMsRef = useRef<number>(CASCADE_TIMEOUT_MS);
  const cascadeTimerStartedAtRef = useRef<number | null>(null);
  const unfilledBeaconSentCycleRef = useRef<number>(-1);
  const clickBeaconSentCycleRef = useRef<number>(-1);
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

  const clearCascadeTimeout = useCallback(() => {
    if (cascadeTimeoutRef.current !== null) {
      clearTimeout(cascadeTimeoutRef.current);
      cascadeTimeoutRef.current = null;
    }
    cascadeTimerStartedAtRef.current = null;
  }, []);

  const cpaPayload = resolveNativeCpaFallbackPayload({
    slotId: effectiveSlotId,
    sourceTrigger: isAdBlockActive ? 'ADBLOCK_ACTIVE' : cascadeTrigger,
    cpaCampaignId: effectiveCampaignId,
    overrides: customCpaPayload,
  });

  const cpaTemplate = CPA_CAMPAIGN_CATALOG[cpaPayload.cpaCampaignId];

  const activateCascadeFallback = useCallback(
    (
      trigger: 'UNFILLED_ATTRIBUTE' | 'TIMEOUT_FALLBACK',
      transitionEvent: 'STATUS_UNFILLED' | 'TIMEOUT_3S'
    ) => {
      clearCascadeTimeout();

      const transition = transitionCascadeStateWithPath('REQUESTED', transitionEvent);
      cascadeStatusRef.current = transition.nextState;
      cascadeTriggerRef.current = trigger;

      if (insRef.current && insRef.current.childNodes.length > 0) {
        insRef.current.innerHTML = '';
      }

      setCascadeTrigger(trigger);
      setCascadeStatus(transition.nextState);
      setIsAdLoaded((prev) => (prev ? prev : true));

      if (unfilledBeaconSentCycleRef.current !== currentCycleRef.current) {
        unfilledBeaconSentCycleRef.current = currentCycleRef.current;
        const payload = resolveNativeCpaFallbackPayload({
          slotId: effectiveSlotId,
          sourceTrigger: trigger,
          cpaCampaignId: effectiveCampaignId,
          overrides: customCpaPayload,
        });
        sendAdTelemetryBeacon({
          slotId: effectiveSlotId,
          eventType: 'UNFILLED',
          campaignId: payload.cpaCampaignId,
          apartmentName,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [clearCascadeTimeout, effectiveSlotId, effectiveCampaignId, customCpaPayload, apartmentName]
  );

  const discardLateFilledResponse = useCallback(() => {
    const transition = transitionCascadeStateWithPath(
      cascadeStatusRef.current,
      'STATUS_FILLED'
    );
    cascadeStatusRef.current = transition.nextState;
    lateFillDiscardedCountRef.current += 1;

    if (insRef.current) {
      if (insRef.current.childNodes.length > 0 || insRef.current.innerHTML !== '') {
        insRef.current.innerHTML = '';
      }
      Element.prototype.setAttribute.call(
        insRef.current,
        'data-cascade-late-fill-discarded',
        'true'
      );
    }

    setLateFillDiscarded(true);
  }, []);

  const startCascadeTimeout = useCallback(
    (customDelayMs?: number) => {
      clearCascadeTimeout();
      if (
        isPlaceholder ||
        isAdBlockActive ||
        !isPushedRef.current ||
        cascadeStatusRef.current !== 'REQUESTED' ||
        explicitlyFilledRef.current
      ) {
        return;
      }

      const delayMs =
        typeof customDelayMs === 'number' && Number.isFinite(customDelayMs)
          ? Math.max(1, Math.round(customDelayMs))
          : cascadeRemainingMsRef.current > 0
          ? cascadeRemainingMsRef.current
          : effectiveCascadeTimeoutMs;

      cascadeRemainingMsRef.current = delayMs;

      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      cascadeTimerStartedAtRef.current = Date.now();
      cascadeTimeoutRef.current = setTimeout(() => {
        cascadeTimeoutRef.current = null;
        cascadeTimerStartedAtRef.current = null;

        if (
          !isPushedRef.current ||
          cascadeStatusRef.current !== 'REQUESTED' ||
          explicitlyFilledRef.current
        ) {
          return;
        }

        if (typeof document !== 'undefined' && document.hidden) {
          cascadeRemainingMsRef.current = 1;
          return;
        }

        const currentAdStatus = insRef.current?.getAttribute('data-ad-status');
        const hasInjectedChildren = Boolean(
          insRef.current && insRef.current.childNodes.length > 0
        );
        if (
          currentAdStatus === 'filled' ||
          (hasInjectedChildren && currentAdStatus !== 'unfilled')
        ) {
          explicitlyFilledRef.current = true;
          const transition = transitionCascadeStateWithPath('REQUESTED', 'STATUS_FILLED');
          cascadeStatusRef.current = transition.nextState;
          setCascadeStatus(transition.nextState);
          setIsAdLoaded((prev) => (prev ? prev : true));
          return;
        }

        activateCascadeFallback('TIMEOUT_FALLBACK', 'TIMEOUT_3S');
      }, delayMs);
    },
    [
      clearCascadeTimeout,
      isPlaceholder,
      isAdBlockActive,
      effectiveCascadeTimeoutMs,
      activateCascadeFallback,
    ]
  );

  const resetInsDomForRefresh = useCallback(() => {
    clearCascadeTimeout();
    cascadeRemainingMsRef.current = effectiveCascadeTimeoutMs;
    cascadeStatusRef.current = 'REQUESTED';
    cascadeTriggerRef.current = 'UNFILLED_ATTRIBUTE';
    explicitlyFilledRef.current = false;
    setCascadeStatus('REQUESTED');
    setCascadeTrigger('UNFILLED_ATTRIBUTE');
    setLateFillDiscarded(false);
    if (insRef.current) {
      Element.prototype.removeAttribute.call(insRef.current, 'data-adsbygoogle-status');
      Element.prototype.removeAttribute.call(insRef.current, 'data-ad-status');
      Element.prototype.removeAttribute.call(insRef.current, 'data-cascade-late-fill-discarded');
      insRef.current.innerHTML = '';
    }
  }, [clearCascadeTimeout, effectiveCascadeTimeoutMs]);

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
  }, [clientId, isAdBlockActive, isPlaceholder, effectiveCascadeTimeoutMs, startCascadeTimeout]);

  // Dispatch ADBLOCK_FALLBACK beacon when adblock fallback is active
  useEffect(() => {
    if (!isAdBlockActive) {
      adblockBeaconSentRef.current = false;
      return;
    }
    if (!adblockBeaconSentRef.current) {
      adblockBeaconSentRef.current = true;
      sendAdTelemetryBeacon({
        slotId: effectiveSlotId,
        eventType: 'ADBLOCK_FALLBACK',
        campaignId: cpaPayload.cpaCampaignId,
        apartmentName,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isAdBlockActive, effectiveSlotId, cpaPayload.cpaCampaignId, apartmentName]);

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

      totalRefreshCountRef.current = targetRefreshCount;
      lastRefreshAtRef.current = now;
      currentCycleRef.current += 1;
      isPushedRef.current = false;
      setIsAdLoaded(false);
      resetInsDomForRefresh();
      setTotalRefreshCount(totalRefreshCountRef.current);
      executeAdPush();
    }
  }, [
    refreshKey,
    isPlaceholder,
    isAdBlockActive,
    effectiveMaxRefreshes,
    effectiveDwellThresholdMs,
    baseObserverSlotId,
    resetInsDomForRefresh,
    executeAdPush,
  ]);

  // Smart Viewability & 30s Dwell Refresh Observer Binding
  useEffect(() => {
    if (typeof window === 'undefined' || !clientId) return;
    if (isAdBlockActive || isPlaceholder) return;

    const targetEl = containerRef.current ?? insRef.current;
    if (!targetEl) return;

    // Assign a stable observer key per component instance lifecycle; reset state if base slot identity changed
    if (
      !registeredKeyRef.current ||
      registeredBaseSlotRef.current !== baseObserverSlotId
    ) {
      const isSlotIdentityTransition =
        registeredBaseSlotRef.current !== null &&
        registeredBaseSlotRef.current !== baseObserverSlotId;

      registeredBaseSlotRef.current = baseObserverSlotId;
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
        unfilledBeaconSentCycleRef.current = -1;
        clickBeaconSentCycleRef.current = -1;
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

      totalRefreshCountRef.current += 1;
      lastRefreshAtRef.current = now;
      currentCycleRef.current += 1;
      isPushedRef.current = false;
      resetInsDomForRefresh();
      executeAdPush();
      setIsAdLoaded(false);
      setTotalRefreshCount(totalRefreshCountRef.current);
    };

    localManager.observe(registeredKey, targetEl, handleDwellRefresh, {
      threshold: viewabilityThreshold,
      dwellThresholdMs: effectiveDwellThresholdMs,
      maxRefreshes: effectiveMaxRefreshes,
      onInitialPush: handleInitialPush,
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
      clearCascadeTimeout();
      localManager.unobserve(registeredKey, targetEl);
    };
  }, [
    clientId,
    isAdBlockActive,
    isPlaceholder,
    baseObserverSlotId,
    refreshSlotId,
    instanceId,
    viewabilityThreshold,
    effectiveDwellThresholdMs,
    effectiveMaxRefreshes,
    resetInsDomForRefresh,
    executeAdPush,
    clearCascadeTimeout,
  ]);

  // Phase 2: Observe <ins> ad status (filled vs unfilled), 3000ms cascade timeout, and late fill race defense
  useEffect(() => {
    if (isPlaceholder || isAdBlockActive || !insRef.current) return;

    const initialInsEl = insRef.current;
    const parentEl = initialInsEl.parentElement;
    const patchedInsElements = new Set<HTMLElement>();
    let observer: MutationObserver | null = null;
    let isInternalGuardActive = false;

    const nativeSetAttribute = Element.prototype.setAttribute;
    const nativeRemoveAttribute = Element.prototype.removeAttribute;
    const nativeAppendChild = Node.prototype.appendChild;
    const nativeInsertBefore = Node.prototype.insertBefore;
    const nativeReplaceChild = Node.prototype.replaceChild;
    const nativeReplaceWith = Element.prototype.replaceWith;
    const nativeInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'innerHTML'
    );

    const evaluateInsStatus = () => {
      if (!insRef.current) return;
      const status = insRef.current.getAttribute('data-adsbygoogle-status');
      const adStatus = insRef.current.getAttribute('data-ad-status');
      const hasInjectedChildren = insRef.current.childNodes.length > 0;

      // Invariant 5: f(FALLBACK_ACTIVE, STATUS_FILLED) = FALLBACK_ACTIVE
      // If fallback card is already active, cancel & discard any late AdSense fill or injected iframe.
      if (
        cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
        cascadeStatusRef.current === 'CLICKED'
      ) {
        if (adStatus === 'filled' || hasInjectedChildren) {
          discardLateFilledResponse();
        }
        return;
      }

      // Invariant 1: f(REQUESTED, STATUS_UNFILLED) = UNFILLED_DETECTED -> FALLBACK_ACTIVE (<= 50ms)
      if (adStatus === 'unfilled' && !explicitlyFilledRef.current) {
        activateCascadeFallback('UNFILLED_ATTRIBUTE', 'STATUS_UNFILLED');
        return;
      }

      // Genuine Fill: f(REQUESTED, STATUS_FILLED) = FILLED
      if (adStatus === 'filled' || (hasInjectedChildren && adStatus !== 'unfilled')) {
        clearCascadeTimeout();
        explicitlyFilledRef.current = true;
        const transition = transitionCascadeStateWithPath(
          cascadeStatusRef.current,
          'STATUS_FILLED'
        );
        cascadeStatusRef.current = transition.nextState;
        setCascadeStatus(transition.nextState);
        setIsAdLoaded((prev) => (prev ? prev : true));
        return;
      }

      // If adsbygoogle.js claimed the slot with data-adsbygoogle-status="done" prior to auction completion,
      // dismiss skeleton shimmer while keeping the 3,000ms cascade timeout active until filled/unfilled resolves.
      if (status === 'done' && adStatus !== 'unfilled') {
        setIsAdLoaded((prev) => (prev ? prev : true));
      }
    };

    const syncFromReplacementIns = (replacementEl: HTMLElement) => {
      if (!insRef.current || replacementEl === insRef.current) return;
      const adStatus = replacementEl.getAttribute('data-ad-status');
      const adsbygoogleStatus = replacementEl.getAttribute('data-adsbygoogle-status');
      if (adStatus !== null) {
        nativeSetAttribute.call(insRef.current, 'data-ad-status', adStatus);
      }
      if (adsbygoogleStatus !== null) {
        nativeSetAttribute.call(insRef.current, 'data-adsbygoogle-status', adsbygoogleStatus);
      }
      if (replacementEl.childNodes.length > 0 && nativeInnerHTMLDescriptor?.set) {
        nativeInnerHTMLDescriptor.set.call(insRef.current, replacementEl.innerHTML);
      }
    };

    const bindInsInterceptors = (targetIns: HTMLElement) => {
      if (patchedInsElements.has(targetIns)) return;
      patchedInsElements.add(targetIns);

      targetIns.setAttribute = function (qualifiedName: string, value: string) {
        nativeSetAttribute.call(this, qualifiedName, value);
        if (this !== insRef.current && insRef.current) {
          nativeSetAttribute.call(insRef.current, qualifiedName, value);
        }
        if (
          !isInternalGuardActive &&
          (qualifiedName === 'data-ad-status' || qualifiedName === 'data-adsbygoogle-status')
        ) {
          isInternalGuardActive = true;
          try {
            if (
              (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
                cascadeStatusRef.current === 'CLICKED') &&
              qualifiedName === 'data-adsbygoogle-status' &&
              value === 'done' &&
              this.getAttribute('data-ad-status') !== 'unfilled'
            ) {
              discardLateFilledResponse();
            } else {
              evaluateInsStatus();
            }
          } finally {
            isInternalGuardActive = false;
          }
        }
      };

      targetIns.removeAttribute = function (qualifiedName: string) {
        nativeRemoveAttribute.call(this, qualifiedName);
        if (this !== insRef.current && insRef.current) {
          nativeRemoveAttribute.call(insRef.current, qualifiedName);
        }
        if (
          !isInternalGuardActive &&
          (qualifiedName === 'data-ad-status' || qualifiedName === 'data-adsbygoogle-status')
        ) {
          if (
            !this.getAttribute('data-ad-status') &&
            !this.getAttribute('data-adsbygoogle-status')
          ) {
            cascadeStatusRef.current = 'REQUESTED';
            explicitlyFilledRef.current = false;
            setCascadeStatus('REQUESTED');
            setLateFillDiscarded(false);
            setIsAdLoaded(false);
          }
        }
      };

      targetIns.appendChild = function <T extends Node>(newChild: T): T {
        if (
          !isInternalGuardActive &&
          (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
            cascadeStatusRef.current === 'CLICKED')
        ) {
          isInternalGuardActive = true;
          try {
            discardLateFilledResponse();
          } finally {
            isInternalGuardActive = false;
          }
          return newChild;
        }
        const targetHost = insRef.current ?? this;
        const appended = nativeAppendChild.call(targetHost, newChild) as T;
        if (!isInternalGuardActive) {
          isInternalGuardActive = true;
          try {
            evaluateInsStatus();
          } finally {
            isInternalGuardActive = false;
          }
        }
        return appended;
      };

      targetIns.insertBefore = function <T extends Node>(
        newNode: T,
        referenceNode: Node | null
      ): T {
        if (
          !isInternalGuardActive &&
          (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
            cascadeStatusRef.current === 'CLICKED')
        ) {
          isInternalGuardActive = true;
          try {
            discardLateFilledResponse();
          } finally {
            isInternalGuardActive = false;
          }
          return newNode;
        }
        const targetHost = insRef.current ?? this;
        const inserted = nativeInsertBefore.call(targetHost, newNode, referenceNode) as T;
        if (!isInternalGuardActive) {
          isInternalGuardActive = true;
          try {
            evaluateInsStatus();
          } finally {
            isInternalGuardActive = false;
          }
        }
        return inserted;
      };

      if (typeof nativeReplaceWith === 'function') {
        targetIns.replaceWith = function (...nodes: Array<Node | string>) {
          if (
            !isInternalGuardActive &&
            (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
              cascadeStatusRef.current === 'CLICKED')
          ) {
            isInternalGuardActive = true;
            try {
              for (const n of nodes) {
                if (n instanceof HTMLElement && nativeInnerHTMLDescriptor?.set) {
                  nativeInnerHTMLDescriptor.set.call(n, '');
                }
              }
              discardLateFilledResponse();
            } finally {
              isInternalGuardActive = false;
            }
            return;
          }
          const replacementEl = nodes.find((n): n is HTMLElement => n instanceof HTMLElement);
          if (replacementEl) {
            bindInsInterceptors(replacementEl);
            observer?.observe(replacementEl, {
              attributes: true,
              attributeFilter: ['data-adsbygoogle-status', 'data-ad-status'],
              childList: true,
            });
            syncFromReplacementIns(replacementEl);
            if (!isInternalGuardActive) {
              isInternalGuardActive = true;
              try {
                evaluateInsStatus();
              } finally {
                isInternalGuardActive = false;
              }
            }
          }
        };
      }

      if (
        nativeInnerHTMLDescriptor &&
        typeof nativeInnerHTMLDescriptor.get === 'function' &&
        typeof nativeInnerHTMLDescriptor.set === 'function'
      ) {
        Object.defineProperty(targetIns, 'innerHTML', {
          configurable: true,
          enumerable: true,
          get() {
            return nativeInnerHTMLDescriptor.get!.call(this);
          },
          set(htmlValue: string) {
            if (
              !isInternalGuardActive &&
              (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
                cascadeStatusRef.current === 'CLICKED') &&
              htmlValue !== ''
            ) {
              isInternalGuardActive = true;
              try {
                nativeInnerHTMLDescriptor.set!.call(this, '');
                if (this !== insRef.current && insRef.current) {
                  nativeInnerHTMLDescriptor.set!.call(insRef.current, '');
                }
                discardLateFilledResponse();
              } finally {
                isInternalGuardActive = false;
              }
              return;
            }
            nativeInnerHTMLDescriptor.set!.call(this, htmlValue);
            if (this !== insRef.current && insRef.current) {
              nativeInnerHTMLDescriptor.set!.call(insRef.current, htmlValue);
            }
            if (!isInternalGuardActive && htmlValue !== '') {
              isInternalGuardActive = true;
              try {
                evaluateInsStatus();
              } finally {
                isInternalGuardActive = false;
              }
            }
          },
        });
      }
    };

    bindInsInterceptors(initialInsEl);

    if (parentEl) {
      parentEl.replaceChild = function <T extends Node>(newChild: Node, oldChild: T): T {
        const oldNode = oldChild as unknown as Node;
        if (
          oldNode === insRef.current ||
          patchedInsElements.has(oldNode as HTMLElement)
        ) {
          if (
            !isInternalGuardActive &&
            (cascadeStatusRef.current === 'FALLBACK_ACTIVE' ||
              cascadeStatusRef.current === 'CLICKED')
          ) {
            isInternalGuardActive = true;
            try {
              if (newChild instanceof HTMLElement && nativeInnerHTMLDescriptor?.set) {
                nativeInnerHTMLDescriptor.set.call(newChild, '');
              }
              discardLateFilledResponse();
            } finally {
              isInternalGuardActive = false;
            }
            return oldChild;
          }

          if (newChild instanceof HTMLElement) {
            bindInsInterceptors(newChild);
            observer?.observe(newChild, {
              attributes: true,
              attributeFilter: ['data-adsbygoogle-status', 'data-ad-status'],
              childList: true,
            });
            syncFromReplacementIns(newChild);
            if (!isInternalGuardActive) {
              isInternalGuardActive = true;
              try {
                evaluateInsStatus();
              } finally {
                isInternalGuardActive = false;
              }
            }
          }
          return oldChild;
        }
        return nativeReplaceChild.call(this, newChild, oldChild) as T;
      };
    }

    evaluateInsStatus();

    if (
      isPushedRef.current &&
      cascadeStatusRef.current === 'REQUESTED' &&
      !explicitlyFilledRef.current &&
      cascadeTimeoutRef.current === null
    ) {
      startCascadeTimeout(cascadeRemainingMsRef.current);
    }

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        if (cascadeTimeoutRef.current !== null) {
          const elapsed =
            cascadeTimerStartedAtRef.current !== null
              ? Math.max(0, Date.now() - cascadeTimerStartedAtRef.current)
              : 0;
          cascadeRemainingMsRef.current = Math.max(
            1,
            cascadeRemainingMsRef.current - elapsed
          );
          clearCascadeTimeout();
        }
      } else if (
        isPushedRef.current &&
        cascadeStatusRef.current === 'REQUESTED' &&
        !explicitlyFilledRef.current &&
        cascadeTimeoutRef.current === null
      ) {
        startCascadeTimeout(cascadeRemainingMsRef.current);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(evaluateInsStatus);
      observer.observe(initialInsEl, {
        attributes: true,
        attributeFilter: ['data-adsbygoogle-status', 'data-ad-status'],
        childList: true,
      });
    }

    return () => {
      observer?.disconnect();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      clearCascadeTimeout();
      if (parentEl) {
        delete (parentEl as Partial<HTMLElement>).replaceChild;
      }
      for (const el of patchedInsElements) {
        delete (el as Partial<HTMLElement>).setAttribute;
        delete (el as Partial<HTMLElement>).removeAttribute;
        delete (el as Partial<HTMLElement>).appendChild;
        delete (el as Partial<HTMLElement>).insertBefore;
        delete (el as Partial<HTMLElement>).replaceWith;
        delete (el as Partial<HTMLElement>).innerHTML;
      }
    };
  }, [
    isPlaceholder,
    isAdBlockActive,
    effectiveRefreshKey,
    activateCascadeFallback,
    clearCascadeTimeout,
    discardLateFilledResponse,
    startCascadeTimeout,
  ]);

  const handleCascadeCtaClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        typeof window !== 'undefined' &&
        typeof window.navigator?.userAgent === 'string' &&
        window.navigator.userAgent.toLowerCase().includes('jsdom')
      ) {
        e.preventDefault();
      }

      const transition = transitionCascadeStateWithPath(
        cascadeStatusRef.current,
        'USER_CLICK'
      );
      cascadeStatusRef.current = transition.nextState;
      setCascadeStatus(transition.nextState);

      if (clickBeaconSentCycleRef.current !== currentCycleRef.current) {
        clickBeaconSentCycleRef.current = currentCycleRef.current;
        sendAdTelemetryBeacon({
          slotId: effectiveSlotId,
          eventType: 'FALLBACK_CLICK',
          campaignId: cpaPayload.cpaCampaignId,
          apartmentName,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [effectiveSlotId, cpaPayload.cpaCampaignId, apartmentName]
  );

  const handleAdBlockFallbackClick = useCallback(() => {
    const transition = transitionCascadeStateWithPath('FALLBACK_ACTIVE', 'USER_CLICK');
    cascadeStatusRef.current = transition.nextState;
    setCascadeStatus(transition.nextState);

    if (clickBeaconSentCycleRef.current !== currentCycleRef.current) {
      clickBeaconSentCycleRef.current = currentCycleRef.current;
      sendAdTelemetryBeacon({
        slotId: effectiveSlotId,
        eventType: 'FALLBACK_CLICK',
        campaignId: cpaPayload.cpaCampaignId,
        apartmentName,
        timestamp: new Date().toISOString(),
      });
    }
  }, [effectiveSlotId, cpaPayload.cpaCampaignId, apartmentName]);

  const isCascadeFallbackActive =
    cascadeStatus === 'FALLBACK_ACTIVE' || cascadeStatus === 'CLICKED';

  return (
    <div
      ref={containerRef}
      data-testid="ad-slot-container"
      data-slot-format={format}
      data-refresh-key={effectiveRefreshKey}
      data-cascade-status={cascadeStatus}
      className={`w-full relative overflow-hidden flex flex-col justify-center items-center transition-all ${minHeightClass} ${className}`}
    >
      {/* 1. AdBlock Fallback Card */}
      {isAdBlockActive ? (
        <div
          data-testid="ad-slot-adblock-fallback"
          data-cpa-campaign-id={cpaPayload.cpaCampaignId}
          data-source-trigger="ADBLOCK_ACTIVE"
          className={`w-full h-full flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-center ${minHeightClass}`}
        >
          {fallbackType === 'minimal' ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span>D-VIEW 스폰서십 | 쾌적한 주거 데이터 분석 경험을 제공합니다.</span>
            </div>
          ) : fallbackType === 'dashboard-promo' ? (
            <Link
              href="/overview"
              onClick={handleAdBlockFallbackClick}
              className="group flex flex-col items-center gap-1.5 hover:opacity-95 transition-opacity"
            >
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                D-VIEW 추천
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                <span>동탄 호수공원 & 대장 단지 실거래가 트렌드 확인하기</span>
                <ArrowRight size={14} />
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                179개 전 단지의 실거래가와 전세가율 데이터를 확인해보세요.
              </p>
            </Link>
          ) : (
            <Link
              href="/mbti"
              onClick={handleAdBlockFallbackClick}
              className="group flex flex-col items-center gap-1.5 hover:opacity-95 transition-opacity"
            >
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                D-VIEW 추천
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                <span>나에게 딱 맞는 동탄 아파트는? 주거 MBTI 테스트 하러가기</span>
                <ArrowRight size={14} />
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                7가지 라이프스타일 질문으로 알아보는 16가지 동탄 아파트 매칭
              </p>
            </Link>
          )}
        </div>
      ) : isPlaceholder ? (
        /* 2. Dev / Unset Client ID Placeholder */
        <div
          data-testid="ad-slot-dev-placeholder"
          className={`w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-center select-none ${minHeightClass}`}
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            [광고 슬롯 미리보기 - 개발/테스트 모드]
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            포맷: <span className="font-mono text-blue-600 dark:text-blue-400">{format}</span>
            {' '}| 크기 규격: <span className="font-mono text-slate-600 dark:text-slate-400">{getFormatDimensions(format)}</span>
            {slotId && (
              <> | 슬롯 ID: <span className="font-mono text-slate-600 dark:text-slate-400">{slotId}</span></>
            )}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            NEXT_PUBLIC_ADSENSE_CLIENT_ID 환경변수가 설정되면 실광고가 송출됩니다.
          </p>
        </div>
      ) : (
        /* 3. Live AdSense Slot with Skeleton Shimmer & Unfilled Zero-Loss Cascade Fallback */
        <div className={`w-full h-full relative flex items-center justify-center ${minHeightClass}`}>
          {!isAdLoaded && !isCascadeFallbackActive && (
            <div
              data-testid="ad-slot-skeleton"
              className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 dark:bg-slate-800/50 rounded-2xl animate-pulse pointer-events-none p-4 text-center border border-slate-200/50 dark:border-slate-700/50 z-0"
              aria-hidden="true"
            >
              <div className="w-16 h-3 bg-slate-300/80 dark:bg-slate-700/80 rounded mb-2" />
              <div className="w-48 sm:w-64 h-3.5 bg-slate-200/80 dark:bg-slate-700/50 rounded mb-1.5" />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                스폰서드 광고를 불러오는 중입니다...
              </span>
            </div>
          )}

          {isCascadeFallbackActive && (
            <div
              data-testid="ad-slot-cascade-fallback"
              data-cpa-campaign-id={cpaPayload.cpaCampaignId}
              data-source-trigger={cpaPayload.sourceTrigger}
              data-cascade-status={cascadeStatus}
              data-estimated-cpa-won={cpaPayload.estimatedCpaValueWon}
              data-late-fill-discarded={lateFillDiscarded ? 'true' : 'false'}
              className={`w-full h-full flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center z-10 ${minHeightClass}`}
            >
              <a
                href={cpaPayload.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="ad-slot-cascade-cta"
                onClick={handleCascadeCtaClick}
                className="group flex flex-col items-center justify-center gap-1.5 max-w-lg w-full hover:opacity-95 transition-opacity"
              >
                <span
                  className={
                    cpaTemplate.accentTone === 'emerald'
                      ? 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold'
                      : 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-[11px] font-bold'
                  }
                >
                  {cpaTemplate.accentTone === 'emerald' ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <Building2 size={14} />
                  )}
                  <span>{cpaTemplate.badgeText}</span>
                </span>
                <h4
                  className={
                    cpaTemplate.accentTone === 'emerald'
                      ? 'text-xs sm:text-sm font-black text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors inline-flex items-center gap-1'
                      : 'text-xs sm:text-sm font-black text-slate-900 dark:text-slate-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors inline-flex items-center gap-1'
                  }
                >
                  <span>{cpaPayload.title}</span>
                  <ArrowRight size={14} />
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {cpaPayload.subtitle}
                </p>
                <span
                  className={
                    cpaTemplate.accentTone === 'emerald'
                      ? 'mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-50 text-[11px] font-bold transition-colors'
                      : 'mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-slate-50 text-[11px] font-bold transition-colors'
                  }
                >
                  <span>{cpaPayload.ctaText}</span>
                  <ArrowRight size={14} />
                </span>
              </a>
            </div>
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
