'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Scale,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  BookOpen,
} from 'lucide-react';
import type { GuideAptMiniPreviewItem } from '@/lib/data/guides';
import { GuideAptCtaLink, resolveSafePreviewIdentity } from '@/components/guide/GuideAptPreviewCard';
import { QuickNonLoginRetentionAction } from '@/components/common/QuickNonLoginRetentionAction';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import { trackEvent, trackVirtualPageView } from '@/lib/utils/analytics';

export interface ResolvedGuideHeadToHeadRow {
  title: string;
  subtitle: string;
  leftLabel: string;
  rightLabel: string;
  verdict: string;
  left: GuideAptMiniPreviewItem;
  right: GuideAptMiniPreviewItem;
}

export interface GuideTopMatchupBridgeProps {
  guideSlug: string;
  guideTitle: string;
  matchups: ResolvedGuideHeadToHeadRow[];
  className?: string;
}

interface GuideStatsBridgeTarget {
  topic: string;
  href: string;
  ctaLabel: string;
  telemetryCtaLabel: string;
  pageTitle: string;
}

function resolveStatsTargetForGuide(guideSlug: string): GuideStatsBridgeTarget {
  switch (guideSlug) {
    case 'dongtan-lake-vs-station-comparison':
      return {
        topic: 'lake-park-view-premium',
        href: '/stats?topic=lake-park-view-premium#lake-park-view-premium',
        ctaLabel: '호수공원 vs 역세권 통계',
        telemetryCtaLabel: '동탄호수공원 vs 비수변 127단지 통계 비교',
        pageTitle: '동탄호수공원 vs 비수변 실시간 통계 대시보드',
      };
    case 'dongtan-station-gbcx-vs-sibeom-comparison':
      return {
        topic: 'dongtan-station-distance',
        href: '/stats?topic=dongtan-station-distance',
        ctaLabel: '동탄역 역세권 127단지 통계',
        telemetryCtaLabel: '동탄역 거리별 127단지 실거래 통계 비교',
        pageTitle: '동탄역 거리별 실시간 통계 대시보드',
      };
    case 'dongtan-reconstruction-remodeling-1st-new-town-outlook':
      return {
        topic: 'building-age-depreciation',
        href: '/stats?topic=building-age-depreciation#building-age-depreciation',
        ctaLabel: '연식별 집값·방어율 통계',
        telemetryCtaLabel: '동탄 연식별 집값 격차·방어율 통계 비교',
        pageTitle: '동탄 연식별 집값 격차 실시간 통계 대시보드',
      };
    default:
      return {
        topic: 'dongtan-1-vs-2-comparison',
        href: '/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison',
        ctaLabel: '1·2동탄 127단지 통계',
        telemetryCtaLabel: '1동탄 vs 2동탄 127단지 통계 비교',
        pageTitle: '동탄1 vs 동탄2 실시간 통계 대시보드',
      };
  }
}

function formatShortComplexTabName(name: string): string {
  const cleaned = (name || '')
    .replace(/아파트$/g, '')
    .replace(/^동탄역시범/g, '시범')
    .replace(/^동탄역\s*시범\s*/g, '시범 ')
    .replace(/^시범한빛마을\s*/g, '한빛 ')
    .replace(/^솔빛마을\s*/g, '솔빛 ')
    .replace(/^동탄\s*더샵\s*/g, '더샵 ')
    .trim();
  const chars = Array.from(cleaned);
  return chars.length > 7 ? `${chars.slice(0, 7).join('').trim()}…` : cleaned;
}

export function formatMatchupPriceGapText(
  leftPriceManwon: number,
  rightPriceManwon: number
): string | null {
  if (
    !Number.isFinite(leftPriceManwon) ||
    !Number.isFinite(rightPriceManwon) ||
    leftPriceManwon <= 0 ||
    rightPriceManwon <= 0
  ) {
    return null;
  }
  const diffManwon = rightPriceManwon - leftPriceManwon;
  if (Math.abs(diffManwon) < 100) {
    return '매매 실거래 동률';
  }
  const hundredths = Math.round(Math.abs(diffManwon) / 100);
  const absEok = hundredths / 100;
  const formatted = hundredths % 10 === 0 ? absEok.toFixed(1) : absEok.toFixed(2);
  const sign = diffManwon > 0 ? '+' : '-';
  return `매매 격차 ${sign}${formatted}억`;
}

export function GuideTopMatchupBridge({
  guideSlug,
  guideTitle,
  matchups,
  className = '',
}: GuideTopMatchupBridgeProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const statsTarget = resolveStatsTargetForGuide(guideSlug);

  const handleTabSelect = useCallback(
    (idx: number, matchupTitle: string) => {
      setSelectedIdx(idx);
      trackEvent('guide_top_matchup_tab_select', {
        event_category: 'guide_recirculation',
        guide_slug: guideSlug,
        matchup_index: idx + 1,
        matchup_title: matchupTitle,
        surface: 'guide_top_matchup_bridge',
        trigger: `matchup_tab_${idx + 1}`,
      });
    },
    [guideSlug]
  );

  const handleCompareModalClick = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement>,
      leftSlug: string,
      rightSlug: string,
      matchupTitle: string
    ) => {
      const isModified =
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        (typeof e.button === 'number' && e.button !== 0);
      const compareUrl = `/explore?calc=compare&apt1=${encodeURIComponent(leftSlug)}&apt2=${encodeURIComponent(rightSlug)}`;

      trackEvent('guide_matchup_compare_click', {
        event_category: 'guide_recirculation',
        guide_slug: guideSlug,
        matchup_title: matchupTitle,
        apt1: leftSlug,
        apt2: rightSlug,
        apartment_name: leftSlug,
        calculator_type: 'compare',
        surface: 'guide_top_matchup_bridge',
        trigger: 'matchup_compare_cta',
        placement: 'article_top_matchup_bridge',
      });

      if (!isModified) {
        trackVirtualPageView(compareUrl, {
          page_title: `${leftSlug} vs ${rightSlug} 1:1 실거래 비교`,
          from_guide_slug: guideSlug,
        });
      }
    },
    [guideSlug]
  );

  const handleStatsBridgeClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const isModified =
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        (typeof e.button === 'number' && e.button !== 0);

      trackEvent('guide_to_stats_bridge_click', {
        event_category: 'bidirectional_recirculation',
        from_guide_slug: guideSlug,
        from_guide_title: guideTitle,
        to_stats_topic: statsTarget.topic,
        surface: 'guide_top_matchup_bridge',
        trigger: 'matchup_stats_cta',
        placement: 'article_top_matchup_bridge',
        cta_label: statsTarget.telemetryCtaLabel,
      });

      if (!isModified) {
        trackVirtualPageView(statsTarget.href, {
          page_title: statsTarget.pageTitle,
          from_guide_slug: guideSlug,
        });
      }
    },
    [guideSlug, guideTitle, statsTarget]
  );

  if (!Array.isArray(matchups) || matchups.length === 0) {
    return null;
  }

  const safeIdx = Math.min(Math.max(0, selectedIdx), matchups.length - 1);
  const activeMatchup = matchups[safeIdx];
  const leftIdentity = resolveSafePreviewIdentity(activeMatchup.left);
  const rightIdentity = resolveSafePreviewIdentity(activeMatchup.right);
  const compareHref = `/explore?calc=compare&apt1=${encodeURIComponent(leftIdentity.safeSlug)}&apt2=${encodeURIComponent(rightIdentity.safeSlug)}`;
  const priceGapLabel = formatMatchupPriceGapText(
    activeMatchup.left.latestPrice,
    activeMatchup.right.latestPrice
  );
  const isDongtan1Vs2 = guideSlug === 'dongtan-1-vs-2-comparison';

  const sides = [
    {
      key: 'left' as const,
      badgeTone: 'safe' as const,
      label: activeMatchup.leftLabel,
      apt: activeMatchup.left,
      identity: leftIdentity,
      ctaClass: 'bg-emerald-600 group-hover:bg-emerald-700 text-white',
      priceClass: 'text-emerald-600 dark:text-emerald-400',
      hoverBorderClass: 'hover:border-emerald-500/45',
    },
    {
      key: 'right' as const,
      badgeTone: 'down' as const,
      label: activeMatchup.rightLabel,
      apt: activeMatchup.right,
      identity: rightIdentity,
      ctaClass: 'bg-blue-600 group-hover:bg-blue-700 text-white',
      priceClass: 'text-blue-600 dark:text-blue-400',
      hoverBorderClass: 'hover:border-blue-500/45',
    },
  ];

  return (
    <section
      id="guide-top-h2h-matchup-bridge"
      data-testid="guide-top-h2h-matchup-bridge"
      aria-label="상단 대표 단지 1:1 실거래 매치업 카드 브리지"
      className={`scroll-mt-40 md:scroll-mt-48 w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027] p-4 sm:p-5 space-y-3.5 ${className}`}
    >
      {/* Top Header & Concentric Matchup Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={getVisualSignalPillClass({ tone: 'safe', size: 'xs' })}>
              <Scale className="w-3 h-3 shrink-0" />
              <span>상단 1:1 실거래 매치업</span>
            </span>
            <span className={getVisualSignalPillClass({ tone: 'neutral', size: 'xs' })}>
              국토부 실거래 ({matchups.length}매치)
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-black text-primary tracking-tight truncate">
            {isDongtan1Vs2
              ? '1동탄 vs 2동탄 1:1 실거래 매치업'
              : '비교 권역 대표 1:1 실거래 매치업'}
          </h2>
          <p className="text-[11.5px] sm:text-xs font-semibold text-secondary line-clamp-1">
            양대 대표 단지 매매가·전세가율 대조 및 상세 시세 바로가기
          </p>
        </div>

        {matchups.length > 1 && (
          <div
            role="group"
            aria-label="대표 단지 1:1 매치업 선택"
            className={getToggleTrackClass(
              'grid grid-cols-2 sm:inline-flex sm:flex-wrap gap-0.5 w-full sm:w-auto max-w-full self-start xl:self-auto'
            )}
          >
            {matchups.map((m, idx) => {
              const isActive = idx === safeIdx;
              const tabLabel = `${idx + 1}. ${formatShortComplexTabName(m.left.displayName)} vs ${formatShortComplexTabName(m.right.displayName)}`;
              return (
                <button
                  key={`top-h2h-tab-${idx}-${m.left.canonicalSlug}-${m.right.canonicalSlug}`}
                  type="button"
                  data-testid={`guide-top-h2h-tab-${idx}`}
                  aria-pressed={isActive}
                  onClick={() => handleTabSelect(idx, m.title)}
                  className={getToggleBtnClass(isActive, {
                    size: 'sm',
                    tone: 'emerald',
                    extraClass: 'min-w-0 max-w-full overflow-hidden',
                  })}
                >
                  <span className="truncate">{tabLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Matchup Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-[13.5px] font-extrabold text-primary line-clamp-1">
            {activeMatchup.title}
          </h3>
          <p className="text-[11px] sm:text-xs text-tertiary font-medium line-clamp-1">
            {activeMatchup.subtitle}
          </p>
        </div>
        {priceGapLabel && (
          <span
            data-testid="guide-top-h2h-price-gap"
            className={getVisualSignalPillClass({ tone: 'down', size: 'sm' })}
          >
            {priceGapLabel}
          </span>
        )}
      </div>

      {/* 1:1 Side-by-Side Real Transaction Matchup Cards */}
      <div
        data-testid="guide-top-h2h-active-pair"
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {sides.map((side) => {
          const { apt, identity } = side;
          const secondarySignalText =
            apt.jeonseRatio > 0
              ? `전세가율 ${apt.jeonseRatio}%`
              : apt.txCount > 0
                ? `누적 ${apt.txCount.toLocaleString('ko-KR')}건`
                : '실거래 연동';
          const contractMetaParts: string[] = [];
          if (apt.latestDate) contractMetaParts.push(`계약 ${apt.latestDate}`);
          if (apt.latestArea > 0) contractMetaParts.push(`전용 ${apt.latestArea}㎡`);

          return (
            <div
              key={`${safeIdx}-${side.key}-${identity.safeSlug}`}
              className="flex flex-col gap-1.5 min-w-0"
            >
            <GuideAptCtaLink
              item={apt}
              href={identity.safeHref}
              apartmentName={apt.name}
              canonicalSlug={identity.safeSlug}
              displayName={apt.displayName}
              dong={apt.dong}
              guideSlug={guideSlug}
              placement="article_top"
              sectionTitle={`상단 1:1 매치업 · ${activeMatchup.title}`}
              dataTestId="guide-top-h2h-apt-cta"
              ariaLabel={`${apt.displayName} 최근 매매 ${apt.latestPriceStr} 단지 상세 리포트 이동`}
              className={`group rounded-2xl bg-white hover:bg-[#f2f4f6]/70 dark:bg-[#202027] dark:hover:bg-[#282832] border border-[#f2f4f6] dark:border-[#2c2c35] ${side.hoverBorderClass} p-4 flex flex-col justify-between gap-3 transition-colors no-underline min-h-[156px] min-w-0`}
            >
              <div className="space-y-2.5 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span
                    className={getVisualSignalPillClass({
                      tone: side.badgeTone,
                      size: 'xs',
                      extraClass: 'min-w-0 !shrink max-w-full overflow-hidden',
                    })}
                  >
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{side.label}</span>
                  </span>
                  <span className="text-[11px] font-bold text-tertiary shrink-0">
                    {apt.dong}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="text-[14.5px] sm:text-base font-black text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug line-clamp-1">
                    {apt.displayName}
                  </div>
                  <span className="w-6 h-6 rounded-lg bg-[#f9fafb] dark:bg-[#17171c] text-secondary group-hover:text-primary inline-flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Single Hero Metric: Verified Latest Sale Price */}
                <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-[#f2f4f6] dark:border-[#2c2c35]">
                  <span className="text-[11px] font-bold text-tertiary">최근 매매 실거래</span>
                  <span
                    className={`text-lg sm:text-xl font-black tabular-nums tracking-tight ${side.priceClass}`}
                  >
                    {apt.latestPriceStr}
                  </span>
                </div>

                {/* Max 2 Supporting Visual Signals (SINGLE_CARD_SIGNAL_CAP = 2) */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className={getVisualSignalPillClass({ tone: 'neutral', size: 'xs' })}>
                    전세 {apt.latestRentStr || '정보 없음'}
                  </span>
                  <span
                    className={getVisualSignalPillClass({
                      tone: side.badgeTone,
                      size: 'xs',
                    })}
                  >
                    {secondarySignalText}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#f2f4f6] dark:border-[#2c2c35] flex items-center justify-between gap-2 text-[11px] min-w-0">
                <span className="inline-flex items-center gap-1 text-tertiary font-semibold tabular-nums truncate min-w-0">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="truncate">{contractMetaParts.join(' · ') || '국토부 실거래 검증'}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors shrink-0 ${side.ctaClass}`}
                >
                  <span>실거래 상세</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </GuideAptCtaLink>

            <div
              data-testid={`guide-top-h2h-${side.key}-retention-row`}
              className="rounded-xl bg-white dark:bg-[#202027] border border-[#f2f4f6] dark:border-[#2c2c35] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 min-w-0"
            >
              <span className="text-[11px] font-bold text-tertiary truncate tabular-nums">
                비로그인 1초 저장 · 평일 07시 알림
              </span>
              <QuickNonLoginRetentionAction
                aptName={apt.name}
                displayAptName={apt.displayName}
                canonicalSlug={identity.safeSlug}
                dong={apt.dong}
                guideSlug={guideSlug}
                surface="guide_top_matchup_bridge"
                triggerPrefix={`h2h_${side.key}`}
                size="xs"
                testIdPrefix={`guide-h2h-${side.key}-retention`}
              />
            </div>
            </div>
          );
        })}
      </div>

      {/* Concise Verdict + Direct 1:1 Compare Modal & Stats/Ranking Recirculation Bar */}
      <div className="rounded-xl bg-white dark:bg-[#202027] border border-[#f2f4f6] dark:border-[#2c2c35] p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <p className="text-xs text-secondary font-semibold leading-relaxed line-clamp-2 sm:line-clamp-none">
          <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold mr-1.5">
            핵심 포인트
          </strong>
          {activeMatchup.verdict}
        </p>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={compareHref}
            prefetch={false}
            data-testid="guide-top-h2h-compare-modal-cta"
            onClick={(e) =>
              handleCompareModalClick(
                e,
                leftIdentity.safeSlug,
                rightIdentity.safeSlug,
                activeMatchup.title
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors"
          >
            <Scale className="w-3.5 h-3.5 shrink-0" />
            <span>두 단지 1:1 비교표 열기</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          </Link>

          <Link
            href={statsTarget.href}
            prefetch={false}
            data-testid="guide-top-h2h-stats-cta"
            onClick={handleStatsBridgeClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>{statsTarget.ctaLabel}</span>
          </Link>

          {isDongtan1Vs2 && (
            <Link
              href="/guide/dongtan-budget-tier-ranking"
              prefetch={false}
              data-testid="guide-top-h2h-budget-cta"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#282832] border border-[#f2f4f6] dark:border-[#2c2c35] text-primary text-xs font-extrabold transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>6·9·12억 예산별 랭킹</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
