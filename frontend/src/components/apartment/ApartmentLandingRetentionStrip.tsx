'use client';

import React, { useMemo } from 'react';
import { ArrowRightLeft, ArrowUpRight, Bell, Star } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { getDisplayAptName, normalizeAptName, isApartmentInFavorites } from '@/lib/utils/apartmentMapping';
import { trackEvent } from '@/lib/utils/analytics';
import type { RecirculationTargetApt } from '@/lib/ads/recirculationEngine';
import type { AptTxSummary } from '@/types';

export interface ApartmentLandingRetentionStripProps {
  currentAptName: string;
  currentDong: string;
  targets: ReadonlyArray<RecirculationTargetApt>;
  txSummaryData?: Record<string, AptTxSummary>;
  nameMapping?: Record<string, string>;
  inline?: boolean;
  onSelectPeer: (aptName: string) => void;
  onOpenCompare?: (baseAptName: string, targetAptName: string) => void;
  onOpenPushModal: () => void;
}

const CLUSTER_SHORT_META: Record<
  RecirculationTargetApt['clusterTag'],
  { label: string; badgeClass: string }
> = {
  SAME_DONG: {
    label: '동일권역',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  SAME_PRICE_BAND: {
    label: '유사시세',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  },
  TOP_VOLUME: {
    label: '인기거래',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

function resolveVerifiedSummaryPrice(
  aptName: string,
  txSummaryData?: Record<string, AptTxSummary>,
  nameMapping?: Record<string, string>
): string | null {
  if (!txSummaryData || !aptName) return null;
  const summaryMap =
    (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || txSummaryData;
  const norm = normalizeAptName(aptName);
  const mappedKey = nameMapping?.[aptName];
  const summary =
    summaryMap[aptName] ||
    summaryMap[norm] ||
    (mappedKey ? summaryMap[mappedKey] || summaryMap[normalizeAptName(mappedKey)] : undefined);

  if (!summary) return null;

  if (typeof summary.latestPriceEok === 'string' && summary.latestPriceEok.trim().length > 0) {
    return summary.latestPriceEok.trim();
  }
  if (typeof summary.latestPrice === 'number' && Number.isFinite(summary.latestPrice) && summary.latestPrice > 0) {
    if (summary.latestPrice >= 10_000) {
      return `${Math.round((summary.latestPrice / 10_000) * 10) / 10}억`;
    }
    return `${summary.latestPrice.toLocaleString('ko-KR')}만`;
  }
  return null;
}

/**
 * Early-viewport bounce defense & retention strip rendered above Chapter 01
 * on `/apartment/[aptName]` and `ApartmentModal`.
 * Enforces Strict Real Data Only prices and Zero-CLS fixed min-height.
 */
export const ApartmentLandingRetentionStrip = React.memo(function ApartmentLandingRetentionStrip({
  currentAptName,
  currentDong,
  targets,
  txSummaryData,
  nameMapping,
  inline = false,
  onSelectPeer,
  onOpenCompare,
  onOpenPushModal,
}: ApartmentLandingRetentionStripProps) {
  const { userFavorites, handleToggleFavorite } = useFavorites();
  const isFavorite = useMemo(
    () => isApartmentInFavorites(userFavorites, currentAptName, nameMapping),
    [userFavorites, currentAptName, nameMapping]
  );

  const visibleTargets = useMemo(() => targets.slice(0, 3), [targets]);
  const primaryTarget = visibleTargets[0];
  const surface = inline ? 'apartment_inline_landing' : 'apartment_modal_landing';

  return (
    <section
      data-testid="apartment-landing-retention-strip"
      aria-label="인접 단지 빠른 비교 및 관심단지 알림"
      className="w-full min-h-[76px] sm:min-h-[60px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-slate-200/80 dark:border-slate-800/80 px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 box-border"
    >
      {/* Left: Peer Chips Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0 py-0.5">
        <div className="inline-flex items-center gap-1.5 shrink-0">
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-[11.5px] font-extrabold text-secondary shrink-0">인접·유사 단지</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {visibleTargets.map((target, idx) => {
            const clusterMeta = CLUSTER_SHORT_META[target.clusterTag] || CLUSTER_SHORT_META.TOP_VOLUME;
            const verifiedPrice = resolveVerifiedSummaryPrice(target.aptName, txSummaryData, nameMapping);

            return (
              <button
                key={`${target.aptName}-${idx}`}
                type="button"
                data-testid={`landing-peer-chip-${idx}`}
                onClick={() => {
                  trackEvent('landing_bounce_defense_click', {
                    action: 'select_peer',
                    apt_name: currentAptName,
                    apartment_name: currentAptName,
                    dong: currentDong,
                    target_apt_name: target.aptName,
                    cluster_tag: target.clusterTag,
                    surface,
                  });
                  onSelectPeer(target.aptName);
                }}
                className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400/60 transition-colors shrink-0 cursor-pointer"
              >
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${clusterMeta.badgeClass}`}>
                  {clusterMeta.label}
                </span>
                <span className="text-[11.5px] font-extrabold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 whitespace-nowrap">
                  {getDisplayAptName(target.aptName)}
                </span>
                {verifiedPrice && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums whitespace-nowrap">
                    {verifiedPrice}
                  </span>
                )}
                <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: 1:1 Compare + Contextual Favorite -> Push Retention Bridge */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        {onOpenCompare && primaryTarget && (
          <button
            type="button"
            data-testid="landing-quick-compare-btn"
            onClick={() => {
              trackEvent('landing_bounce_defense_click', {
                action: 'open_1v1_compare',
                apt_name: currentAptName,
                apartment_name: currentAptName,
                target_apt_name: primaryTarget.aptName,
                surface,
              });
              onOpenCompare(currentAptName, primaryTarget.aptName);
            }}
            className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-extrabold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer border-none"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
            <span>1:1 비교</span>
          </button>
        )}

        <button
          type="button"
          data-testid="landing-retention-action-btn"
          onClick={() => {
            if (!isFavorite) {
              trackEvent('watchlist_toggle_favorite', {
                apt_name: currentAptName,
                apartment_name: currentAptName,
                is_favorite: true,
                source: 'landing_strip',
                surface,
              });
              handleToggleFavorite(currentAptName);
            } else {
              trackEvent('push_modal_open', {
                surface,
                trigger: 'post_favorite_nudge',
                apt_name: currentAptName,
                apartment_name: currentAptName,
              });
              onOpenPushModal();
            }
          }}
          className={
            isFavorite
              ? 'h-8 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer'
              : 'h-8 px-3 rounded-xl bg-surface hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 text-secondary hover:text-blue-600 dark:hover:text-blue-400 text-[12px] font-extrabold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer'
          }
        >
          {isFavorite ? (
            <>
              <Bell className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>관심 저장됨 · 변동 알림 켜기</span>
            </>
          ) : (
            <>
              <Star className="w-3.5 h-3.5 shrink-0" />
              <span>+ 관심단지 담기</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
});

export default ApartmentLandingRetentionStrip;
