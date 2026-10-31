import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { AdSlot } from '@/components/ads/AdSlot';

const GUIDE_HUB_OG_IMAGE =
  'https://dongtanview.com/api/og?title=' +
  encodeURIComponent('동탄 부동산 비교 가이드 & 실거래 분석 리포트') +
  '&subtitle=' +
  encodeURIComponent('동탄1 vs 동탄2 · 동탄역 vs 호수공원 · 6억·9억·12억 예산별 랭킹');

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
          title="D-VIEW 부동산 가이드"
          compactTitle="D-VIEW 부동산 가이드"
          subtitleStrong={<MarketStatsStrong />}
          subtitleLight={<MarketStatsLight text="공공데이터와 실거주 PER 기반 동탄 권역별 심층 분석 리포트" />}
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

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                <span>184개 단지 탐색</span>
              </Link>
              <Link
                href="/technovalley"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                <span>지식산업센터 카탈로그</span>
              </Link>
            </div>
          </div>

          {/* Top In-Feed Zero-CLS AdSlot */}
          <div
            data-testid="guide-index-adslot-top"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000001"
              refreshSlotId="1000000001_guide_index_top"
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="mortgage-refinance"
              apartmentName="동탄 가이드"
            />
          </div>

          {/* Articles Grid — Synchronized 2-Column Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {GUIDE_ARTICLES.map((article) => (
              <article
                key={article.slug}
                className="bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[12px] text-tertiary mb-3">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1">
                      {article.date}
                    </span>
                    <span className="flex items-center gap-1">
                      읽는 시간 약 {article.readingTime}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span>{article.author}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <Link href={`/guide/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h2>

                  {/* Subtitle */}
                  <p className="mt-2 text-primary/80 font-bold text-[13.5px] sm:text-[14.5px]">
                    {article.subtitle}
                  </p>

                  {/* Description */}
                  <p className="mt-2.5 text-secondary text-[13px] sm:text-[13.5px] leading-relaxed font-medium">
                    {article.description}
                  </p>

                  {/* Key Takeaways Box */}
                  <div className="mt-4 bg-body p-4 rounded-xl border border-border/60">
                    <span className="text-[12px] font-extrabold text-primary mb-2 flex items-center gap-1.5">
                      <span>핵심 리포트 요약</span>
                    </span>
                    <ul className="space-y-1.5 text-[12px] sm:text-[12.5px] text-secondary font-medium list-disc pl-4">
                      {article.keyTakeaways.map((point, pIdx) => (
                        <li key={pIdx}>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Featured Apartments Quick Links */}
                  {article.featuredApartments && article.featuredApartments.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 mr-1">
                        관련 주요 단지:
                      </span>
                      {article.featuredApartments.slice(0, 5).map((aptName) => (
                        <Link
                          key={aptName}
                          href={`/apartment/${encodeURIComponent(aptName)}`}
                          prefetch={false}
                          className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 px-2.5 py-1 rounded-lg hover:underline transition-colors"
                        >
                          {aptName}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-semibold text-tertiary bg-body px-2.5 py-1 rounded-lg border border-border/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[12px] text-tertiary font-medium">실증 공공데이터 기반 리서치</span>
                  <Link
                    href={`/guide/${article.slug}`}
                    className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-[13px] sm:text-[14px] hover:underline"
                  >
                    전문 읽기
                  </Link>
                </div>
              </article>
            ))}
          </div>

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
                href="/explore"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold transition-colors"
              >
                <span>184개 단지 탐색</span>
              </Link>
              <Link
                href="/technovalley"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[13px] font-bold transition-colors"
              >
                <span>지식산업센터 카탈로그</span>
              </Link>
            </div>
          </section>

          {/* Bottom Zero-CLS AdSlot */}
          <div
            data-testid="guide-index-adslot-bottom"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000002"
              refreshSlotId="1000000002_guide_index_bottom"
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="jeonse-sentinel"
              apartmentName="동탄 가이드"
            />
          </div>
        </div>
      </main>

      <MobileDock activeTab="guide" />
    </div>
  );
}
