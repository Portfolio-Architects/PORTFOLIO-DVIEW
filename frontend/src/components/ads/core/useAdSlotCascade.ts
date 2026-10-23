'use client';

import { useState, useRef, useCallback } from 'react';
import {
  CASCADE_TIMEOUT_MS,
  type CascadeSlotStatus,
  type CpaSourceTrigger,
  type CpaCampaignId,
  type NativeCpaFallbackPayload,
  transitionCascadeStateWithPath,
  resolveNativeCpaFallbackPayload,
  sendTelemetry,
} from '@/lib/ads/cascadeFallback';

export interface UseAdSlotCascadeParams {
  insRef: React.RefObject<HTMLModElement | null>;
  isPlaceholder: boolean;
  isAdBlockActive: boolean;
  isPushedRef: React.MutableRefObject<boolean>;
  currentCycleRef: React.MutableRefObject<number>;
  effectiveCascadeTimeoutMs: number;
  effectiveSlotId: string;
  effectiveCampaignId: CpaCampaignId;
  customCpaPayload?: Partial<NativeCpaFallbackPayload>;
  apartmentName: string;
  dong: string;
  getSlotTelemetryMetrics: (minimumDwellMs?: number) => {
    dwellTimeMs: number;
    intersectionRatio: number;
  };
  setIsAdLoaded: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseAdSlotCascadeReturn {
  cascadeStatus: CascadeSlotStatus;
  setCascadeStatus: React.Dispatch<React.SetStateAction<CascadeSlotStatus>>;
  cascadeTrigger: CpaSourceTrigger;
  setCascadeTrigger: React.Dispatch<React.SetStateAction<CpaSourceTrigger>>;
  lateFillDiscarded: boolean;
  setLateFillDiscarded: React.Dispatch<React.SetStateAction<boolean>>;
  cascadeStatusRef: React.MutableRefObject<CascadeSlotStatus>;
  cascadeTriggerRef: React.MutableRefObject<CpaSourceTrigger>;
  explicitlyFilledRef: React.MutableRefObject<boolean>;
  lateFillDiscardedCountRef: React.MutableRefObject<number>;
  cascadeTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  cascadeRemainingMsRef: React.MutableRefObject<number>;
  cascadeTimerStartedAtRef: React.MutableRefObject<number | null>;
  unfilledBeaconSentCycleRef: React.MutableRefObject<number>;
  clickBeaconSentCycleRef: React.MutableRefObject<number>;
  clearCascadeTimeout: () => void;
  activateCascadeFallback: (
    trigger: 'UNFILLED_ATTRIBUTE' | 'TIMEOUT_FALLBACK',
    transitionEvent: 'STATUS_UNFILLED' | 'TIMEOUT_3S'
  ) => void;
  discardLateFilledResponse: () => void;
  startCascadeTimeout: (customDelayMs?: number) => void;
  resetInsDomForRefresh: () => void;
  handleCascadeCtaClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  handleAdBlockFallbackClick: () => void;
  isCascadeFallbackActive: boolean;
}

export function useAdSlotCascade({
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
}: UseAdSlotCascadeParams): UseAdSlotCascadeReturn {
  const [cascadeStatus, setCascadeStatus] = useState<CascadeSlotStatus>('REQUESTED');
  const [cascadeTrigger, setCascadeTrigger] = useState<CpaSourceTrigger>('UNFILLED_ATTRIBUTE');
  const [lateFillDiscarded, setLateFillDiscarded] = useState(false);

  const cascadeStatusRef = useRef<CascadeSlotStatus>('REQUESTED');
  const cascadeTriggerRef = useRef<CpaSourceTrigger>('UNFILLED_ATTRIBUTE');
  const explicitlyFilledRef = useRef<boolean>(false);
  const lateFillDiscardedCountRef = useRef<number>(0);
  const cascadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cascadeRemainingMsRef = useRef<number>(CASCADE_TIMEOUT_MS);
  const cascadeTimerStartedAtRef = useRef<number | null>(null);
  const unfilledBeaconSentCycleRef = useRef<number>(-1);
  const clickBeaconSentCycleRef = useRef<number>(-1);

  const clearCascadeTimeout = useCallback(() => {
    if (cascadeTimeoutRef.current !== null) {
      clearTimeout(cascadeTimeoutRef.current);
      cascadeTimeoutRef.current = null;
    }
    cascadeTimerStartedAtRef.current = null;
  }, []);

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
        const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(0);
        sendTelemetry({
          slotId: effectiveSlotId,
          eventType: 'UNFILLED',
          campaignId: payload.cpaCampaignId,
          apartmentName,
          dong,
          dwellTimeMs,
          intersectionRatio,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [
      clearCascadeTimeout,
      insRef,
      effectiveSlotId,
      effectiveCampaignId,
      customCpaPayload,
      apartmentName,
      dong,
      getSlotTelemetryMetrics,
      setIsAdLoaded,
      currentCycleRef,
    ]
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
  }, [insRef]);

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
      isPushedRef,
      effectiveCascadeTimeoutMs,
      activateCascadeFallback,
      insRef,
      setIsAdLoaded,
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
  }, [clearCascadeTimeout, effectiveCascadeTimeoutMs, insRef]);

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
        const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(0);
        sendTelemetry({
          slotId: effectiveSlotId,
          eventType: 'FALLBACK_CLICK',
          campaignId: effectiveCampaignId,
          apartmentName,
          dong,
          dwellTimeMs,
          intersectionRatio,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [
      effectiveSlotId,
      effectiveCampaignId,
      apartmentName,
      dong,
      getSlotTelemetryMetrics,
      currentCycleRef,
    ]
  );

  const handleAdBlockFallbackClick = useCallback(
    (e?: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        e &&
        typeof window !== 'undefined' &&
        typeof window.navigator?.userAgent === 'string' &&
        window.navigator.userAgent.toLowerCase().includes('jsdom')
      ) {
        e.preventDefault();
      }

      const transition = transitionCascadeStateWithPath('FALLBACK_ACTIVE', 'USER_CLICK');
    cascadeStatusRef.current = transition.nextState;
    setCascadeStatus(transition.nextState);

    if (clickBeaconSentCycleRef.current !== currentCycleRef.current) {
      clickBeaconSentCycleRef.current = currentCycleRef.current;
      const { dwellTimeMs, intersectionRatio } = getSlotTelemetryMetrics(0);
      sendTelemetry({
        slotId: effectiveSlotId,
        eventType: 'FALLBACK_CLICK',
        campaignId: effectiveCampaignId,
        apartmentName,
        dong,
        dwellTimeMs,
        intersectionRatio,
        timestamp: new Date().toISOString(),
      });
    }
  }, [
    effectiveSlotId,
    effectiveCampaignId,
    apartmentName,
    dong,
    getSlotTelemetryMetrics,
    currentCycleRef,
  ]);

  const isCascadeFallbackActive =
    cascadeStatus === 'FALLBACK_ACTIVE' || cascadeStatus === 'CLICKED';

  return {
    cascadeStatus,
    setCascadeStatus,
    cascadeTrigger,
    setCascadeTrigger,
    lateFillDiscarded,
    setLateFillDiscarded,
    cascadeStatusRef,
    cascadeTriggerRef,
    explicitlyFilledRef,
    lateFillDiscardedCountRef,
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
  };
}
