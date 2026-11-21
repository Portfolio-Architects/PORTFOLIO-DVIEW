import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import {
  GUIDE_ARTICLES,
  TOP_ACQUISITION_ENTRY_ROUTES,
  HIGH_CONVERSION_FLAGSHIP_APARTMENTS,
  buildGuideAptMiniPreview,
  isTopLandingGuideSlug,
} from '@/lib/data/guides';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { AdSlot } from '@/components/ads/AdSlot';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import { GuideStatsComparisonBridge } from '@/components/guide/GuideStatsComparisonBridge';
import GuideAptPreviewCard, { GuideAptCtaLink } from '@/components/guide/GuideAptPreviewCard';
import GuideMorningAlertRetentionCard from '@/components/guide/GuideMorningAlertRetentionCard';
import BalanceMatchupWidget from '@/components/engagement/BalanceMatchupWidget';
import BudgetTierChallengeWidget from '@/components/engagement/BudgetTierChallengeWidget';
import { resolveBalanceMatchups } from '@/lib/data/balanceMatchups';
import { extractVerifiedComplexCatalog } from '@/lib/finance/budgetTierEngine';
import { getSyncTxSummaryMap } from '@/lib/server/syncTxSummary';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import {
  getCompactGuideCategory,
  getGuideCardSummary,
  getGuideCardTitle,
} from '@/lib/guide/guideCardDisplay';

const GUIDE_HUB_OG_IMAGE =
  'https://dongtanview.com/api/og?title=' +
  encodeURIComponent('동탄 부동산 비교 가이드 & 실거래 분석 리포트') +
  '&subtitle=' +
  encodeURIComponent('동탄1 vs 동탄2 · 동탄역 vs 호수공원 · 6억·9억·12억 예산별 랭킹');

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: '동탄 부동산 비교 가이드 (동탄1 vs 2 · 동탄역 vs 호수공원 · 광비콤 vs 시범단지) | D-VIEW',
  description:
    '동탄1 vs 동탄2 입지·학군 비교, 동탄역 광비콤 주상복합 vs 청계동 시범단지 4대장, 동탄역 vs 호수공원 1:1 실거래가 맞대결, 북동탄(영천동) vs 중동탄(목동) vs 석우·능동 직주근접 비교, 6억·9억·12억 예산별 랭킹 및 스트레스 DSR 40% 리포트를 확인하세요.',
  keywords: [
    '1동탄 2동탄 차이',
    '1동탄 vs 2동탄',
    '동탄1 vs 동탄2',
    '동탄역 vs 호수공원',
    '광비콤 vs 시범단지',
    '동탄역 시범단지 4대장',
    '북동탄 vs 중동탄',
    '동탄 직주근접 아파트',
    '동탄 아파트 추천',
    '동탄 학군지',
    '동탄 학군 아파트',
    '동탄 6억대 아파트',
    '동탄 9억대 아파트',
    '동탄 트램 노선도',
    '스트레스 DSR 주담대 한도',
  ],
  alternates: {
    canonical: 'https://dongtanview.com/guide',
    types: {
      'application/rss+xml': 'https://dongtanview.com/feed.xml',
    },
  },
  openGraph: {
    title: '동탄 부동산 비교 가이드 (동탄1 vs 2 · 동탄역 vs 호수공원 · 광비콤 vs 시범단지) | D-VIEW',
    description:
      '동탄1 vs 동탄2, 광비콤 주상복합 vs 청계동 시범 4대장, 동탄역 vs 호수공원, 북동탄 vs 중동탄 직주근접, 6억·9억·12억 예산별 실거래 랭킹을 국토교통부 실데이터로 1:1 비교합니다.',
    url: 'https://dongtanview.com/guide',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: GUIDE_HUB_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: '동탄 부동산 비교 가이드 | D-VIEW',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '동탄 부동산 비교 가이드 (동탄1 vs 2 · 동탄역 vs 호수공원 · 광비콤 vs 시범단지) | D-VIEW',
    description:
      '동탄1 vs 동탄2, 광비콤 vs 시범 4대장, 동탄역 vs 호수공원, 북동탄 vs 중동탄 직주근접, 예산별 실거래 랭킹 및 스트레스 DSR 리포트',
    images: [GUIDE_HUB_OG_IMAGE],
  },
};

export default function GuideIndexPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const nonce = undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/guide#webpage`,
    url: `${baseUrl}/guide`,
    name: '동탄 부동산 비교 가이드 (동탄1 vs 2 · 동탄역 vs 호수공원 · 광비콤 vs 시범단지) | D-VIEW',
    description:
      '동탄 1·2신도시 입지·학군 맞대결, 광비콤 주상복합 vs 시범단지 4대장, 동탄역 vs 호수공원, 북동탄 vs 중동탄 직주근접 비교, 예산별(6억·9억·12억) 랭킹, GTX-A·트램 수혜 단지, 스트레스 DSR 40% 실거주 PER 리포트 모음',
    inLanguage: 'ko-KR',
    isPartOf: {
      '@id': `${baseUrl}/#website`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'D-VIEW (디뷰)',
      url: baseUrl,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      '@id': `${baseUrl}/guide#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '홈',
          item: baseUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'D-VIEW 분석 리포트',
          item: `${baseUrl}/guide`,
        },
      ],
    },
    hasPart: GUIDE_ARTICLES.map((article, idx) => ({
      '@type': 'Article',
      position: idx + 1,
      headline: article.title,
      description: article.seoDescription || article.description,
      url: `${baseUrl}/guide/${article.slug}`,
      datePublished: article.date,
      dateModified: article.updatedDate || article.date,
      author: {
        '@type': 'Organization',
        name: article.author,
      },
    })),
  };

  const lakeEduPreview = buildGuideAptMiniPreview('동탄더샵레이크에듀타운');
  const hubRetentionApts = HIGH_CONVERSION_FLAGSHIP_APARTMENTS.map((name) =>
    buildGuideAptMiniPreview(name)
  ).filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      <LoungeHeader activeTab="guide" />

      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto min-w-0">
        <PageHeroHeader
          title="D-VIEW 분석 리포트"
          compactTitle="D-VIEW 분석 리포트"
          subtitleStrong={<MarketStatsStrong />}
          subtitleLight={<MarketStatsLight />}
        />

        <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 w-full max-w-full min-w-0 gap-6 box-border">
          {/* Concise Hub Summary Strip (GNB already exposes /stats, /explore, /technovalley) */}
          <div className="w-full px-4 py-3 rounded-2xl bg-elevated border border-border/60">
            <p className="text-xs sm:text-[13px] text-secondary font-medium">
              동탄 1·2신도시 입지 격차, GTX-A·트램 역세권 재편, 스트레스 DSR 40% 실거주 가치평가 심층 리포트 {GUIDE_ARTICLES.length}편을 국토교통부 실거래 데이터 기준으로 정리했습니다.
            </p>
          </div>

          {/* Bidirectional Live House Price Comparison Bridge to /stats */}
          <GuideStatsComparisonBridge
            guideSlug="guide-index"
            guideTitle="동탄 부동산 비교 가이드 허브"
            placement="guide_index_top"
            compact
          />

          {/* Site-Wide Interactive Engagement Strip: 1:1 Balance Matchup + Budget Tier Reality Check */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <BalanceMatchupWidget
              matchups={resolveBalanceMatchups('guide_hub', getSyncTxSummaryMap())}
              surface="guide_hub"
              heading="읽기 전 워밍업 · 동탄 1:1 밸런스 맞대결"
              compact
            />
            <BudgetTierChallengeWidget
              catalog={extractVerifiedComplexCatalog(getSyncTxSummaryMap())}
              surface="guide_hub"
              variant="compact"
            />
          </div>

          {/* Top Inflow Guides & High-Dwell Apartment Conversion Slot */}
          <section
            data-testid="guide-index-top-conversion-hub"
            aria-label="유입 상위 가이드 및 실거래 체류 상위 대장 단지"
            className="w-full p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-primary">
                많이 찾는 핵심 가이드 · 주요 대장 단지
              </h2>
              <GuideAptCtaLink
                item={lakeEduPreview}
                href={
                  lakeEduPreview?.href ||
                  `/apartment/${encodeURIComponent('동탄더샵레이크에듀타운')}`
                }
                apartmentName={lakeEduPreview?.name || '동탄더샵레이크에듀타운'}
                canonicalSlug={lakeEduPreview?.canonicalSlug || '동탄더샵레이크에듀타운'}
                displayName={lakeEduPreview?.displayName || '동탄더샵레이크에듀타운'}
                dong={lakeEduPreview?.dong || '산척동'}
                guideSlug="guide-index"
                placement="article_top"
                sectionTitle="가이드 허브 상단 동탄더샵레이크에듀타운 바로가기"
                dataTestId="guide-index-lake-edutown-spotlight"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-extrabold transition-colors w-fit shrink-0 tabular-nums"
              >
                <span>
                  {`동탄더샵레이크에듀타운${
                    lakeEduPreview?.latestPriceStr ? ` · 최근 ${lakeEduPreview.latestPriceStr}` : ''
                  }`}
                </span>
                <ArrowUpRight size={13} className="shrink-0" />
              </GuideAptCtaLink>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {TOP_ACQUISITION_ENTRY_ROUTES.map((route) => (
                <Link
                  key={`guide-hub-route-${route.id}`}
                  href={route.href} prefetch={false}
                  className="p-3.5 rounded-xl bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#eff1f5] dark:bg-[#1e2532] text-primary border border-border/60">
                      {route.badge}
                    </span>
                    <ArrowUpRight size={13} className="text-tertiary shrink-0" />
                  </div>
                  <p className="text-xs sm:text-[13px] font-extrabold text-primary line-clamp-1">
                    {route.title}
                  </p>
                  <p className="text-[11px] text-secondary line-clamp-1">
                    {route.subtitle}
                  </p>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {HIGH_CONVERSION_FLAGSHIP_APARTMENTS.map((aptName) => {
                const previewItem = buildGuideAptMiniPreview(aptName);
                if (!previewItem) return null;
                return (
                  <GuideAptPreviewCard
                    key={`guide-hub-flagship-${previewItem.canonicalSlug}`}
                    item={previewItem}
                    guideSlug="guide-index"
                    placement="article_top"
                    sectionTitle="가이드 허브 고전환 핵심 대장 단지"
                  />
                );
              })}
            </div>
          </section>

          {/* Top In-Feed Zero-CLS AdSlot */}
          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div
              data-testid="guide-index-adslot-top"
              className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
            >
              <AdSlot
                refreshSlotId="1000000001_guide_index_top"
                format="rectangle"
                minHeightClass="min-h-[250px]"
                cpaCampaignId="mortgage-refinance"
                apartmentName="동탄 가이드"
              />
            </div>
          )}

          {/* Articles Grid — Synchronized 2-Column Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {GUIDE_ARTICLES.map((article) => {
              const cardTitle = getGuideCardTitle(article.slug, article.title);
              const cardSummary = getGuideCardSummary(
                article.slug,
                article.subtitle,
                article.description
              );

              return (
                <article
                  key={article.slug}
                  className="bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] rounded-2xl p-5 sm:p-6 transition-colors group flex flex-col justify-between gap-4 min-w-0"
                >
                  <div className="min-w-0">
                    {/* Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={getVisualSignalPillClass({ tone: 'neutral', size: 'xs' })}>
                          {getCompactGuideCategory(article.category)}
                        </span>
                        {isTopLandingGuideSlug(article.slug) && (
                          <span
                            data-testid="guide-index-card-top3-badge"
                            className={getVisualSignalPillClass({ tone: 'jackpot', size: 'xs' })}
                          >
                            인기 TOP 3
                          </span>
                        )}
                      </div>
                      <span className="text-[11.5px] text-tertiary font-medium tabular-nums shrink-0">
                        {article.date} · {article.readingTime}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="mt-3 text-[17px] sm:text-[18px] font-black text-primary tracking-tight leading-snug line-clamp-2 break-keep group-hover:text-primary transition-colors">
                      <Link href={`/guide/${article.slug}`} prefetch={false}>
                        {cardTitle}
                      </Link>
                    </h2>

                    {/* Single Crisp Summary */}
                    <p className="mt-2 text-[13px] font-medium text-secondary leading-relaxed line-clamp-2 break-keep">
                      {cardSummary}
                    </p>

                    {/* Featured Apartments Inline Links (Top 3) */}
                    {article.featuredApartments && article.featuredApartments.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        {article.featuredApartments.slice(0, 3).map((aptName) => {
                          const preview = buildGuideAptMiniPreview(aptName);
                          const canonicalSlug =
                            preview?.canonicalSlug || resolveCanonicalAptSlug(aptName) || aptName;
                          const labelText = preview?.displayName || aptName;
                          return (
                            <GuideAptCtaLink
                              key={aptName}
                              item={preview}
                              href={`/apartment/${encodeURIComponent(canonicalSlug)}`}
                              apartmentName={preview?.name || aptName}
                              canonicalSlug={canonicalSlug}
                              displayName={labelText}
                              dong={preview?.dong}
                              guideSlug={article.slug}
                              placement="article_bottom"
                              sectionTitle="가이드 목록 카드 대표 단지 바로가기"
                              dataTestId="guide-index-card-apt-cta-pill"
                              className="inline-flex flex-wrap items-baseline gap-x-1 max-w-full min-w-0 text-[12px] font-bold text-secondary hover:text-primary transition-colors tabular-nums"
                            >
                              <span>{labelText}</span>
                              {preview && preview.latestPrice > 0 && (
                                <span className="text-primary font-extrabold">
                                  · {preview.latestPriceStr}
                                </span>
                              )}
                            </GuideAptCtaLink>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bottom CTA */}
                  <div className="pt-3 border-t border-border flex items-center justify-end">
                    <Link
                      href={`/guide/${article.slug}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1 text-primary font-extrabold text-[13px] hover:underline"
                    >
                      <span>전문 읽기</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Morning 7 AM Real-Transaction Alert & Watchlist Revisit Retention Card */}
          <GuideMorningAlertRetentionCard
            guideSlug="guide-index"
            apartments={hubRetentionApts}
            surface="guide_hub"
            sectionId="guide-hub-morning-alert-retention"
          />

          {/* Bottom Zero-CLS AdSlot */}
          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div
              data-testid="guide-index-adslot-bottom"
              className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden empty:hidden"
            >
              <AdSlot
                refreshSlotId="1000000002_guide_index_bottom"
                format="rectangle"
                minHeightClass="min-h-[250px]"
                cpaCampaignId="jeonse-sentinel"
                apartmentName="동탄 가이드"
              />
            </div>
          )}
        </div>
      </main>

      <MobileDock activeTab="guide" />
    </div>
  );
}
