'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';
import { logger } from '@/lib/services/logger';

export interface AdSlotProps {
  slotId?: string; // AdSense ad unit ID (e.g., "1234567890")
  format?: 'in-feed' | 'banner' | 'rectangle' | 'horizontal-strip' | 'auto';
  responsive?: boolean;
  className?: string;
  testMode?: boolean; // Force mock rendering for snapshot tests & Storybook
  fallbackType?: 'mbti-promo' | 'dashboard-promo' | 'minimal';
}

/**
 * Strict min-height boundaries to prevent Cumulative Layout Shift (CLS < 0.01)
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
  format = 'auto',
  responsive = true,
  className = '',
  testMode = false,
  fallbackType = 'mbti-promo',
}: AdSlotProps) {
  const { isAdBlockActive } = useAdBlockDetector();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const isPushedRef = useRef(false);
  const insRef = useRef<HTMLModElement | null>(null);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const isDev = process.env.NODE_ENV === 'development';
  const isPlaceholder = Boolean(testMode || !clientId || (isDev && !testMode));

  const minHeightClass = getAdSlotMinHeightClass(format);

  const defaultSlotId =
    (format === 'in-feed'
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOUNGE_DETAIL
      : format === 'banner'
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_APT_MODAL
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM) ||
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM ||
    '6782594447';

  const effectiveSlotId = slotId || defaultSlotId;

  // Next.js SPA router double-push safety
  useEffect(() => {
    if (isPushedRef.current) return;
    if (typeof window === 'undefined' || !clientId) return;
    if (isAdBlockActive || isPlaceholder) return;

    try {
      if (insRef.current && !insRef.current.getAttribute('data-adsbygoogle-status')) {
        const win = window as unknown as {
          adsbygoogle?: Array<Record<string, unknown>> | { push?: (...args: unknown[]) => void };
        };
        if (Array.isArray(win.adsbygoogle)) {
          win.adsbygoogle.push({});
          isPushedRef.current = true;
        } else if (win.adsbygoogle && typeof win.adsbygoogle.push === 'function') {
          win.adsbygoogle.push({});
          isPushedRef.current = true;
        } else {
          win.adsbygoogle = [{}];
          isPushedRef.current = true;
        }
      }
    } catch (err) {
      logger.warn('AdSlot', 'AdSense push warning', undefined, err as Error);
    }
  }, [clientId, isAdBlockActive, isPlaceholder]);

  // Observe ad load status to gracefully dismiss skeleton
  useEffect(() => {
    if (isPlaceholder || isAdBlockActive || !insRef.current) return;

    const checkLoaded = () => {
      const status = insRef.current?.getAttribute('data-adsbygoogle-status');
      const adStatus = insRef.current?.getAttribute('data-ad-status');
      if (status === 'done' || adStatus === 'filled' || adStatus === 'unfilled') {
        setIsAdLoaded(true);
      }
    };

    checkLoaded();

    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(checkLoaded);
      observer.observe(insRef.current, {
        attributes: true,
        attributeFilter: ['data-adsbygoogle-status', 'data-ad-status'],
      });
      return () => observer.disconnect();
    }
  }, [isPlaceholder, isAdBlockActive]);

  return (
    <div
      data-testid="ad-slot-container"
      data-slot-format={format}
      className={`w-full relative overflow-hidden flex flex-col justify-center items-center transition-all ${minHeightClass} ${className}`}
    >
      {/* 1. AdBlock Fallback Card */}
      {isAdBlockActive ? (
        <div
          data-testid="ad-slot-adblock-fallback"
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
              className="group flex flex-col items-center gap-1.5 hover:opacity-95 transition-opacity"
            >
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                D-VIEW 추천
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                동탄 호수공원 & 대장 단지 실거래가 트렌드 확인하기 ➔
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                179개 전 단지의 실거래가와 전세가율 데이터를 확인해보세요.
              </p>
            </Link>
          ) : (
            <Link
              href="/mbti"
              className="group flex flex-col items-center gap-1.5 hover:opacity-95 transition-opacity"
            >
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[11px] font-bold">
                D-VIEW 추천
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                나에게 딱 맞는 동탄 아파트는? 주거 MBTI 테스트 하러가기 ➔
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
          className={`w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-orange-300/80 dark:border-orange-500/40 bg-orange-50/40 dark:bg-orange-950/20 text-center select-none ${minHeightClass}`}
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[11px] font-bold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            [광고 슬롯 미리보기 - 개발/테스트 모드]
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            포맷: <span className="font-mono text-orange-600 dark:text-orange-400">{format}</span>
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
        /* 3. Live AdSense Slot with Skeleton Shimmer */
        <div className={`w-full h-full relative flex items-center justify-center ${minHeightClass}`}>
          {!isAdLoaded && (
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
          <ins
            ref={insRef}
            className={`adsbygoogle ${responsive ? 'w-full block' : ''}`}
            style={{ display: 'block', width: '100%', minHeight: 'inherit' }}
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
