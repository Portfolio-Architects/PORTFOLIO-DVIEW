import { Metadata } from 'next';
import { Suspense } from 'react';
import { getInitialData } from '@/lib/services/dashboardData';
import ExploreClient from './ExploreClient';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';
import { getExploreSchema, safeJsonLd } from '@/lib/utils/structuredData';
import { DongApartment } from '@/lib/dong-apartments';
import Link from 'next/link';
import { ZONES } from '@/lib/zones';

export const revalidate = 600; // Revalidate every 10 minutes (ISR)

const EXPLORE_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent('동탄 184개 아파트 실거래가 비교표')}&subtitle=${encodeURIComponent('평당가 랭킹 · 전세가율 · 학군 · 동탄역 거리 조건 탐색')}`;

export const metadata: Metadata = {
  title: '동탄 184개 아파트 실거래가 순위·평당가·전세가율 비교표 | D-VIEW 아파트 탐색',
  description: '동탄 1·2신도시 184개 아파트 단지의 국토교통부 최신 실거래가, 평당가 랭킹, 전세가율·역전세 안전마진, 초품아 학군·동탄역 거리 조건 필터링 및 단지 비교표를 제공합니다.',
  alternates: {
    canonical: 'https://dongtanview.com/explore',
  },
  openGraph: {
    title: '동탄 184개 아파트 실거래가 순위·평당가·전세가율 비교표 | D-VIEW 아파트 탐색',
    description: '동탄 1·2신도시 184개 아파트 단지의 국토교통부 최신 실거래가, 평당가 랭킹, 전세가율·역전세 안전마진, 초품아 학군·동탄역 거리 조건 필터링 및 단지 비교표를 제공합니다.',
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
    description: '동탄 1·2신도시 184개 아파트 단지의 국토교통부 최신 실거래가, 평당가 랭킹, 전세가율·역전세 안전마진 및 단지 비교표를 제공합니다.',
    images: [EXPLORE_OG_IMAGE_URL],
  },
};

function ExploreSkeleton() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-transparent relative pb-[env(safe-area-inset-bottom)]">
      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden">
        <PageHeroHeader 
          title="D-VIEW 아파트 탐색"
          subtitleStrong={<MarketStatsStrong />}
          subtitleLight={<MarketStatsLight text="예산·학군·동탄역 거리로 조건에 맞는 단지만 걸러보기" />}
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
  );
}

async function ExploreDataLoader() {
  const initialData = await getInitialData();
  
  // Extract all apartments for SEO injection
  const apartmentsList: DongApartment[] = [];
  if (initialData.sheetApartments) {
    Object.entries(initialData.sheetApartments).forEach(([dong, apts]) => {
      if (Array.isArray(apts)) {
        apts.forEach((apt: DongApartment) => {
          if (apt && apt.name) {
            apartmentsList.push({
              name: apt.name,
              dong: dong,
              householdCount: apt.householdCount,
              yearBuilt: apt.yearBuilt,
              brand: apt.brand
            });
          }
        });
      }
    });
  }

  const txSummary = initialData.txSummary || {};

  const formatPrice = (val: number) => {
    if (!val || val === 0) return '정보 없음';
    const eok = Math.floor(val / 10000);
    const remainder = Math.round(val % 10000);
    if (eok === 0) return `${remainder.toLocaleString()}만원`;
    if (remainder === 0) return `${eok}억원`;
    return `${eok}억 ${remainder.toLocaleString()}만원`;
  };

  return (
    <>
      {/* SSR SEO Semantic HTML Block */}
      <section
        id="explore-ssr-semantic-catalog"
        aria-label="동탄 전역 아파트 실거래가 및 입지 가치 비교 카탈로그"
        className="sr-only"
      >
        <header>
          <h1>동탄 전역 아파트 실거래가 및 입지 가치 비교 탐색 리포트</h1>
          <p>동탄 1, 2신도시 전체 184개 단지의 인프라, 전세가율, 세대수, 연식 일괄 비교 분석 맵</p>
        </header>
        <table>
          <thead>
            <tr>
              <th>단지명</th>
              <th>행정동</th>
              <th>연식</th>
              <th>세대수</th>
              <th>평균 매매가</th>
              <th>평균 전세가</th>
              <th>전세가율</th>
            </tr>
          </thead>
          <tbody>
            {apartmentsList.map((apt) => {
              const summary = txSummary[apt.name] || {};
              const salesPrice = summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0;
              const rentPrice = summary.avg1MRentDeposit || summary.avg3MRentDeposit || summary.latestRentDeposit || 0;
              const ratio = salesPrice > 0 && rentPrice > 0 ? Math.round((rentPrice / salesPrice) * 100) : 0;

              return (
                <tr key={apt.name}>
                  <td>
                    <Link href={`/apartment/${encodeURIComponent(apt.name)}`} prefetch={false}>
                      {apt.name}
                    </Link>
                  </td>
                  <td>{apt.dong}</td>
                  <td>{apt.yearBuilt ? `${apt.yearBuilt}년` : '정보 없음'}</td>
                  <td>{apt.householdCount ? `${apt.householdCount}세대` : '정보 없음'}</td>
                  <td>{formatPrice(salesPrice)}</td>
                  <td>{formatPrice(rentPrice)}</td>
                  <td>{ratio > 0 ? `${ratio}%` : '정보 없음'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <nav aria-label="동탄 7대 핵심 권역별 아파트 시세 분석">
          <ul>
            {ZONES.map((zone) => (
              <li key={zone.id}>
                <Link href={`/zone/${zone.id}`} prefetch={false}>
                  {zone.name} ({zone.dongLabel}) 아파트 시세 리포트
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
      <ExploreClient initialDashboardData={initialData} />
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
