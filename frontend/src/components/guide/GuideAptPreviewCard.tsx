'use client';

import React from 'react';
import Link from 'next/link';
import { DviewIcon } from '@/components/common/DviewIcon';
import type { GuideAptMiniPreviewItem } from '@/lib/data/guides';
import { QuickNonLoginRetentionAction } from '@/components/common/QuickNonLoginRetentionAction';
import { trackEvent, trackVirtualPageView } from '@/lib/utils/analytics';
import { sendTelemetry } from '@/lib/ads/cascadeFallback';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';

export interface GuideAptPreviewCardProps {
  item: GuideAptMiniPreviewItem;
  guideSlug: string;
  placement: 'article_top' | 'zone_section' | 'article_bottom';
  sectionTitle?: string;
}

export function resolveSafePreviewIdentity(item: GuideAptMiniPreviewItem): {
  safeSlug: string;
  safeHref: string;
} {
  const rawSlug = item.canonicalSlug || item.name || item.displayName || 'dongtan';
  const safeSlug =
    resolveCanonicalAptSlug(rawSlug, item.dong ? { dong: item.dong } : undefined) || rawSlug;
  const canonicalHref = `/apartment/${encodeURIComponent(safeSlug)}`;
  const safeHref =
    item.href && !item.href.startsWith('/apartment/') ? item.href : canonicalHref;
  return { safeSlug, safeHref };
}

export function recordGuideAptPreviewClick(params: {
  item: GuideAptMiniPreviewItem;
  guideSlug: string;
  placement: 'article_top' | 'zone_section' | 'article_bottom';
  sectionTitle?: string;
  suppressVirtualPageView?: boolean;
}): void {
  const { item, guideSlug, placement, sectionTitle, suppressVirtualPageView } = params;
  const { safeSlug, safeHref } = resolveSafePreviewIdentity(item);
  const cleanDong = item.dong ? item.dong.trim() || undefined : undefined;
  const pageTitle = `${item.displayName || safeSlug} 실거래가·전세가율 상세 리포트 | D-VIEW`;

  if (!suppressVirtualPageView) {
    trackVirtualPageView(safeHref, {
      page_title: pageTitle,
      guide_slug: guideSlug,
      placement,
      apartment_name: safeSlug,
      dong: cleanDong,
    });
  }

  trackEvent('guide_apt_preview_click', {
    guide_slug: guideSlug,
    placement,
    section_title: sectionTitle || placement,
    apartment_name: safeSlug,
    display_name: item.displayName || safeSlug,
    dong: cleanDong,
    target_path: safeHref,
  });

  sendTelemetry({
    eventType: 'GUIDE_PREVIEW_CLICK',
    slotId: `guide_${guideSlug}_${placement}_${safeSlug}`,
    placementSlotId: `guide_${placement}`,
    apartmentName: safeSlug,
    dong: cleanDong,
    timestamp: new Date().toISOString(),
  });
}

export interface GuideAptCtaLinkProps {
  item?: GuideAptMiniPreviewItem | null;
  aptSlug?: string;
  canonicalSlug?: string;
  displayName?: string;
  apartmentName?: string;
  dong?: string;
  href?: string;
  guideSlug: string;
  placement: 'article_top' | 'zone_section' | 'article_bottom';
  sectionTitle?: string;
  className?: string;
  dataTestId?: string;
  'data-testid'?: string;
  'data-apt-slug'?: string;
  'data-apt-dong'?: string;
  ariaLabel?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}

export function GuideAptCtaLink({
  item,
  aptSlug,
  canonicalSlug,
  displayName,
  apartmentName,
  dong,
  href,
  guideSlug,
  placement,
  sectionTitle,
  className,
  dataTestId,
  'data-testid': hyphenDataTestId,
  'data-apt-slug': dataAptSlug,
  'data-apt-dong': dataAptDong,
  ariaLabel,
  'aria-label': hyphenAriaLabel,
  children,
}: GuideAptCtaLinkProps) {
  const resolvedTestId = dataTestId ?? hyphenDataTestId;
  const resolvedAriaLabel = ariaLabel ?? hyphenAriaLabel;
  const fallbackSlug = (
    canonicalSlug ||
    aptSlug ||
    item?.canonicalSlug ||
    apartmentName ||
    item?.name ||
    displayName ||
    item?.displayName ||
    'dongtan'
  ).trim();
  const effectiveItem: GuideAptMiniPreviewItem = {
    name: (item?.name || apartmentName || displayName || fallbackSlug).trim(),
    displayName: (displayName || item?.displayName || apartmentName || item?.name || fallbackSlug).trim(),
    canonicalSlug: fallbackSlug,
    href: (href || item?.href || '').trim(),
    dong: (dong || item?.dong || '').trim(),
    zoneId: item?.zoneId || '',
    zoneName: item?.zoneName || '',
    latestPrice: item?.latestPrice || 0,
    latestPriceStr: item?.latestPriceStr || '',
    latestRent: item?.latestRent || 0,
    latestRentStr: item?.latestRentStr || '',
    jeonseRatio: item?.jeonseRatio || 0,
    perValue: item?.perValue ?? null,
    latestDate: item?.latestDate || '',
    latestArea: item?.latestArea || 0,
    latestFloor: item?.latestFloor || 0,
    txCount: item?.txCount || 0,
  };

  const { safeSlug, safeHref } = resolveSafePreviewIdentity(effectiveItem);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isModifiedClick =
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (typeof e.button === 'number' && e.button !== 0);
    recordGuideAptPreviewClick({
      item: effectiveItem,
      guideSlug,
      placement,
      sectionTitle,
      suppressVirtualPageView: isModifiedClick,
    });
  };

  return (
    <Link
      href={safeHref}
      prefetch={false}
      onClick={handleClick}
      data-testid={resolvedTestId}
      data-apt-slug={dataAptSlug ?? safeSlug}
      data-apt-dong={dataAptDong ?? (effectiveItem.dong || undefined)}
      aria-label={resolvedAriaLabel}
      className={className}
    >
      {children}
    </Link>
  );
}

export default function GuideAptPreviewCard({
  item,
  guideSlug,
  placement,
  sectionTitle,
}: GuideAptPreviewCardProps) {
  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isModifiedClick =
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (typeof e.button === 'number' && e.button !== 0);
    recordGuideAptPreviewClick({
      item,
      guideSlug,
      placement,
      sectionTitle,
      suppressVirtualPageView: isModifiedClick,
    });
  };

  const hasSubKey = item.displayName !== item.name;
  const latestSpecParts: string[] = [];
  if (item.latestArea > 0) {
    latestSpecParts.push(`전용 ${item.latestArea}㎡`);
  }
  if (item.latestFloor > 0) {
    latestSpecParts.push(`${item.latestFloor}층`);
  }
  const latestSpecText = latestSpecParts.join(' · ');

  const { safeSlug, safeHref } = resolveSafePreviewIdentity(item);

  const isLakeEduTownHero = safeSlug === '동탄더샵레이크에듀타운';
  const isHighConversionFlagship =
    isLakeEduTownHero ||
    safeSlug === '더샵센트럴시티' ||
    safeSlug === '동탄역롯데캐슬' ||
    safeSlug === '능동마을이지더원' ||
    safeSlug === '동탄역센트럴자이A-10';

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <Link
        href={safeHref}
        prefetch={false}
        onClick={handleCardClick}
        data-testid={`guide-apt-preview-card-${placement}`}
        data-apt-slug={safeSlug}
        data-apt-dong={item.dong}
        aria-label={`${item.displayName} 실시간 실거래가 미니 프리뷰 및 단지 상세 이동`}
        className="group dview-gcard min-h-[158px] sm:min-h-[168px] bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532]"
      >
      <div className="space-y-3">
        {/* Top Metadata Row: Dong/Zone Badge & Live Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="dview-gcard-dong">
            <DviewIcon name="building-2" size={12} />
            <span>
              {item.dong} · {item.zoneName}
            </span>
          </div>

          {isHighConversionFlagship && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span
                data-testid={isLakeEduTownHero ? 'guide-apt-preview-high-dwell-badge' : 'guide-apt-preview-flagship-badge'}
                className="dview-gcard-flag"
              >
                <DviewIcon name="shield-check" size={11} />
                <span>{isLakeEduTownHero ? '인기 대표 단지' : '권역 대장 단지'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Complex Display Name + Official Key */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="dview-gcard-t">
              <span>{item.displayName}</span>
              {hasSubKey && (
                <span className="dview-gcard-sub">
                  ({item.name})
                </span>
              )}
            </div>
          </div>

          <span className="dview-gcard-arrow">
            <DviewIcon name="arrow-up-right" size={14} />
          </span>
        </div>

        {/* Real Transaction Metrics Grid */}
        <dl className="dview-gcard-dl">
          <div className="dview-gcard-m">
            <dt className="dview-gcard-k">
              최근 매매 실거래
            </dt>
            <dd className="dview-gcard-v1">
              {item.latestPriceStr}
            </dd>
          </div>

          <div className="dview-gcard-m">
            <dt className="dview-gcard-k">
              최근 전세 실거래
            </dt>
            <dd className="dview-gcard-v2">
              {item.latestRentStr}
            </dd>
          </div>

          <div className="px-1">
            <dt className="dview-gcard-k flex items-center gap-1">
              <DviewIcon name="shield-check" size={11} className="text-secondary" />
              <span>전세가율 · 실거주 PER</span>
            </dt>
            <dd className="dview-gcard-v3">
              {item.jeonseRatio > 0 ? (
                <span>
                  {item.jeonseRatio}%
                  {item.perValue ? ` (PER ${item.perValue})` : ''}
                </span>
              ) : (
                '정보 없음'
              )}
            </dd>
          </div>

          <div className="px-1">
            <dt className="dview-gcard-k">
              누적 실거래량
            </dt>
            <dd className="dview-gcard-v3">
              {item.txCount > 0 ? `${item.txCount.toLocaleString()}건` : '정보 없음'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Footer Meta Bar: Latest Contract Date + Area/Floor + High-Visibility Deep-Link CTA Button */}
      <div className="dview-gcard-ft">
        <span className="dview-gcard-dt">
          <DviewIcon name="calendar" size={11} />
          <span>계약 {item.latestDate}</span>
          {latestSpecText && <span>· {latestSpecText}</span>}
        </span>

        <span
          data-testid="guide-apt-preview-card-cta-btn"
          className="dview-gcard-cta"
        >
          <span>실거래 · 단지 상세 리포트</span>
          <DviewIcon name="arrow-up-right" size={12} />
        </span>
      </div>
      </Link>

      <div
        data-testid={`guide-apt-preview-retention-${placement}`}
        className="dview-gcard-ret"
      >
        <span className="text-[11px] font-bold text-secondary truncate tabular-nums">
          로그인 없이 관심단지 저장 · 매일 07시대 요약 알림
        </span>
        <QuickNonLoginRetentionAction
          aptName={item.name}
          displayAptName={item.displayName}
          canonicalSlug={safeSlug}
          dong={item.dong}
          guideSlug={guideSlug}
          surface="guide_preview_card"
          triggerPrefix={`preview_${placement}`}
          size="xs"
          testIdPrefix={`guide-preview-${placement}`}
        />
      </div>
    </div>
  );
}

