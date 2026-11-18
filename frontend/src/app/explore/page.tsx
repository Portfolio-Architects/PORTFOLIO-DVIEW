import { Metadata } from 'next';
import { Suspense } from 'react';
import { getInitialData } from '@/lib/services/dashboardData';
import { toSlimExploreInitialData } from '@/lib/services/slimInitialPayload';
import ExploreClient from './ExploreClient';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { getExploreSchema, safeJsonLd } from '@/lib/utils/structuredData';
import { DongApartment } from '@/lib/dong-apartments';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
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
        <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-0 flex flex-col animate-pulse">
          <div className="flex w-full bg-surface md:rounded-2xl md:border md:border-border/80 md:shadow-sm items-stretch flex-1 min-h-0">
            {/* Sidebar Skeleton (Hidden on Mobile) */}
            <aside 
              style={{ width: '240px' }}
              className="hidden md:flex flex-col w-auto shrink-0 border-r border-border bg-slate-50/40 dark:bg-slate-900/10 py-6 px-4 sticky top-[68px] self-start md:rounded-l-2xl"
            >
              <div className="mb-6">
                <div className="w-16 h-4 bg-black/5 dark:bg-surface/5 rounded mb-3" />
                <div className="flex flex-col gap-1">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="w-full h-[36px] bg-black/5 dark:bg-surface/5 rounded-xl" />
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <div className="w-20 h-4 bg-black/5 dark:bg-surface/5 rounded mb-3" />
                <div className="flex flex-col gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-full h-[36px] bg-black/5 dark:bg-surface/5 rounded-xl" />
                  ))}
                </div>
              </div>
            </aside>

            {/* Drag Splitter Resizer Skeleton */}
            <div className="hidden md:block w-1 bg-border/80 shrink-0" />

            {/* Main Table Area Skeleton */}
            <div className="flex-1 flex flex-col bg-transparent min-w-0 md:pl-6 lg:pl-8 md:pr-6 lg:pr-8 py-2 md:rounded-r-2xl">
              {/* Title, Total count and Search Bar Skeleton */}
              <div className="px-0 py-3 md:py-4 border-b border-border flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md relative z-30">
                <div className="flex flex-row justify-between items-center md:flex-col md:items-start w-full md:w-auto">
                  <div className="w-40 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
                  <div className="w-20 h-4 bg-black/5 dark:bg-surface/5 rounded mt-2 hidden md:block" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2.5 w-full md:w-auto shrink-0">
                  <div className="w-full md:w-[220px] h-[38px] bg-black/5 dark:bg-surface/5 rounded-xl" />
                  <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar shrink-0 py-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-[100px] h-[36px] bg-black/5 dark:bg-surface/5 rounded-full shrink-0" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col relative">
                {/* Table Header Skeleton (Desktop Only) */}
                <div className="hidden md:flex sticky top-[68px] z-20 bg-surface/90 backdrop-blur-md items-center md:pl-8 md:pr-[47px] py-3.5 border-b border-slate-100 dark:border-slate-900/40 text-[12.5px] font-extrabold text-slate-500 dark:text-slate-400 shrink-0 select-none shadow-sm">
                  <div className="w-[36px] shrink-0" />
                  <div className="w-[40px] text-center shrink-0">순위</div>
                  <div className="flex-1 min-w-[120px] ml-2 text-left">단지명</div>
                  <div className="w-[105px] text-right pr-2 shrink-0 hidden xl:block">연식</div>
                  <div className="w-[100px] text-right pr-2 shrink-0">매매가</div>
                  <div className="w-[85px] text-right pr-2 shrink-0">평당가</div>
                  <div className="w-[110px] text-right pr-2 shrink-0 hidden lg:block">전세가</div>
                  <div className="w-[80px] text-right pr-2 shrink-0 hidden xl:block">세대수</div>
                  <div className="w-[100px] text-right pr-2 shrink-0 hidden xl:block">거래량</div>
                </div>

                {/* Table Body Skeleton */}
                <div className="w-full flex-1 pt-1.5">
                  <div className="flex flex-col w-full">
                    {[...Array(15)].map((_, i) => (
                      <div key={i} className="w-full flex flex-col px-0 md:px-4 py-0.5 md:py-1">
                        {/* Desktop item skeleton */}
                        <div className="hidden md:flex items-center md:px-4 h-[66px] border border-slate-100/70 dark:border-slate-900/40 rounded-2xl bg-white dark:bg-slate-950">
                          <div className="w-[36px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded" />
                          <div className="w-[40px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded mx-auto" />
                          <div className="flex-1 min-w-[120px] ml-2 h-5 bg-black/5 dark:bg-surface/5 rounded" />
                          <div className="w-[105px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2 hidden xl:block" />
                          <div className="w-[100px] shrink-0 h-5 bg-black/5 dark:bg-surface/5 rounded ml-2" />
                          <div className="w-[85px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2" />
                          <div className="w-[110px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2 hidden lg:block" />
                          <div className="w-[80px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2 hidden xl:block" />
                          <div className="w-[100px] shrink-0 h-4 bg-black/5 dark:bg-surface/5 rounded ml-2 hidden xl:block" />
                        </div>
                        {/* Mobile item skeleton */}
                        <div className="flex md:hidden items-center justify-between px-4 h-[64px] border-b border-slate-100/40 dark:border-slate-900/10 bg-white dark:bg-slate-950">
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                            <div className="w-[20px] h-[20px] rounded-full bg-black/5 dark:bg-surface/5 shrink-0" />
                            <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                              <div className="w-1/2 h-4 bg-black/5 dark:bg-surface/5 rounded" />
                              <div className="w-3/4 h-3 bg-black/5 dark:bg-surface/5 rounded" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="w-14 h-4 bg-black/5 dark:bg-surface/5 rounded" />
                              <div className="w-10 h-3 bg-black/5 dark:bg-surface/5 rounded" />
                            </div>
                            <div className="w-[16px] h-[16px] rounded-full bg-black/5 dark:bg-surface/5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
      {/* Layer 2 Collapsed SEO Accordion Placeholder (Zero-CLS) */}
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

  const formatPrice = (val: number) => {
    if (!val || val === 0) return '정보 없음';
    const eok = Math.floor(val / 10000);
    const remainder = Math.round(val % 10000);
    if (eok === 0) return `${remainder.toLocaleString()}만원`;
    if (remainder === 0) return `${eok}억원`;
    return `${eok}억 ${remainder.toLocaleString()}만원`;
  };

  const formatSsrYearBuilt = (raw?: string | number) => {
    if (!raw) return '정보 없음';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length >= 6) {
      return `${digits.slice(0, 4)}.${digits.slice(4, 6)}`;
    }
    if (digits.length === 4) {
      return `${digits}년`;
    }
    return `${raw}년`;
  };

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
            <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
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
              <div className="max-h-72 overflow-x-auto overflow-y-auto [&_table]:w-full [&_table]:min-w-[640px] [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-body dark:[&_thead]:bg-[#202027] [&_tbody]:divide-y [&_tbody]:divide-slate-200/60 dark:[&_tbody]:divide-slate-800/70">
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
                    {apartmentsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-500 dark:text-slate-400">
                          등록된 실거래 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      apartmentsList.map((apt) => {
                        const { canonicalSlug } = apt;
                        const hasDetailPage = Boolean(txSummary[canonicalSlug] || txSummary[apt.name]);
                        const summary = txSummary[canonicalSlug] || txSummary[apt.name] || {};
                        const salesPrice = summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0;
                        const rentPrice = summary.avg1MRentDeposit || summary.avg3MRentDeposit || summary.latestRentDeposit || 0;
                        const ratio = salesPrice > 0 && rentPrice > 0 ? Math.round((rentPrice / salesPrice) * 100) : 0;
                        const formattedHouseholds =
                          typeof apt.householdCount === 'number' && apt.householdCount > 0
                            ? `${apt.householdCount.toLocaleString()}세대`
                            : apt.householdCount
                            ? `${apt.householdCount}세대`
                            : '정보 없음';

                        return (
                          <tr
                            key={`${apt.dong}-${apt.name}`}
                            className="hover:bg-slate-100/70 dark:hover:bg-[#2c2c35]/50 transition-colors"
                          >
                            <td className="py-2 pr-3 font-bold text-primary whitespace-nowrap">
                              {hasDetailPage ? (
                                <Link
                                  href={`/apartment/${encodeURIComponent(canonicalSlug)}`}
                                  prefetch={false}
                                  className="hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2"
                                >
                                  {apt.name}
                                </Link>
                              ) : (
                                <span>{apt.name}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-secondary whitespace-nowrap">{apt.dong}</td>
                            <td className="py-2 px-3 text-right text-secondary tabular-nums whitespace-nowrap">
                              {formatSsrYearBuilt(apt.yearBuilt)}
                            </td>
                            <td className="py-2 px-3 text-right text-secondary tabular-nums whitespace-nowrap">
                              {formattedHouseholds}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-primary tabular-nums whitespace-nowrap">
                              {formatPrice(salesPrice)}
                            </td>
                            <td className="py-2 px-3 text-right text-secondary tabular-nums whitespace-nowrap">
                              {formatPrice(rentPrice)}
                            </td>
                            <td
                              className={`py-2 pl-3 text-right tabular-nums whitespace-nowrap ${
                                ratio > 0
                                  ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {ratio > 0 ? `${ratio}%` : '정보 없음'}
                            </td>
                          </tr>
                        );
                      })
                    )}
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
