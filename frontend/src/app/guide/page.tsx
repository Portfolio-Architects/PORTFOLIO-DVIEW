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
          {/* Top Action & Summary Bar (Synchronized with Main Dashboard Control Bar) */}
          <div className="w-full p-3 sm:p-4 rounded-2xl bg-surface border border-border/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1 rounded-lg border border-emerald-500/20 w-fit shrink-0">
                <span>D-VIEW 부동산 데이터 랩스 공식 인사이트</span>
              </span>
              <p className="text-xs sm:text-[13px] text-secondary font-medium">
                동탄 1·2신도시 구조적 입지 격차, GTX-A·트램 역세권 재편, 스트레스 DSR 40% 실거주 PER 가치평가 실증 리포트
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison" prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                <span>동탄1 vs 동탄2 집값 통계 비교</span>
              </Link>
              <Link
                href="/explore" prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                <span>184개 단지 탐색</span>
              </Link>
              <Link
                href="/technovalley" prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                <span>지식산업센터 카탈로그</span>
              </Link>
            </div>
          </div>

          {/* Bidirectional Live House Price Comparison Bridge to /stats */}
          <GuideStatsComparisonBridge
            guideSlug="guide-index"
            guideTitle="동탄 부동산 비교 가이드 허브"
            placement="guide_index_top"
            compact
          />

          {/* Top Inflow Guides & High-Dwell Apartment Conversion Slot */}
          <section
            data-testid="guide-index-top-conversion-hub"
            aria-label="유입 상위 가이드 및 실거래 체류 상위 대장 단지"
            className="w-full p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  신규 유입 TOP 3 · 고전환 단지 허브
                </span>
                <h2 className="text-sm sm:text-base font-extrabold text-primary">
                  구글·ChatGPT 유입 1위 핵심 가이드 & 체류 상위 대장 단지 프리뷰
                </h2>
              </div>
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors w-fit shrink-0 tabular-nums"
              >
                <span>
                  {`동탄더샵레이크에듀타운 (평균 15분 체류${
                    lakeEduPreview?.latestPriceStr ? ` · ${lakeEduPreview.latestPriceStr}` : ''
                  })`}
                </span>
                <ArrowUpRight size={13} className="shrink-0" />
              </GuideAptCtaLink>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {TOP_ACQUISITION_ENTRY_ROUTES.map((route) => (
                <Link
                  key={`guide-hub-route-${route.id}`}
                  href={route.href} prefetch={false}
                  className="p-3.5 rounded-xl bg-body hover:bg-emerald-500/5 border border-border/60 hover:border-emerald-500/40 transition-colors flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      {route.badge}
                    </span>
                    <ArrowUpRight size={13} className="text-slate-400 shrink-0" />
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
                  className="bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] rounded-2xl p-5 sm:p-6 transition-colors group flex flex-col justify-between gap-4 min-w-0"
                >
                  <div className="min-w-0">
                    {/* Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={getVisualSignalPillClass({ tone: 'safe', size: 'xs' })}>
                          {getCompactGuideCategory(article.category)}
                        </span>
                        {isTopLandingGuideSlug(article.slug) && (
                          <span
                            data-testid="guide-index-card-top3-badge"
                            className={getVisualSignalPillClass({ tone: 'down', size: 'xs' })}
                          >
                            신규 유입 TOP 3
                          </span>
                        )}
                      </div>
                      <span className="text-[11.5px] text-tertiary font-medium tabular-nums shrink-0">
                        {article.date} · {article.readingTime}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="mt-3 text-[17px] sm:text-[18px] font-black text-primary tracking-tight leading-snug line-clamp-2 break-keep group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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
                              className="inline-flex flex-wrap items-baseline gap-x-1 max-w-full min-w-0 text-[12px] font-bold text-secondary hover:text-blue-600 dark:hover:text-blue-400 transition-colors tabular-nums"
                            >
                              <span>{labelText}</span>
                              {preview && preview.latestPrice > 0 && (
                                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
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
                  <div className="pt-3 border-t border-[#f2f4f6] dark:border-[#202027] flex items-center justify-end">
                    <Link
                      href={`/guide/${article.slug}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold text-[13px] hover:underline"
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

          {/* Recirculation Hub Links */}
          <section className="bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-primary tracking-tight">
                단지별 실거래가 및 테크노밸리 세제 혜택 직접 비교
              </h2>
              <p className="text-[13px] text-secondary mt-1 font-medium">
                184개 아파트 단지 4대 금융 수리 테이블과 56개 지식산업센터 세제 혜택 데이터를 즉시 확인하세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/explore" prefetch={false}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold transition-colors"
              >
                <span>184개 단지 탐색</span>
              </Link>
              <Link
                href="/technovalley" prefetch={false}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[13px] font-bold transition-colors"
              >
                <span>지식산업센터 카탈로그</span>
              </Link>
            </div>
          </section>

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
