'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import type {
  GuideAptMiniPreviewItem,
  ResolvedGuideZoneSectionPreview,
} from '@/lib/data/guides';
import { AdSlot } from '@/components/ads/AdSlot';
import ReportShareBar from '@/components/common/ReportShareBar';
import GuideAptPreviewCard, { GuideAptCtaLink } from '@/components/guide/GuideAptPreviewCard';
import { GuideTopMatchupBridge } from '@/components/guide/GuideTopMatchupBridge';
import { GuideStatsComparisonBridge } from '@/components/guide/GuideStatsComparisonBridge';
import GuideMobileScrollDepthBar, {
  type GuideSectionAnchorItem,
} from '@/components/guide/GuideMobileScrollDepthBar';
import GuideMorningAlertRetentionCard from '@/components/guide/GuideMorningAlertRetentionCard';
import InlineMortgageDsrBridge from '@/components/finance/InlineMortgageDsrBridge';
import TopLandingCalculatorQuickBar from '@/components/finance/TopLandingCalculatorQuickBar';
import { DviewIcon } from '@/components/common/DviewIcon';
import {
  renderGuideBodyContentCore,
  type InlineAptResolution,
} from '@/components/guide/guideContentRenderer';

export interface CompactGuideArticlePayload {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  date: string;
  updatedDate?: string;
  readingTime: string;
  author: string;
  keyTakeaways: string[];
  tags: string[];
  faqs: Array<{ question: string; answer: string }>;
  content: string;
}

export interface CompactGuideTopicCluster {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
}

export interface CompactGuideClusterPillar {
  id: string;
  title: string;
  pillarSlug: string;
}

export interface CompactTopAcquisitionRoute {
  id: string;
  href: string;
  badge: string;
  title: string;
  subtitle: string;
}

export interface CompactGuideZoneSectionConfig {
  sectionHeadingMatch: string;
  sectionTitle: string;
  zoneId?: string;
  zoneName?: string;
  itemSlugs: string[];
  midRepSlugs: string[];
}

export interface CompactGuideHeadToHeadConfig {
  title: string;
  subtitle: string;
  leftLabel: string;
  rightLabel: string;
  verdict: string;
  leftSlug: string;
  rightSlug: string;
}

export interface CompactGuideRelatedCard {
  slug: string;
  category: string;
  title: string;
  subtitle: string;
  isTopPopular: boolean;
}

export interface CompactGuideOtherCard {
  slug: string;
  category: string;
  title: string;
  description: string;
  readingTime: string;
}

export interface CompactGuideZoneBadge {
  id: string;
  name: string;
}

export interface GuideArticleContentClientProps {
  article: CompactGuideArticlePayload;
  topicCluster: CompactGuideTopicCluster | null;
  clusterPillars: CompactGuideClusterPillar[];
  topAcquisitionRoutes: CompactTopAcquisitionRoute[];
  totalGuidesCount: number;
  isTopLandingGuide: boolean;
  showTopMatchupBridge: boolean;
  emphasizeCorporateTaxQuickBar: boolean;
  adsenseApprovalMode: boolean;
  tocSections: GuideSectionAnchorItem[];
  /** Deduplicated apartment metric catalog keyed by canonicalSlug (eliminates repeated serialization). */
  aptCatalog: Record<string, GuideAptMiniPreviewItem>;
  topRepSlugs: string[];
  featuredSlugs: string[];
  clusterFlagshipSlugs: string[];
  lakeEduSlug: string | null;
  primaryPreviewSlug: string | null;
  primaryCalcSlug: string | null;
  fallbackMidRepSlugs: string[];
  zoneSectionConfigs: CompactGuideZoneSectionConfig[];
  headToHeadConfigs: CompactGuideHeadToHeadConfig[];
  featuredZoneItems: CompactGuideZoneBadge[];
  minPriceStr: string | null;
  maxPriceStr: string | null;
  sameMinMaxPrice: boolean;
  latestVerifiedTxDate: string;
  clusterRelatedGuides: CompactGuideRelatedCard[];
  otherArticles: CompactGuideOtherCard[];
  /** Pre-resolved inline bold & /apartment/ tokens that actually appear in this article's markdown. */
  inlineAptTokenMap: Record<string, InlineAptResolution>;
}

function isValidIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    !Number.isNaN(dt.getTime()) &&
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export default function GuideArticleContentClient(props: GuideArticleContentClientProps) {
  const {
    article,
    topicCluster,
    clusterPillars,
    topAcquisitionRoutes,
    totalGuidesCount,
    isTopLandingGuide,
    showTopMatchupBridge,
    emphasizeCorporateTaxQuickBar,
    adsenseApprovalMode,
    tocSections,
    aptCatalog,
    topRepSlugs,
    featuredSlugs,
    clusterFlagshipSlugs,
    lakeEduSlug,
    primaryPreviewSlug,
    primaryCalcSlug,
    fallbackMidRepSlugs,
    zoneSectionConfigs,
    headToHeadConfigs,
    featuredZoneItems,
    minPriceStr,
    maxPriceStr,
    sameMinMaxPrice,
    latestVerifiedTxDate,
    clusterRelatedGuides,
    otherArticles,
    inlineAptTokenMap,
  } = props;

  const isApprovalMode = Boolean(
    adsenseApprovalMode || process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true'
  );

  const resolveSlugs = (slugs: string[]): GuideAptMiniPreviewItem[] =>
    slugs
      .map((s) => aptCatalog[s])
      .filter((item): item is GuideAptMiniPreviewItem => Boolean(item));

  const topRepAptCtas = useMemo(() => resolveSlugs(topRepSlugs), [aptCatalog, topRepSlugs]);
  const featuredAptRows = useMemo(() => resolveSlugs(featuredSlugs), [aptCatalog, featuredSlugs]);
  const clusterFlagshipAptRows = useMemo(
    () => resolveSlugs(clusterFlagshipSlugs),
    [aptCatalog, clusterFlagshipSlugs]
  );
  const topHighlightAptRows = useMemo(() => featuredAptRows.slice(0, 4), [featuredAptRows]);
  const lakeEduTownPreview = lakeEduSlug ? aptCatalog[lakeEduSlug] || null : null;
  const primaryPreviewApt = primaryPreviewSlug ? aptCatalog[primaryPreviewSlug] : undefined;
  const primaryCalcApt = primaryCalcSlug ? aptCatalog[primaryCalcSlug] : undefined;
  const retentionApartments =
    featuredAptRows.length > 0 ? featuredAptRows : topRepAptCtas;

  const zoneSectionPreviews: ResolvedGuideZoneSectionPreview[] = useMemo(
    () =>
      zoneSectionConfigs.map((cfg) => ({
        sectionHeadingMatch: cfg.sectionHeadingMatch,
        sectionTitle: cfg.sectionTitle,
        zoneId: cfg.zoneId,
        zoneName: cfg.zoneName,
        items: resolveSlugs(cfg.itemSlugs),
      })),
    [aptCatalog, zoneSectionConfigs]
  );

  const midRepAptsBySection = useMemo(() => {
    const map: Record<string, GuideAptMiniPreviewItem[]> = {};
    for (const cfg of zoneSectionConfigs) {
      map[cfg.sectionHeadingMatch] = resolveSlugs(cfg.midRepSlugs);
    }
    return map;
  }, [aptCatalog, zoneSectionConfigs]);

  const fallbackMidRepApts = useMemo(
    () => resolveSlugs(fallbackMidRepSlugs),
    [aptCatalog, fallbackMidRepSlugs]
  );

  const headToHeadRows = useMemo(
    () =>
      headToHeadConfigs
        .map((m) => {
          const left = aptCatalog[m.leftSlug];
          const right = aptCatalog[m.rightSlug];
          if (!left || !right) return null;
          return {
            title: m.title,
            subtitle: m.subtitle,
            leftApt: m.leftSlug,
            rightApt: m.rightSlug,
            leftLabel: m.leftLabel,
            rightLabel: m.rightLabel,
            verdict: m.verdict,
            left,
            right,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    [aptCatalog, headToHeadConfigs]
  );

  const normalizedDate = article.date.trim();
  const normalizedUpdatedDate = article.updatedDate?.trim() || '';
  const hasValidIsoDate = isValidIsoCalendarDate(normalizedDate);
  const hasValidIsoUpdatedDate = isValidIsoCalendarDate(normalizedUpdatedDate);
  const showUpdatedDateBadge = Boolean(
    hasValidIsoUpdatedDate &&
      (hasValidIsoDate
        ? normalizedUpdatedDate > normalizedDate
        : normalizedUpdatedDate !== normalizedDate)
  );

  const renderedBodyElements = useMemo(
    () =>
      renderGuideBodyContentCore(article.content, {
        guideSlug: article.slug,
        isTopLandingGuide,
        adsenseApprovalMode: isApprovalMode,
        zoneSectionPreviews,
        inlineAptTokenMap,
        resolveDongBySlug: (slug) => aptCatalog[slug]?.dong || '',
        lakeEduTownPreview,
        featuredAptRows,
        midRepAptsBySection,
        fallbackMidRepApts,
      }),
    [
      article.content,
      article.slug,
      isTopLandingGuide,
      isApprovalMode,
      zoneSectionPreviews,
      inlineAptTokenMap,
      aptCatalog,
      lakeEduTownPreview,
      featuredAptRows,
      midRepAptsBySection,
      fallbackMidRepApts,
    ]
  );

  return (
    <>
      {/* Article Container */}
      <article className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-8 lg:p-10 shadow-xs space-y-8 min-w-0 max-w-full overflow-x-clip">
        {/* Header */}
        <header className="border-b border-border/60 pb-6 sm:pb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[12px] text-tertiary">
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {article.category}
            </span>
            {topicCluster && (
              <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                {topicCluster.shortTitle}
              </span>
            )}
            <time
              dateTime={hasValidIsoDate ? normalizedDate : undefined}
              className="flex items-center gap-1 tabular-nums"
            >
              {normalizedDate}
            </time>
            {showUpdatedDateBadge && (
              <span
                data-testid="guide-article-updated-date"
                className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 tabular-nums"
              >
                업데이트 <time dateTime={normalizedUpdatedDate}>{normalizedUpdatedDate}</time>
              </span>
            )}
            <span className="flex items-center gap-1">약 {article.readingTime} 소요</span>
            <span className="text-slate-400">|</span>
            <span className="font-semibold text-secondary">{article.author}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary tracking-tight leading-tight">
            {article.title}
          </h1>

          <p className="text-[15px] sm:text-[17px] font-bold text-primary/80 leading-relaxed">
            {article.subtitle}
          </p>

          <p className="text-[13.5px] sm:text-[15px] text-secondary leading-relaxed font-medium">
            {article.description}
          </p>
        </header>

        {/* Above-the-Fold Financial Calculator Quick-Entry Bar */}
        <TopLandingCalculatorQuickBar
          variant="guide"
          surface="guide_top_quick_bar"
          guideSlug={article.slug}
          targetName={primaryCalcApt?.displayName}
          canonicalSlug={primaryCalcApt?.canonicalSlug}
          dong={primaryCalcApt?.dong}
          benchmarkPriceManwon={primaryCalcApt?.latestPrice}
          emphasizeCorporateTax={emphasizeCorporateTaxQuickBar}
          inlineBridgeTargetId="guide-top-finance-bridge"
        />

        {/* Mobile Scroll Depth & Chapter Quick-Jump Sticky Bar */}
        <GuideMobileScrollDepthBar
          guideSlug={article.slug}
          sections={tocSections}
          apartments={retentionApartments}
        />

        {/* SSR GEO Real-Data Citation Fact Strip */}
        <section
          id="guide-geo-fact-sheet"
          data-testid="guide-geo-fact-sheet"
          aria-label="국토교통부 실거래 데이터 검증 요약"
          className="scroll-mt-40 md:scroll-mt-48 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs box-border"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-tertiary block truncate">
              실거래 검증 단지
            </span>
            <strong className="text-sm font-black text-primary tabular-nums block truncate">
              {featuredAptRows.length > 0 ? `${featuredAptRows.length}개 대표 단지` : '184개 동탄 단지'}
            </strong>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-tertiary block truncate">
              실거래 가격 범위
            </span>
            <strong className="text-sm font-black text-emerald-700 dark:text-emerald-400 tabular-nums block truncate">
              {minPriceStr && maxPriceStr
                ? sameMinMaxPrice
                  ? minPriceStr
                  : `${minPriceStr} ~ ${maxPriceStr}`
                : '국토부 실거래 연동'}
            </strong>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-tertiary block truncate">
              최신 실거래 기준일
            </span>
            <strong className="text-sm font-black text-primary tabular-nums block truncate">
              {latestVerifiedTxDate}
            </strong>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-tertiary block truncate">
              공공데이터 원천
            </span>
            <strong className="text-sm font-black text-blue-700 dark:text-blue-400 inline-flex items-center gap-1 truncate">
              <DviewIcon name="shield-check" size={13} />
              <span className="truncate">국토교통부 실거래가</span>
            </strong>
          </div>
        </section>

        {/* Above-the-Fold Flagship 1:1 Real-Transaction Matchup Bridge */}
        {showTopMatchupBridge && (
          <GuideTopMatchupBridge
            guideSlug={article.slug}
            guideTitle={article.title}
            matchups={headToHeadRows}
          />
        )}

        {/* Key Takeaways Callout + Above-the-Fold Representative Complex Instant CTA Bar */}
        <div
          id="guide-key-takeaways"
          className="scroll-mt-40 md:scroll-mt-48 bg-emerald-500/[0.04] dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-[14px] min-w-0">
              <span>본 리포트의 핵심 결론 및 요약 (Key Takeaways)</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
              <a
                href="#guide-top-finance-bridge"
                data-testid="guide-top-finance-jump"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold transition-colors max-w-full"
              >
                <DviewIcon name="calculator" size={13} />
                <span className="truncate">주담대·취득세 계산기</span>
              </a>
              <a
                href="#guide-morning-alert-retention"
                data-testid="guide-top-morning-alert-jump"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-extrabold transition-colors max-w-full"
              >
                <DviewIcon name="bell-ring" size={13} />
                <span className="truncate">오전 7시 실거래 알림</span>
              </a>
              <Link
                href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
                prefetch={false}
                data-testid="guide-top-stats-comparison-cta"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors shadow-2xs min-w-0 max-w-full"
              >
                <DviewIcon name="scale" size={13} />
                <span className="truncate">동탄1 vs 동탄2 실시간 집값 통계 비교표 열기</span>
                <DviewIcon name="arrow-up-right" size={13} />
              </Link>
            </div>
          </div>
          <ul className="space-y-2 text-[13px] sm:text-[14px] text-secondary font-medium pl-5 list-disc">
            {article.keyTakeaways.map((point, idx) => (
              <li key={idx} className="leading-relaxed">
                {point}
              </li>
            ))}
          </ul>

          {topRepAptCtas.length > 0 && (
            <div
              data-testid="guide-top-representative-apt-cta-bar"
              data-top-landing-guide={isTopLandingGuide ? 'true' : 'false'}
              className="pt-3.5 border-t border-emerald-500/20 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isTopLandingGuide && (
                    <span
                      data-testid="guide-top3-landing-badge"
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10.5px] font-extrabold"
                    >
                      신규 유입 TOP 3 핵심 리포트
                    </span>
                  )}
                  <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <DviewIcon name="building-2" size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>본문 핵심 대표 단지 실시간 실거래 바로가기 (상단 즉시 이동)</span>
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  국토교통부 최신 매매·전세 실거래 검증
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {topRepAptCtas.map((apt, idx) => (
                  <GuideAptCtaLink
                    key={`top-rep-cta-${apt.canonicalSlug}`}
                    href={apt.href}
                    apartmentName={apt.name}
                    canonicalSlug={apt.canonicalSlug}
                    displayName={apt.displayName}
                    dong={apt.dong}
                    guideSlug={article.slug}
                    placement="article_top"
                    sectionTitle={`${article.title} 상단 요약 대표 단지 CTA #${idx + 1}`}
                    dataTestId="guide-top-rep-apt-cta-btn"
                    ariaLabel={`${apt.displayName} 실시간 실거래가 ${apt.latestPriceStr} 단지 상세 리포트 바로가기`}
                    className="group rounded-xl border border-emerald-500/40 dark:border-emerald-500/45 bg-white dark:bg-slate-900 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 hover:border-emerald-600 px-3.5 py-2.5 flex items-center justify-between gap-2 transition-all shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0 tabular-nums">
                          대표 {idx + 1}
                        </span>
                        <span className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                          {apt.displayName}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>{apt.dong}</span>
                        <span>·</span>
                        <span className="font-black text-emerald-700 dark:text-emerald-400">
                          매매 {apt.latestPriceStr}
                        </span>
                        {apt.jeonseRatio > 0 && (
                          <>
                            <span>·</span>
                            <span>전세가율 {apt.jeonseRatio}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 text-white text-[11px] font-extrabold shrink-0 transition-colors">
                      <span>실거래 상세</span>
                      <DviewIcon name="arrow-up-right" size={12} />
                    </span>
                  </GuideAptCtaLink>
                ))}
              </div>
            </div>
          )}

          {/* Above-the-Fold 1-Line DSR 40% & Mortgage / Tax Conversion Bridge */}
          <div id="guide-top-finance-bridge" className="pt-2 scroll-mt-40 md:scroll-mt-48">
            <InlineMortgageDsrBridge
              apartmentName={primaryCalcApt?.displayName}
              canonicalSlug={primaryCalcApt?.canonicalSlug}
              dong={primaryCalcApt?.dong}
              benchmarkPriceManwon={primaryCalcApt?.latestPrice}
              guideSlug={article.slug}
              surface="guide_top_summary"
              trigger="guide_top_takeaways_bridge"
              bridgeId="guide-top-finance-bridge"
              defaultFocus={article.slug.includes('tax') ? 'tax' : 'mortgage'}
            />
          </div>
        </div>

        {/* Top-of-Article Flagship Complex Quick-Jump & Rival Matchup CTA */}
        {featuredAptRows.length > 0 && (
          <section
            id="guide-top-apt-quick-jump"
            data-testid="guide-top-apt-quick-jump"
            aria-label="리포트 핵심 대장주 단지 상단 바로가기 및 라이벌 실거래 비교"
            className="rounded-2xl border border-emerald-500/30 dark:border-emerald-500/35 bg-slate-50/90 dark:bg-slate-900/75 p-4 sm:p-6 space-y-4 shadow-2xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <DviewIcon name="building-2" size={17} className="text-emerald-600 dark:text-emerald-400" />
                  <span>본문 핵심 대표 단지 (시범단지·호수공원·역세권 대장주) 실거래 바로가기</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  국토교통부 실거래가·전세가율·실거주 PER이 검증된 핵심 단지 상세 리포트로 즉시 이동합니다.
                </p>
              </div>
              {headToHeadRows.length > 0 && (
                <a
                  href="#guide-head-to-head-comparison"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors w-fit shrink-0"
                >
                  <DviewIcon name="scale" size={13} />
                  <span>1:1 라이벌 매치업({headToHeadRows.length}건) 바로보기</span>
                </a>
              )}
            </div>

            {/* Top 4 Flagship Complex Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {topHighlightAptRows.map((item) => (
                <GuideAptPreviewCard
                  key={`top-preview-${item.canonicalSlug}`}
                  item={item}
                  guideSlug={article.slug}
                  placement="article_top"
                  sectionTitle={`${article.title} 상단 대표 단지 바로가기`}
                />
              ))}
            </div>

            {/* All Featured Complexes Direct Canonical Quick-Jump Pills */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>수록 단지 전체 상세 페이지 바로가기</span>
                <span className="text-slate-400 font-semibold tabular-nums">
                  ({featuredAptRows.length}개 단지)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {featuredAptRows.map((apt) => (
                  <GuideAptCtaLink
                    key={`top-pill-${apt.canonicalSlug}`}
                    href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                    apartmentName={apt.name}
                    canonicalSlug={apt.canonicalSlug}
                    displayName={apt.displayName}
                    dong={apt.dong}
                    guideSlug={article.slug}
                    placement="article_top"
                    sectionTitle="수록 단지 전체 상세 페이지 상단 바로가기 알약"
                    dataTestId="guide-top-apt-shortcut-pill"
                    className="dview-g-pill"
                  >
                    <span>{apt.displayName}</span>
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {apt.latestPriceStr}
                    </span>
                    <DviewIcon name="arrow-up-right" size={12} className="text-slate-400" />
                  </GuideAptCtaLink>
                ))}
              </div>
            </div>

            {/* Top 1:1 Rival Matchup Quick-Comparison Bar */}
            {headToHeadRows.length > 0 && (
              <div
                data-testid="guide-top-rival-matchup"
                className="rounded-xl border border-blue-500/25 dark:border-blue-500/30 bg-blue-500/[0.04] dark:bg-blue-950/20 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700 dark:text-blue-300">
                    <DviewIcon name="scale" size={13} />
                    <span>핵심 라이벌 매치업 1:1 비교 하이라이트 ({headToHeadRows.length}선)</span>
                  </span>
                  <a
                    href="#guide-head-to-head-comparison"
                    className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    상세 스펙 대결표 이동
                  </a>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {headToHeadRows.map((matchup, idx) => (
                    <div
                      key={`top-matchup-${idx}-${matchup.left.canonicalSlug}-${matchup.right.canonicalSlug}`}
                      data-testid="guide-top-rival-matchup-row"
                      className="rounded-lg bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 px-3 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2"
                    >
                      <p className="text-xs sm:text-[12.5px] font-extrabold text-slate-900 dark:text-slate-100">
                        {matchup.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <GuideAptCtaLink
                          href={`/apartment/${encodeURIComponent(matchup.left.canonicalSlug)}`}
                          apartmentName={matchup.left.name}
                          canonicalSlug={matchup.left.canonicalSlug}
                          displayName={matchup.left.displayName}
                          dong={matchup.left.dong}
                          guideSlug={article.slug}
                          placement="article_top"
                          sectionTitle={matchup.title}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-xs font-extrabold text-slate-900 dark:text-slate-100 transition-colors"
                        >
                          <span>{matchup.left.displayName}</span>
                          <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {matchup.left.latestPriceStr}
                          </span>
                        </GuideAptCtaLink>
                        <span className="text-[11px] font-black text-slate-400">VS</span>
                        <GuideAptCtaLink
                          href={`/apartment/${encodeURIComponent(matchup.right.canonicalSlug)}`}
                          apartmentName={matchup.right.name}
                          canonicalSlug={matchup.right.canonicalSlug}
                          displayName={matchup.right.displayName}
                          dong={matchup.right.dong}
                          guideSlug={article.slug}
                          placement="article_top"
                          sectionTitle={matchup.title}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-extrabold text-slate-900 dark:text-slate-100 transition-colors"
                        >
                          <span>{matchup.right.displayName}</span>
                          <span className="text-blue-700 dark:text-blue-400 tabular-nums">
                            {matchup.right.latestPriceStr}
                          </span>
                        </GuideAptCtaLink>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Conversion Boost Slot */}
            <div
              data-testid="guide-top-conversion-boost-slot"
              className="rounded-xl border border-emerald-500/25 dark:border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-950/20 p-3.5 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10.5px] font-extrabold">
                    상단 고전환 슬롯
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    신규 유입 TOP 3 핵심 허브 및 15분 체류 검증 대장 단지 바로가기
                  </span>
                </div>
                <GuideAptCtaLink
                  href={
                    lakeEduTownPreview?.href ||
                    `/apartment/${encodeURIComponent('동탄더샵레이크에듀타운')}`
                  }
                  apartmentName={lakeEduTownPreview?.name || '동탄더샵레이크에듀타운'}
                  canonicalSlug={lakeEduTownPreview?.canonicalSlug || '동탄더샵레이크에듀타운'}
                  displayName={lakeEduTownPreview?.displayName || '동탄더샵레이크에듀타운'}
                  dong={lakeEduTownPreview?.dong || '산척동'}
                  guideSlug={article.slug}
                  placement="article_top"
                  sectionTitle="상단 고전환 슬롯 동탄더샵레이크에듀타운 바로가기"
                  dataTestId="guide-top-lake-edutown-spotlight"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-colors max-w-full min-w-0"
                >
                  <span className="tabular-nums truncate">
                    {`동탄더샵레이크에듀타운 (평균 15분 체류${
                      lakeEduTownPreview?.latestPriceStr
                        ? ` · ${lakeEduTownPreview.latestPriceStr}`
                        : ''
                    }) 상세보기`}
                  </span>
                  <DviewIcon name="arrow-up-right" size={12} />
                </GuideAptCtaLink>
              </div>

              <div
                data-testid="guide-top-inflow-hub-links"
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                {topAcquisitionRoutes.map((entry) => {
                  const isCurrentGuide = entry.href === `/guide/${article.slug}`;
                  return (
                    <Link
                      key={entry.id}
                      href={entry.href}
                      prefetch={false}
                      data-testid={`guide-top-inflow-hub-${entry.id}`}
                      className={`rounded-lg border p-2.5 flex flex-col justify-between gap-1 transition-colors ${
                        isCurrentGuide
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-900 dark:text-slate-50'
                          : 'bg-white/85 dark:bg-slate-900/75 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {entry.badge}
                        </span>
                        <DviewIcon name="arrow-up-right" size={12} className="text-slate-400" />
                      </div>
                      <p className="text-xs font-extrabold leading-snug line-clamp-1">
                        {entry.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                        {entry.subtitle}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Mid-Article Zero-CLS AdSlot */}
        {!isApprovalMode && (
          <div
            data-testid="guide-article-adslot-top"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
          >
            <AdSlot
              refreshSlotId={`1000000002_guide_${article.slug}_top`}
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="mortgage-refinance"
              apartmentName={article.title}
              dong={primaryPreviewApt?.dong}
            />
          </div>
        )}

        {/* Body Content with In-Section Zone Real-Time Mini Preview Cards */}
        <div
          id="guide-article-body"
          className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-secondary leading-relaxed space-y-5 pt-2 font-medium"
        >
          {renderedBodyElements}
        </div>

        {/* Bottom-of-Body Representative Apartment Real-Time Transaction Mini Preview Cards + Contextual AdSlot */}
        {featuredAptRows.length > 0 && (
          <section
            id="guide-bottom-apt-preview-cards"
            data-testid="guide-bottom-apt-preview-cards"
            aria-label="가이드 본문 하단 대표 단지 실시간 실거래가 미니 프리뷰"
            className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  <DviewIcon name="building-2" size={19} className="text-emerald-600 dark:text-emerald-400" />
                  <span>가이드 본문 언급 대표 단지 실시간 실거래가 미니 프리뷰</span>
                </h3>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                  본 가이드에서 다룬 핵심 아파트 단지(
                  {featuredAptRows
                    .slice(0, 3)
                    .map((item) => item.displayName)
                    .join(', ')}{' '}
                  등)의 국토교통부 최신 매매·전세 실거래가 요약 카드입니다. 카드를 클릭하면 단지 상세 시세·전세가율·DSR 대출 한도 리포트로 즉시 이동합니다.
                </p>
              </div>

              {featuredZoneItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {featuredZoneItems.map((zone) => (
                    <Link
                      key={zone.id}
                      href={`/zone/${zone.id}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      <span>{zone.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {featuredAptRows.map((item) => (
                <GuideAptPreviewCard
                  key={`bottom-${item.canonicalSlug}`}
                  item={item}
                  guideSlug={article.slug}
                  placement="article_bottom"
                  sectionTitle="가이드 본문 하단 대표 단지 미니 프리뷰"
                />
              ))}
            </div>

            {!isApprovalMode && (
              <div
                data-testid="guide-article-adslot-mid"
                className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
              >
                <AdSlot
                  refreshSlotId={`1000000002_guide_${article.slug}_mid_conversion`}
                  format="rectangle"
                  minHeightClass="min-h-[250px]"
                  cpaCampaignId="mortgage-refinance"
                  apartmentName={primaryPreviewApt?.canonicalSlug || article.title}
                  dong={primaryPreviewApt?.dong}
                />
              </div>
            )}
          </section>
        )}

        {/* Live 1:1 Head-to-Head Real-Data Matchups */}
        {headToHeadRows.length > 0 && (
          <section
            id="guide-head-to-head-comparison"
            aria-label="핵심 단지 1:1 국토교통부 실거래 맞대결 비교"
            className="scroll-mt-40 md:scroll-mt-48 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5"
          >
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                <DviewIcon name="scale" size={19} className="text-emerald-600 dark:text-emerald-400" />
                <span>핵심 대표 단지 1:1 실거래 맞대결 (국토교통부 실데이터)</span>
              </h3>
              <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                실수요자가 가장 많이 함께 비교하는 양대 대표 단지의 최근 매매 실거래가·전세가·전세가율·누적 거래량을 직접 대조합니다.
              </p>
            </div>

            <div className="space-y-4">
              {headToHeadRows.map((matchup) => (
                <div
                  key={`${matchup.left.name}-vs-${matchup.right.name}`}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 space-y-4"
                >
                  <div>
                    <h4 className="text-[15px] sm:text-base font-extrabold text-slate-900 dark:text-slate-50">
                      {matchup.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                      {matchup.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {[
                      { side: 'LEFT', label: matchup.leftLabel, apt: matchup.left, accent: 'emerald' as const },
                      { side: 'RIGHT', label: matchup.rightLabel, apt: matchup.right, accent: 'blue' as const },
                    ].map((card) => (
                      <div
                        key={card.apt.name}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={
                                  card.accent === 'emerald'
                                    ? 'inline-block text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md'
                                    : 'inline-block text-[11px] font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md'
                                }
                              >
                                {card.label}
                              </span>
                              <GuideAptCtaLink
                                href={`/apartment/${encodeURIComponent(card.apt.canonicalSlug)}`}
                                apartmentName={card.apt.name}
                                canonicalSlug={card.apt.canonicalSlug}
                                displayName={card.apt.displayName}
                                dong={card.apt.dong}
                                guideSlug={article.slug}
                                placement="article_bottom"
                                sectionTitle={matchup.title}
                                className="mt-1.5 flex items-center gap-1 text-[15px] font-black text-slate-900 dark:text-slate-50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              >
                                <span>{card.apt.name}</span>
                                <DviewIcon name="arrow-up-right" size={14} className="text-slate-400" />
                              </GuideAptCtaLink>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                              {card.apt.dong}
                            </span>
                          </div>

                          <dl className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                            <div>
                              <dt className="text-slate-500 dark:text-slate-400 font-medium">최근 매매 실거래</dt>
                              <dd className="mt-0.5 text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                                {card.apt.latestPriceStr}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-slate-500 dark:text-slate-400 font-medium">최근 전세 실거래</dt>
                              <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                {card.apt.latestRentStr}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-slate-500 dark:text-slate-400 font-medium">전세가율 (하방지지)</dt>
                              <dd className="mt-0.5 font-extrabold tabular-nums text-slate-800 dark:text-slate-200">
                                {card.apt.jeonseRatio > 0 ? `${card.apt.jeonseRatio}%` : '정보 없음'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-slate-500 dark:text-slate-400 font-medium">누적 실거래량</dt>
                              <dd className="mt-0.5 font-extrabold tabular-nums text-slate-800 dark:text-slate-200">
                                {card.apt.txCount > 0 ? `${card.apt.txCount.toLocaleString()}건` : '정보 없음'}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                          <GuideAptCtaLink
                            href={`/apartment/${encodeURIComponent(card.apt.canonicalSlug)}`}
                            apartmentName={card.apt.name}
                            canonicalSlug={card.apt.canonicalSlug}
                            displayName={card.apt.displayName}
                            dong={card.apt.dong}
                            guideSlug={article.slug}
                            placement="article_bottom"
                            sectionTitle={matchup.title}
                            dataTestId="guide-h2h-apt-cta-btn"
                            className={
                              card.accent === 'emerald'
                                ? 'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors shadow-2xs'
                                : 'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors shadow-2xs'
                            }
                          >
                            <span>{card.apt.displayName} 실거래 상세 리포트</span>
                            <DviewIcon name="arrow-up-right" size={12} />
                          </GuideAptCtaLink>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 px-3.5 py-2.5 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                    <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold mr-1.5">
                      데이터 판정:
                    </strong>
                    {matchup.verdict}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Live Real-Data Comparison Table & Zone Links */}
        {(featuredAptRows.length > 0 || featuredZoneItems.length > 0) && (
          <section
            id="guide-live-data-comparison"
            aria-label="리포트 연관 주요 아파트 국토교통부 실거래 비교표"
            className="scroll-mt-40 md:scroll-mt-48 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  <span>리포트 핵심 아파트 국토교통부 최신 실거래가 비교표</span>
                </h3>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                  본 칼럼에서 다룬 대표 단지의 실제 실거래가·전세가율 현황입니다. 단지명을 클릭하면 평형별 시세와 DSR 대출 한도 리포트로 이동합니다.
                </p>
              </div>
              {featuredZoneItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {featuredZoneItems.map((zone) => (
                    <Link
                      key={zone.id}
                      href={`/zone/${zone.id}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      <span>{zone.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {featuredAptRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-[12.5px] sm:text-[13px] text-slate-600 dark:text-slate-400">
                  <caption className="sr-only">
                    리포트 연관 주요 아파트 단지별 행정동, 최근 실거래 매매가, 최근 전세가, 전세가율 및 누적 거래량 비교표
                  </caption>
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-50 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th scope="col" className="p-3.5 whitespace-nowrap">단지명 (상세 리포트)</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">행정동</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">최근 실거래 매매가</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">최근 전세가</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">전세가율</th>
                      <th scope="col" className="p-3.5 whitespace-nowrap">누적 거래량</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
                    {featuredAptRows.map((apt) => (
                      <tr key={apt.name} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                        <th scope="row" className="p-3.5 font-extrabold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                          <GuideAptCtaLink
                            href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                            apartmentName={apt.name}
                            canonicalSlug={apt.canonicalSlug}
                            displayName={apt.displayName}
                            dong={apt.dong}
                            guideSlug={article.slug}
                            placement="article_bottom"
                            sectionTitle="리포트 핵심 아파트 국토교통부 최신 실거래가 비교표"
                            dataTestId="guide-table-apt-cta-link"
                            className="text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{apt.name}</span>
                            <DviewIcon name="arrow-up-right" size={12} className="opacity-75" />
                          </GuideAptCtaLink>
                        </th>
                        <td className="p-3.5 whitespace-nowrap">{apt.dong}</td>
                        <td className="p-3.5 tabular-nums font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {apt.latestPriceStr}
                        </td>
                        <td className="p-3.5 tabular-nums whitespace-nowrap">{apt.latestRentStr}</td>
                        <td className="p-3.5 tabular-nums whitespace-nowrap">
                          {apt.jeonseRatio > 0 ? `${apt.jeonseRatio}%` : '정보 없음'}
                        </td>
                        <td className="p-3.5 tabular-nums whitespace-nowrap">
                          {apt.txCount > 0 ? `${apt.txCount.toLocaleString()}건` : '정보 없음'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Bidirectional Bridge to /stats Dongtan 1 vs Dongtan 2 House Price Comparison */}
        <GuideStatsComparisonBridge
          guideSlug={article.slug}
          guideTitle={article.title}
          placement="guide_article_bottom"
        />

        {/* Morning 7 AM Real-Transaction Alert & Watchlist Revisit Retention CTA */}
        <GuideMorningAlertRetentionCard
          guideSlug={article.slug}
          apartments={retentionApartments}
          surface="guide_article_bottom"
        />

        {/* Topic Cluster & Popular Guide Internal Cross-Linking Hub */}
        {clusterRelatedGuides.length > 0 && (
          <section
            id="guide-topic-cluster-links"
            data-testid="guide-topic-cluster-links"
            aria-label="토픽 클러스터 연관 가이드 및 인기 리포트 교차 탐색"
            className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                  <DviewIcon name="layers" size={19} className="text-blue-600 dark:text-blue-400" />
                  <span>
                    {topicCluster
                      ? `${topicCluster.title} · 필수 연계 리포트`
                      : '함께 읽으면 좋은 핵심 연계 가이드'}
                  </span>
                </h3>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                  {topicCluster
                    ? `${topicCluster.description} — 본 리포트와 함께 비교하면 단지 선택 정확도가 높아집니다.`
                    : '본 리포트의 실거래·입지 분석과 직결되는 인기 비교 가이드입니다.'}
                </p>
              </div>
              <Link
                href="/guide"
                prefetch={false}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold transition-colors w-fit shrink-0"
              >
                <span>전체 {totalGuidesCount}개 가이드 허브</span>
                <DviewIcon name="arrow-up-right" size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {clusterRelatedGuides.map((relGuide) => (
                <Link
                  key={`cluster-link-${relGuide.slug}`}
                  href={`/guide/${relGuide.slug}`}
                  prefetch={false}
                  data-testid="guide-topic-cluster-card"
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 p-4 flex flex-col justify-between gap-2.5 transition-all group"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        {relGuide.category}
                      </span>
                      {relGuide.isTopPopular && (
                        <span className="text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          인기 TOP 5
                        </span>
                      )}
                    </div>
                    <h4 className="text-[13.5px] sm:text-[14.5px] font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {relGuide.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2">
                      {relGuide.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11.5px] font-bold text-blue-700 dark:text-blue-400">
                    <span>심층 비교 리포트 이어서 읽기</span>
                    <DviewIcon
                      name="arrow-up-right"
                      size={14}
                      className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    />
                  </div>
                </Link>
              ))}
            </div>

            {/* Cluster Flagship Apartment Direct Shortcuts */}
            {clusterFlagshipAptRows.length > 0 && (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-300">
                    {topicCluster
                      ? `${topicCluster.title} 대표 대장주 단지 실거래 바로가기`
                      : '클러스터 대표 대장주 단지 바로가기'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    국토부 84㎡ 실거래 기준
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {clusterFlagshipAptRows.map((apt) => (
                    <GuideAptCtaLink
                      key={`cluster-flagship-apt-${apt.canonicalSlug}`}
                      href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                      apartmentName={apt.name}
                      canonicalSlug={apt.canonicalSlug}
                      displayName={apt.displayName}
                      dong={apt.dong}
                      guideSlug={article.slug}
                      placement="article_bottom"
                      sectionTitle="클러스터 대표 대장주 단지 바로가기"
                      dataTestId="guide-cluster-flagship-apt-link"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 text-xs font-extrabold text-slate-800 dark:text-slate-100 transition-colors"
                    >
                      <DviewIcon name="building-2" size={12} className="text-emerald-600 dark:text-emerald-400" />
                      <span>{apt.displayName}</span>
                      <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {apt.latestPriceStr}
                      </span>
                      <DviewIcon name="arrow-up-right" size={12} className="text-slate-400" />
                    </GuideAptCtaLink>
                  ))}
                </div>
              </div>
            )}

            {/* 5-Cluster Pillar Cross-Navigation Bar */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 p-3.5 space-y-2">
              <span className="block text-[11.5px] font-extrabold text-slate-700 dark:text-slate-300">
                5대 핵심 토픽 클러스터 대표 가이드 ({totalGuidesCount}개 리포트 전체 연결)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {clusterPillars.map((cluster) => {
                  const isCurrentCluster = topicCluster?.id === cluster.id;
                  return (
                    <Link
                      key={`cluster-pillar-${cluster.id}`}
                      href={`/guide/${cluster.pillarSlug}`}
                      prefetch={false}
                      data-testid="guide-cluster-pillar-pill"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-colors ${
                        isCurrentCluster
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500/40'
                      }`}
                    >
                      <span>{cluster.title}</span>
                      <DviewIcon name="arrow-up-right" size={12} className="opacity-70" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Visible FAQ Section */}
        {article.faqs && article.faqs.length > 0 && (
          <section
            id="guide-faq-section"
            aria-label="리포트 자주 묻는 핵심 질문 FAQ"
            className="scroll-mt-40 md:scroll-mt-48 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
              <DviewIcon name="help-circle" size={19} className="text-blue-600 dark:text-blue-400" />
              <span>자주 묻는 핵심 질문 (FAQ)</span>
            </h3>
            <dl className="space-y-3">
              {article.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-1.5"
                >
                  <dt className="text-[13.5px] sm:text-[14.5px] font-extrabold text-slate-900 dark:text-slate-100">
                    Q. {faq.question}
                  </dt>
                  <dd className="text-xs sm:text-[13.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Tags */}
        <div className="pt-6 border-t border-border/60 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="text-[12px] font-semibold text-tertiary bg-body px-3 py-1 rounded-xl border border-border/50"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* One-Click Viral Summary Share Bar */}
        <ReportShareBar
          title={article.title}
          summaryLines={article.keyTakeaways}
          canonicalPath={`/guide/${article.slug}`}
          campaign={`guide_${article.slug}`}
        />

        {/* Footer Article Zero-CLS AdSlot */}
        {!isApprovalMode && (
          <div
            data-testid="guide-article-adslot-bottom"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
          >
            <AdSlot
              refreshSlotId={`1000000002_guide_${article.slug}_bottom`}
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="jeonse-sentinel"
              apartmentName={article.title}
              dong={primaryPreviewApt?.dong}
            />
          </div>
        )}

        {/* Footer Author & Recirculation Box */}
        <div className="bg-body p-5 sm:p-6 rounded-2xl border border-border/60 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider block">작성 주체</span>
            <strong className="text-[15px] font-black text-primary">{article.author}</strong>
            <p className="text-[12px] text-secondary mt-0.5">국토교통부 실거래가 및 행정 인프라 공공데이터 융합 퀀트 리서치</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-bold transition-colors"
            >
              <span>동탄1 vs 동탄2 집값 통계</span>
            </Link>
            <Link
              href="/explore"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-bold transition-colors"
            >
              <span>단지별 실거래가 탐색</span>
            </Link>
            <Link
              href="/technovalley"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[12.5px] font-bold transition-colors"
            >
              <span>지식산업센터 세제 분석</span>
            </Link>
          </div>
        </div>
      </article>

      {/* Read Next Other Articles */}
      <section className="space-y-4">
        <h3 className="text-lg font-black text-primary tracking-tight">다른 추천 리포트</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherArticles.map((nextArt) => (
            <Link
              key={nextArt.slug}
              href={`/guide/${nextArt.slug}`}
              prefetch={false}
              className="dview-g-rcard group"
            >
              <div>
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block mb-1">
                  {nextArt.category}
                </span>
                <h4 className="text-[14px] sm:text-[15px] font-bold text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {nextArt.title}
                </h4>
                <p className="text-[12px] text-secondary mt-1.5 line-clamp-2 font-medium">
                  {nextArt.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 text-[12px] text-tertiary flex items-center justify-between">
                <span>약 {nextArt.readingTime}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>읽기</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
