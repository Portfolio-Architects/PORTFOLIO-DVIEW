import { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getInitialData } from '@/lib/services/dashboardData';
import ExploreClient from './ExploreClient';
import PageHeroHeader from '@/components/PageHeroHeader';
import { getExploreSchema, safeJsonLd } from '@/lib/utils/structuredData';

export const revalidate = 600; // Revalidate every 10 minutes (ISR)

export const metadata: Metadata = {
  title: 'D-VIEW 아파트 탐색 | 동탄 전역 아파트 실거래가 및 입지 가치 비교',
  description: '동탄 179개 아파트 단지의 실거래가 변동 추이, 평단가 순위, 전세가율 갭투자 리스크 및 입지 가치 분석 표 제공.',
  alternates: {
    canonical: '/explore',
  },
};

function ExploreSkeleton() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface relative pb-[env(safe-area-inset-bottom)]">
      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto overflow-x-hidden">
        <PageHeroHeader 
          title="D-VIEW 아파트 탐색"
          subtitleStrong="동탄 전역 아파트 비교 분석"
          subtitleLight="시세, 거래량, 관심도 등 다양한 지표로 아파트를 탐색하세요"
        />
        <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-0 flex flex-col animate-pulse">
          <div className="flex w-full bg-surface md:rounded-2xl md:border md:border-border/80 md:shadow-sm items-stretch flex-1 min-h-0">
            {/* Sidebar Skeleton (Hidden on Mobile) */}
            <aside 
              style={{ width: '240px' }}
              className="hidden md:flex flex-col w-auto shrink-0 border-r border-border bg-neutral-50/40 dark:bg-zinc-900/10 py-6 px-4 sticky top-[68px] self-start md:rounded-l-2xl"
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
                <div className="hidden md:flex sticky top-[68px] z-20 bg-surface/90 backdrop-blur-md items-center md:pl-8 md:pr-[47px] py-3.5 border-b border-neutral-100 dark:border-zinc-900/40 text-[12.5px] font-extrabold text-neutral-500 dark:text-neutral-400 shrink-0 select-none shadow-sm">
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
                        <div className="hidden md:flex items-center md:px-4 h-[66px] border border-neutral-100/70 dark:border-zinc-900/40 rounded-2xl bg-white dark:bg-zinc-950">
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
                        <div className="flex md:hidden items-center justify-between px-4 h-[64px] border-b border-neutral-100/40 dark:border-zinc-900/10 bg-white dark:bg-zinc-950">
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
  return <ExploreClient initialDashboardData={initialData} />;
}

export default async function ExplorePage() {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;
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
