import { Metadata } from 'next';
import { Suspense } from 'react';
import { getInitialData } from '@/lib/services/dashboardData';
import { toSlimExploreInitialData } from '@/lib/services/slimInitialPayload';
import ExploreClient from './ExploreClient';
import ExploreCatalogRows, {
  type CompactExploreCatalogRow,
} from '@/components/explore/ExploreCatalogRows';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { getExploreSchema, safeJsonLd } from '@/lib/utils/structuredData';
import { DongApartment } from '@/lib/dong-apartments';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import Link from 'next/link';
import { DviewIcon } from '@/components/common/DviewIcon';
import { ZONES } from '@/lib/zones';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionChevronClass,
  getSeoAccordionBodyClass,
} from '@/lib/design-system/copyDiet';

export const dynamic = 'force-static';
export const revalidate = false; // Pure SSG

const EXPLORE_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent('동탄 184개 아파트 실거래가 비교표')}&subtitle=${encodeURIComponent('평당가 랭킹 · 전세가율 · 학군 · 동탄역 거리 조건 탐색')}`;

export const metadata: Metadata = {
  title: '동탄 184개 아파트 실거래가 순위·평당가·전세가율 비교표 | D-VIEW 아파트 탐색',
  description: '동탄 아파트 순위·1·2신도시 184개 단지 국토교통부 최신 실거래가, 평당가 랭킹, 전세가율·역전세 안전마진, 초품아 학군·동탄역 거리 조건 필터링 및 주담대 DSR 한도를 한눈에 비교하세요.',
  keywords: [
    '동탄 아파트 순위',
    '동탄 아파트 탐색',
    '동탄 아파트 실거래가 순위',
    '동탄 평당가 랭킹',
    '동탄 아파트 가격 순위',
    '동탄 전세가율 비교',
    '동탄 184개 아파트 비교표',
    '동탄1신도시 아파트 시세',
    '동탄2신도시 아파트 시세',
    '동탄 초품아 학군 비교',
    '동탄역 역세권 아파트',
    'D-VIEW 아파트 탐색',
    '디뷰',
    '동뷰',
    '동탄뷰',
  ],
  alternates: {
    canonical: 'https://dongtanview.com/explore',
    types: {
      'application/rss+xml': 'https://dongtanview.com/feed.xml',
    },
  },
  openGraph: {
    title: '동탄 184개 아파트 실거래가 순위·평당가·전세가율 비교표 | D-VIEW 아파트 탐색',
    description: '동탄 아파트 순위·1·2신도시 184개 단지 국토교통부 최신 실거래가, 평당가 랭킹, 전세가율·역전세 안전마진, 초품아 학군·동탄역 거리 조건 필터링 및 주담대 DSR 한도 비교.',
    url: 'https://dongtanview.com/explore',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: EXPLORE_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'D-VIEW 동탄 184개 아파트 실거래가 비교표',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '동탄 184개 아파트 실거래가 순위·평당가·전세가율 비교표 | D-VIEW 아파트 탐색',
    description: '동탄 아파트 순위·1·2신도시 184개 단지 국토교통부 최신 실거래가, 평당가 랭킹 및 전세가율 비교표.',
    images: [EXPLORE_OG_IMAGE_URL],
  },
};

function ExploreSkeleton() {
  return (
    <>
      <div className="flex flex-col min-h-[100dvh] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
        <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden">
          <PageHeroHeader
            title="D-VIEW 아파트 탐색"
            subtitleStrong={<MarketStatsStrong />}
            subtitleLight={<MarketStatsLight />}
            isTitleDiv={true}
          />
          <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 flex-1 min-h-0 flex flex-col animate-pulse">
            <div className="flex w-full bg-surface md:rounded-2xl md:border md:border-border/80 min-h-[540px] p-4 sm:p-6 gap-6">
              <aside className="hidden md:flex flex-col w-[240px] shrink-0 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-full h-9 bg-black/5 dark:bg-surface/5 rounded-xl" />
                ))}
              </aside>
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="h-10 w-48 bg-black/5 dark:bg-surface/5 rounded-xl" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 w-full bg-black/5 dark:bg-surface/5 rounded-2xl" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-2 pb-10">
        <div className="h-[48px] rounded-2xl bg-black/5 dark:bg-surface/5 animate-pulse" />
      </div>
    </>
  );
}

async function ExploreDataLoader() {
  const initialData = await getInitialData();
  
  const txSummary = initialData.txSummary || {};

  // Extract all apartments for SEO injection
  const apartmentsList: Array<DongApartment & { canonicalSlug: string }> = [];
  const seenCanonicalSlugs = new Set<string>();
  if (initialData.sheetApartments) {
    Object.entries(initialData.sheetApartments).forEach(([dong, apts]) => {
      if (Array.isArray(apts)) {
        apts.forEach((apt: DongApartment) => {
          if (apt && apt.name) {
            const canonicalSlug =
              resolveCanonicalAptSlug(apt.name, {
                txKey: apt.txKey,
                txMap: txSummary,
                sheetApartments: initialData.sheetApartments,
                dong,
              }) || apt.name;
            seenCanonicalSlugs.add(canonicalSlug);
            apartmentsList.push({
              name: apt.name,
              dong: dong,
              txKey: apt.txKey,
              canonicalSlug,
              householdCount: apt.householdCount,
              yearBuilt: apt.yearBuilt,
              brand: apt.brand
            });
          }
        });
      }
    });
  }

  Object.entries(txSummary).forEach(([txKey, summary]) => {
    if (!seenCanonicalSlugs.has(txKey)) {
      seenCanonicalSlugs.add(txKey);
      apartmentsList.push({
        name: txKey,
        dong: typeof summary?.dong === 'string' && summary.dong ? summary.dong : '동탄권역',
        txKey,
        canonicalSlug: txKey,
        householdCount: typeof summary?.householdCount === 'number' ? summary.householdCount : undefined,
        yearBuilt: summary?.yearBuilt !== undefined && summary?.yearBuilt !== null ? String(summary.yearBuilt) : undefined,
      });
    }
  });

  const formatSsrYearBuilt = (raw?: string | number) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length >= 6) {
      return `${digits.slice(0, 4)}.${digits.slice(4, 6)}`;
    }
    if (digits.length === 4) {
      return `${digits}년`;
    }
    return `${raw}년`;
  };

  const compactCatalogRows: CompactExploreCatalogRow[] = apartmentsList.map((apt) => {
    const { canonicalSlug } = apt;
    const hasDetailPage = Boolean(txSummary[canonicalSlug] || txSummary[apt.name]);
    const summary = txSummary[canonicalSlug] || txSummary[apt.name] || {};
    const salesPrice = Math.round(summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0);
    const rentPrice = Math.round(summary.avg1MRentDeposit || summary.avg3MRentDeposit || summary.latestRentDeposit || 0);
    const households =
      typeof apt.householdCount === 'number' && apt.householdCount > 0
        ? apt.householdCount
        : apt.householdCount
        ? String(apt.householdCount)
        : 0;

    return [
      apt.name,
      canonicalSlug === apt.name ? '' : canonicalSlug,
      apt.dong,
      formatSsrYearBuilt(apt.yearBuilt),
      households,
      salesPrice,
      rentPrice,
      hasDetailPage ? 1 : 0,
    ];
  });

  return (
    <>
      <ExploreClient initialDashboardData={toSlimExploreInitialData(initialData)} />
      {/* SSR SEO Semantic HTML Block (Collapsed Layer 2 Accordion for Clean UX & Crawlers) */}
      <section
        id="explore-ssr-semantic-catalog"
        aria-label="동탄 전역 아파트 실거래가 및 입지 가치 비교 카탈로그"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-2 pb-10 tabular-nums"
      >
        <details className={getSeoAccordionClass()}>
          <summary className={getSeoAccordionSummaryClass()}>
            <span>전체 단지 실거래 요약 · 권역별 시세 더보기</span>
            <DviewIcon name="chevron-down" size={16} className={getSeoAccordionChevronClass()} />
          </summary>
          <div className={getSeoAccordionBodyClass('space-y-4')}>
            <header>
              <h2 className="text-xs sm:text-sm font-extrabold text-primary">
                동탄 전역 아파트 실거래가 및 입지 가치 비교 탐색 리포트
              </h2>
              <p className="mt-1 text-xs text-tertiary">
                동탄 1·2신도시 전체 {apartmentsList.length}개 단지의 준공연월, 세대수, 평균 매매·전세 실거래가 및 전세가율 요약표입니다.
              </p>
            </header>
            <div className="rounded-xl bg-body dark:bg-[#202027]/70 p-3 sm:p-4">
              <div className="dview-explore-tbl max-h-72 overflow-x-auto overflow-y-auto [&_table]:w-full [&_table]:min-w-[640px] [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-body dark:[&_thead]:bg-[#202027] [&_tbody]:divide-y [&_tbody]:divide-slate-200/60 dark:[&_tbody]:divide-slate-800/70">
                <table>
                  <caption className="sr-only">동탄 전역 184개 아파트 실거래가 및 전세가율 비교 표</caption>
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                      <th scope="col" className="py-2.5 pr-3 whitespace-nowrap">단지명</th>
                      <th scope="col" className="py-2.5 px-3 whitespace-nowrap">행정동</th>
                      <th scope="col" className="py-2.5 px-3 text-right whitespace-nowrap">준공</th>
                      <th scope="col" className="py-2.5 px-3 text-right whitespace-nowrap">세대수</th>
                      <th scope="col" className="py-2.5 px-3 text-right whitespace-nowrap">평균 매매가</th>
                      <th scope="col" className="py-2.5 px-3 text-right whitespace-nowrap">평균 전세가</th>
                      <th scope="col" className="py-2.5 pl-3 text-right whitespace-nowrap">전세가율</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ExploreCatalogRows rows={compactCatalogRows} />
                  </tbody>
                </table>
              </div>
            </div>
            <nav aria-label="동탄 7대 핵심 권역별 아파트 시세 분석" className="space-y-2">
              <h3 className="text-xs font-extrabold text-primary">7대 권역별 아파트 시세 리포트</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
                {ZONES.map((zone) => (
                  <li key={zone.id}>
                    <Link
                      href={`/zone/${zone.id}`}
                      prefetch={false}
                      className="group flex items-center justify-between gap-2 rounded-xl bg-body dark:bg-[#202027]/70 hover:bg-slate-100/80 dark:hover:bg-[#2c2c35] px-3 py-2 text-xs transition-colors"
                    >
                      <span className="font-bold text-primary group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                        {zone.name} 아파트 시세 리포트
                      </span>
                      <span className="text-[11px] text-tertiary shrink-0">{zone.dongLabel}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </details>
      </section>
    </>
  );
}

export default async function ExplorePage() {
  const nonce = undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const jsonLd = getExploreSchema(baseUrl);

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreDataLoader />
      </Suspense>
    </>
  );
}
