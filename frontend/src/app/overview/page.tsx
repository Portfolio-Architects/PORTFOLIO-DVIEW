import { Suspense } from 'react';
import Script from 'next/script';
import { Metadata } from 'next';
import DashboardClient from '@/components/DashboardClient';
import { getInitialData } from '@/lib/services/dashboardData';
import { getMainPageSchema, safeJsonLd } from '@/lib/utils/structuredData';

interface HomeTransactionRecord {
  apartmentName?: string;
  price?: number;
  areaPyeong?: number;
  floor?: number | string;
  dealType?: string;
  contractYm?: string | number;
  contractDay?: string | number;
  registeredDate?: string;
  registeredDateLabel?: string;
}

interface TxSummaryItem {
  latestPrice?: number;
  dong?: string;
  avg1MPrice?: number;
  avg1MRentDeposit?: number;
}

export const dynamic = 'force-static';
export const revalidate = 3600;

const OVERVIEW_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent('동탄 아파트 시세·실거래가·집값 추이 그래프')}&subtitle=${encodeURIComponent('동탄 1·2신도시 184개 단지 국토부 실거래가·전세가율·학군 비교 | D-VIEW')}`;

export const metadata: Metadata = {
  title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (184개 단지 전세가율·학군) | D-VIEW',
  description:
    '국토교통부 공식 실거래가 매일 동기화 — 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프, 전세가율·실거주 PER 진단 및 권역별 실거래가 데이터 분석을 제공합니다.',
  alternates: {
    canonical: 'https://dongtanview.com/overview',
  },
  openGraph: {
    title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (184개 단지 전세가율·학군) | D-VIEW',
    description:
      '국토교통부 공식 실거래가 매일 동기화 — 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프, 전세가율·실거주 PER 진단 및 권역별 실거래가 데이터 분석을 제공합니다.',
    url: 'https://dongtanview.com/overview',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: OVERVIEW_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'D-VIEW 동탄 아파트 시세·실거래가·집값 추이 그래프',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (184개 단지 전세가율·학군) | D-VIEW',
    description:
      '국토교통부 공식 실거래가 매일 동기화 — 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프 및 전세가율 분석.',
    images: [OVERVIEW_OG_IMAGE_URL],
  },
};

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-body animate-pulse select-none" data-testid="overview-5zone-skeleton">
      {/* Top Header */}
      <header className="bg-surface/90 border-b border-border sticky top-0 z-40">
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 h-14 sm:h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-36 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
            <div className="w-16 h-6 bg-black/5 dark:bg-surface/5 rounded-lg hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black/5 dark:bg-surface/5 rounded-full" />
            <div className="w-8 h-8 bg-black/5 dark:bg-surface/5 rounded-full" />
          </div>
        </div>
      </header>

      {/* PageHeroHeader Skeleton */}
      <div className="h-[144px] flex flex-col gap-3 sm:gap-4 px-4 sm:px-6 md:px-10 lg:px-16 pt-[28px] md:pt-6 lg:pt-8 pb-1.5 sm:pb-6 w-full max-w-[2000px] mx-auto border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] bg-black/5 dark:bg-surface/5 rounded-xl shrink-0" />
          <div className="w-48 sm:w-64 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
        </div>
        <div className="w-72 sm:w-96 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
      </div>

      {/* Main Content Area matching MacroDashboardClient 5 Zones */}
      <main className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-6 md:pb-8 lg:pb-10 flex flex-col">
        {/* ═══ Zone 2A: 6:6 Circular Donut Navigator + Connected 4-Card | Trend Chart Hero Skeleton ═══ */}
        <div
          data-testid="skeleton-zone2a-hero"
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 pb-5 mb-4 border-b border-border items-stretch min-h-[526px]"
        >
          {/* Left 6 Columns (h-[526px]): AptDonutSection (360px) + AptMetricCards (152px) */}
          <div className="lg:col-span-6 flex flex-col gap-3.5 min-w-0 min-h-[526px] pb-5 border-b border-border lg:pb-0 lg:border-b-0 lg:pr-6 xl:pr-8 lg:border-r lg:border-border box-border">
            <div className="h-[360px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between border border-border/30">
              <div className="flex items-center justify-between gap-2">
                <div className="w-44 h-7 bg-black/10 dark:bg-surface/10 rounded-lg" />
                <div className="w-32 h-7 bg-black/10 dark:bg-surface/10 rounded-lg" />
              </div>
              <div className="flex items-center gap-4 flex-1 py-2">
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-[208px] h-[208px] sm:w-[226px] sm:h-[226px] lg:w-[174px] lg:h-[174px] xl:w-[220px] xl:h-[220px] 2xl:w-[262px] 2xl:h-[262px] rounded-full border-[20px] border-black/10 dark:border-surface/10 shrink-0" />
                </div>
                <div className="hidden sm:flex flex-col gap-2 sm:w-[268px] md:w-[296px] lg:w-[212px] xl:w-[280px] 2xl:w-[324px] shrink-0">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-6 w-full rounded-xl bg-black/10 dark:bg-surface/10" />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 h-[152px]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl bg-black/5 dark:bg-surface/5 p-3 flex flex-col justify-between border border-border/30">
                  <div className="w-20 h-3.5 bg-black/10 dark:bg-surface/10 rounded" />
                  <div className="w-24 h-5 bg-black/10 dark:bg-surface/10 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Right 6 Columns (h-[526px]): MacroChartSection */}
          <div className="lg:col-span-6 flex flex-col gap-6 min-w-0 min-h-[526px] lg:pl-6 xl:pl-8 box-border">
            <div className="h-[526px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between border border-border/30">
              <div className="flex items-center justify-between gap-2">
                <div className="w-40 h-6 bg-black/10 dark:bg-surface/10 rounded-lg" />
                <div className="w-28 h-7 bg-black/10 dark:bg-surface/10 rounded-lg" />
              </div>
              <div className="w-full h-80 bg-black/10 dark:bg-surface/10 rounded-xl" />
            </div>
          </div>
        </div>

        {/* ═══ Prime In-Feed AdSlot 1 Skeleton ═══ */}
        {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
          <div
            data-testid="skeleton-hero-ad-slot-1"
            className="w-full h-[140px] sm:h-[160px] rounded-2xl bg-black/5 dark:bg-surface/5 border border-border/30 mb-6"
          />
        )}

        {/* ═══ Zone 3: Unified Timeline + Live Ranking Tabs Skeleton ═══ */}
        <div className="w-full min-h-[420px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-6 flex flex-col gap-4 border border-border/30 mb-6">
          <div className="flex items-center justify-between">
            <div className="w-48 h-8 rounded-xl bg-black/10 dark:bg-surface/10" />
            <div className="w-32 h-8 rounded-xl bg-black/10 dark:bg-surface/10" />
          </div>
          <div className="flex flex-col gap-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 sm:h-22 w-full rounded-xl bg-black/10 dark:bg-surface/10" />
            ))}
          </div>
        </div>

        {/* ═══ Zone 4A: HighCpcFinanceSection + AdSlot 2 Skeleton ═══ */}
        <div className="w-full flex flex-col gap-6 mb-6">
          <div className="h-[140px] sm:h-[160px] rounded-2xl bg-black/5 dark:bg-surface/5 p-5 flex flex-col justify-between border border-border/30">
            <div className="w-48 h-6 bg-black/10 dark:bg-surface/10 rounded-lg" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-black/10 dark:bg-surface/10" />
              ))}
            </div>
          </div>
          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div className="w-full h-[140px] sm:h-[160px] rounded-2xl bg-black/5 dark:bg-surface/5 border border-border/30" />
          )}
        </div>

        {/* ═══ Zone 4B: Curated Guides 3-Pack + 7:5 Retention & Community Hub Skeleton ═══ */}
        <div className="w-full flex flex-col gap-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 sm:h-40 rounded-2xl bg-black/5 dark:bg-surface/5 p-4 flex flex-col justify-between border border-border/30">
                <div className="w-24 h-4 bg-black/10 dark:bg-surface/10 rounded" />
                <div className="w-3/4 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                <div className="w-20 h-4 bg-black/10 dark:bg-surface/10 rounded" />
              </div>
            ))}
          </div>
          <div
            data-testid="skeleton-zone4b-retention"
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          >
            <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
              <div className="h-44 sm:h-52 rounded-2xl bg-black/5 dark:bg-surface/5 p-4 flex flex-col justify-between border border-border/30">
                <div className="w-40 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                <div className="space-y-2">
                  <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-lg" />
                  <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-lg" />
                </div>
              </div>
              <div className="h-44 sm:h-52 rounded-2xl bg-black/5 dark:bg-surface/5 p-4 flex flex-col justify-between border border-border/30">
                <div className="w-36 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                <div className="space-y-2">
                  <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-lg" />
                  <div className="w-32 h-8 bg-black/10 dark:bg-surface/10 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-4 min-w-0">
              <div className="h-[360px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between border border-border/30">
                <div className="flex items-center justify-between">
                  <div className="w-32 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                  <div className="w-20 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="w-full h-11 rounded-xl bg-black/10 dark:bg-surface/10" />
                  <div className="w-full h-11 rounded-xl bg-black/10 dark:bg-surface/10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Zone 5: Compact Soft Editorial Container Skeleton ═══ */}
        <div className="w-full h-[180px] sm:h-[220px] rounded-2xl bg-black/5 dark:bg-surface/5 p-5 flex flex-col justify-between border border-border/30">
          <div className="w-64 h-6 bg-black/10 dark:bg-surface/10 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-black/10 dark:bg-surface/10" />
            ))}
          </div>
          <div className="w-full h-4 bg-black/10 dark:bg-surface/10 rounded" />
        </div>
      </main>
    </div>
  );
}

async function DashboardDataLoader({ initialTab }: { initialTab?: 'overview' | 'imjang' }) {
  const initialData = await getInitialData();
  const txSummary = initialData.txSummary || {};
  const allApts = Object.entries(txSummary).map(([name, sum]) => {
    const s = sum as TxSummaryItem;
    return {
      name,
      latestPrice: s.latestPrice || 0,
      dong: s.dong || '',
      avg1MPrice: s.avg1MPrice || 0,
      jeonseRatio: s.avg1MPrice && s.avg1MPrice > 0 && s.avg1MRentDeposit && s.avg1MRentDeposit > 0 
        ? Math.round((s.avg1MRentDeposit / s.avg1MPrice) * 100) 
        : 0
    };
  }).filter(a => a.latestPrice > 0);

  const top10Leaderboard = [...allApts]
    .sort((a, b) => b.latestPrice - a.latestPrice)
    .slice(0, 10);

  const recentTxs = initialData.recentTransactions || [];

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
      <DashboardClient initialDashboardData={initialData} initialTab={initialTab} />
      <section
        id="overview-ssr-semantic-catalog"
        aria-label="동탄 대장 아파트 랭킹 및 최신 실거래 내역"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-10"
      >
        <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-5 sm:p-7 space-y-5">
          <header className="space-y-1.5 border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              동탄 아파트 시세·실거래가·집값 추이 그래프 대시보드 - D-VIEW
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              국토교통부 실거래가 공개시스템 공식 데이터 기반 동탄 1·2신도시 184개 아파트 시세, 평형별 집값 추이 그래프, 전세가율 및 전세 안전 진단 리포트 플랫폼
            </p>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-xl bg-white dark:bg-[#1e1e24] p-4 sm:p-5 space-y-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                동탄 시세 리더 아파트 TOP 10 (대장 단지 랭킹)
              </h3>
              <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                {top10Leaderboard.map((apt, index) => (
                  <li key={apt.name} className="leading-relaxed">
                    <strong className="font-bold text-slate-900 dark:text-slate-100">
                      {index + 1}위: {apt.name}
                    </strong>{' '}
                    ({apt.dong}) - 최근 실거래가: {formatPrice(apt.latestPrice)}
                    {apt.jeonseRatio > 0 ? ` (전세가율 약 ${apt.jeonseRatio}%)` : ''}
                  </li>
                ))}
              </ol>
            </section>
            {recentTxs.length > 0 && (
              <section className="rounded-xl bg-white dark:bg-[#1e1e24] p-4 sm:p-5 space-y-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-blue-700 dark:text-blue-400">
                  최근 동탄 아파트 실거래 등록 내역 (최신 15건)
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {(recentTxs as HomeTransactionRecord[]).slice(0, 15).map((tx, idx: number) => {
                    const txPrice = tx.price || 0;
                    return (
                      <li key={idx} className="leading-relaxed">
                        <strong className="font-bold text-slate-900 dark:text-slate-100">
                          {tx.apartmentName || '아파트'}
                        </strong>{' '}
                        ({tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평형` : ''}, {tx.floor ? `${tx.floor}층` : ''}) -{' '}
                        {tx.dealType || '매매'} {formatPrice(txPrice)}
                        {tx.contractYm && tx.contractDay ? ` (계약일: ${tx.contractYm}.${tx.contractDay})` : ''}
                        {tx.registeredDate ? ` [등록일: ${tx.registeredDate}]` : ''}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default async function OverviewPage(props?: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const searchParams = props?.searchParams ? await props.searchParams : undefined;
  const tab = searchParams?.tab;

  let initialTab: 'overview' | 'imjang' = 'overview';
  if (tab === 'imjang') initialTab = 'imjang';
  // legacy lounge, office, technovalley & mbti fall back cleanly to overview

  const nonce = undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const jsonLd = getMainPageSchema(baseUrl);

  return (
    <>
      <Script
        id="jsonld-overview-schema"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader initialTab={initialTab} />
      </Suspense>
    </>
  );
}
