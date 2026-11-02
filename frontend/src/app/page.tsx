import { Suspense } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { Metadata } from 'next';
import DashboardClient from '@/components/DashboardClient';
import { getInitialData } from '@/lib/services/dashboardData';
import { getTxSummaryData, resolveCanonicalAptSlug } from '@/lib/services/apartmentPageService';
import { getMainPageSchema, safeJsonLd } from '@/lib/utils/structuredData';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import { ZONES } from '@/lib/zones';

interface HomeTransactionRecord {
  apartmentName?: string;
  aptName?: string;
  txKey?: string;
  dong?: string;
  price?: number;
  areaPyeong?: number;
  floor?: number | string;
  dealType?: string;
  contractYm?: string | number;
  contractDay?: string | number;
  registeredDate?: string;
}

interface TxSummaryItem {
  latestPrice?: number;
  dong?: string;
  avg1MPrice?: number;
  avg1MRentDeposit?: number;
}

export const revalidate = 300;

const HOME_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent('동탄 아파트 시세·실거래가·집값 추이 그래프')}&subtitle=${encodeURIComponent('동탄 1·2신도시 184개 단지 국토부 실거래가·전세가율·학군 비교 | D-VIEW')}`;

export const metadata: Metadata = {
  title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (184개 단지 전세가율·학군) | D-VIEW',
  description:
    '국토교통부 공식 실거래가 매일 동기화 — 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프, 전세가율·실거주 PER 진단, 스트레스 DSR 40% 한도 및 권역 1:1 비교 리포트를 제공합니다.',
  keywords:
    '동탄 아파트 시세, 동탄 집값 그래프, 동탄 집값 추이 그래프, 동탄 아파트 실거래가, 1동탄 2동탄 차이, 동탄 전세가율, 동탄 학군지, 동탄역 롯데캐슬, D-VIEW, 디뷰, 동뷰, 동탄뷰',
  alternates: {
    canonical: 'https://dongtanview.com',
  },
  openGraph: {
    title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (184개 단지 전세가율·학군) | D-VIEW',
    description:
      '국토교통부 공식 실거래가 매일 동기화 — 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프, 전세가율·실거주 PER 진단, 스트레스 DSR 40% 한도 및 권역 1:1 비교 리포트를 제공합니다.',
    url: 'https://dongtanview.com',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: HOME_OG_IMAGE_URL,
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
      '국토교통부 공식 실거래가 매일 동기화 — 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프, 전세가율·실거주 PER 진단 및 권역 1:1 비교 리포트를 제공합니다.',
    images: [HOME_OG_IMAGE_URL],
  },
};

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-body animate-pulse select-none" data-testid="dashboard-5zone-skeleton">
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
        <div
          data-testid="skeleton-hero-ad-slot-1"
          className="w-full h-[140px] sm:h-[160px] rounded-2xl bg-black/5 dark:bg-surface/5 border border-border/30 mb-6"
        />

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
          <div className="w-full h-[140px] sm:h-[160px] rounded-2xl bg-black/5 dark:bg-surface/5 border border-border/30" />
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

const formatPrice = (val: number) => {
  if (!val || val === 0) return '정보 없음';
  const eok = Math.floor(val / 10000);
  const remainder = Math.round(val % 10000);
  if (eok === 0) return `${remainder.toLocaleString()}만원`;
  if (remainder === 0) return `${eok}억원`;
  return `${eok}억 ${remainder.toLocaleString()}만원`;
};

async function DashboardDataLoader({ initialTab = 'overview' }: { initialTab?: 'overview' | 'imjang' | 'mbti' }) {
  const initialData = await getInitialData();
  const txSummary = initialData.txSummary || {};
  const allApts = Object.entries(txSummary)
    .map(([name, sum]) => {
      const s = sum as TxSummaryItem;
      const dong = s.dong || '';
      return {
        name,
        canonicalSlug: resolveCanonicalAptSlug(name, { txMap: txSummary, dong }) || name,
        latestPrice: s.latestPrice || 0,
        dong,
        avg1MPrice: s.avg1MPrice || 0,
        jeonseRatio:
          s.avg1MPrice && s.avg1MPrice > 0 && s.avg1MRentDeposit && s.avg1MRentDeposit > 0
            ? Math.round((s.avg1MRentDeposit / s.avg1MPrice) * 100)
            : 0,
      };
    })
    .filter((a) => a.latestPrice > 0);

  const top10Leaderboard = [...allApts].sort((a, b) => b.latestPrice - a.latestPrice).slice(0, 10);
  const recentTxs = (initialData.recentTransactions || []) as HomeTransactionRecord[];

  return (
    <>
      <DashboardClient initialDashboardData={initialData} initialTab={initialTab} />
      <section
        id="home-ssr-semantic-catalog"
        aria-label="동탄 대장 아파트 랭킹 및 최신 실거래 내역"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-2"
      >
        <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-5 sm:p-7 space-y-5">
          <header className="space-y-1.5 border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              동탄 아파트 시세·실거래가·집값 추이 그래프 대시보드 - D-VIEW
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              국토교통부 실거래가 공개시스템 공식 데이터 기반 동탄 1·2신도시 184개 아파트 시세, 평형별 집값 추이 그래프, 전세가율 및 주거 가치 분석 리포트 플랫폼
            </p>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {top10Leaderboard.length > 0 && (
              <section className="rounded-xl bg-white dark:bg-[#1e1e24] p-4 sm:p-5 space-y-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                  동탄 시세 리더 아파트 TOP 10 (대장 단지 랭킹)
                </h3>
                <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {top10Leaderboard.map((apt, index) => (
                    <li key={apt.name} className="leading-relaxed">
                      <strong className="font-bold text-slate-900 dark:text-slate-100">
                        {index + 1}위:{' '}
                        <Link
                          href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                          prefetch={false}
                          className="hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2"
                        >
                          {apt.name}
                        </Link>
                      </strong>{' '}
                      ({apt.dong}) - 최근 실거래가: {formatPrice(apt.latestPrice)}
                      {apt.jeonseRatio > 0 ? ` (전세가율 약 ${apt.jeonseRatio}%)` : ''}
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {recentTxs.length > 0 && (
              <section className="rounded-xl bg-white dark:bg-[#1e1e24] p-4 sm:p-5 space-y-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-blue-700 dark:text-blue-400">
                  최근 동탄 아파트 실거래 등록 내역 (최신 15건)
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {recentTxs.slice(0, 15).map((tx, idx) => {
                    const displayTxAptName = tx.apartmentName || tx.aptName || '';
                    const canonicalTxSlug = displayTxAptName
                      ? resolveCanonicalAptSlug(displayTxAptName, {
                          txKey: tx.txKey,
                          dong: tx.dong,
                          txMap: txSummary,
                          sheetApartments: initialData.sheetApartments,
                        }) || displayTxAptName
                      : '';
                    return (
                      <li key={idx} className="leading-relaxed">
                        <strong className="font-bold text-slate-900 dark:text-slate-100">
                          {displayTxAptName ? (
                            <Link
                              href={`/apartment/${encodeURIComponent(canonicalTxSlug)}`}
                              prefetch={false}
                              className="hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2"
                            >
                              {displayTxAptName}
                            </Link>
                          ) : (
                            '아파트'
                          )}
                        </strong>{' '}
                        (
                        {tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평형` : ''}, {tx.floor ? `${tx.floor}층` : ''}) -{' '}
                        {tx.dealType || '매매'} {formatPrice(tx.price || 0)}
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

export default async function HomePage() {
  const nonce = undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const jsonLd = getMainPageSchema(baseUrl);
  const txSummary = await getTxSummaryData();
  const top10LeaderApts = Object.entries(txSummary || {})
    .map(([name, sum]) => {
      const dong = sum?.dong || '';
      return {
        name,
        canonicalSlug: resolveCanonicalAptSlug(name, { txMap: txSummary, dong }) || name,
        latestPrice: sum?.latestPrice || 0,
        dong,
      };
    })
    .filter((a) => a.latestPrice > 0)
    .sort((a, b) => b.latestPrice - a.latestPrice)
    .slice(0, 10);

  return (
    <>
      <Script
        id="jsonld-overview-schema"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader initialTab="overview" />
      </Suspense>

      {/* Visible SSR Market Commentary & Editorial Hub for Search Crawlers and Users */}
      <section
        id="home-ssr-market-editorial"
        aria-label="동탄 신도시 부동산 시장 심층 분석 및 밸류에이션 가이드"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pb-12 pt-4"
      >
        <div className="rounded-2xl bg-elevated/50 dark:bg-elevated/30 border border-border/30 p-5 sm:p-7 space-y-6 transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border/40 pb-5">
            <div className="space-y-1.5 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
                <span>D-VIEW 부동산 데이터 랩스 공식 분석 브리핑</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-primary tracking-tight">
                동탄 아파트 시세·집값 추이 그래프 밸류에이션 방법론 및 권역별 심층 리포트
              </h2>
              <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                D-VIEW(디뷰 · 동뷰 · 동탄뷰)는 국토교통부 실거래가 공개시스템의 100% 검증된 매매·전월세 신고 데이터를 매일 동기화하여, 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프·전세가율과 56개 동탄테크노밸리 지식산업센터의 내재 가치를 정량 분석합니다.
              </p>
            </div>
            <Link
              href="/guide"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white text-xs sm:text-sm font-extrabold transition-colors shrink-0 self-start lg:self-auto cursor-pointer"
            >
              <span>전체 심층 리포트 열람</span>
            </Link>
          </div>

          {/* 3-Column Methodology & Fundamental Commentary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <article className="rounded-xl bg-body/70 dark:bg-body/30 p-4 space-y-2 border border-border/30">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs sm:text-sm">
                <h3>실거주 PER 및 전세가율 하방 경직성</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                단지별 매매가를 전세가로 나눈 실거주 PER(Price-to-Jeonse Ratio) 지표를 통해 실수요 지지력을 계측합니다. 반송동·능동 중심의 동탄1신도시는 완성된 학원가와 중심 상권을 기반으로 65~74% 구간의 전세가율 지지대를 형성하며, 청계동·오산동·송동 중심의 동탄2신도시는 GTX-A 동탄역 직결 수혜와 신축 선호도에 따른 상방 탄력성을 나타냅니다.
              </p>
            </article>

            <article className="rounded-xl bg-body/70 dark:bg-body/30 p-4 space-y-2 border border-border/30">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-xs sm:text-sm">
                <h3>스트레스 DSR 40% 한도 및 주담대 감응도</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                차주 단위 DSR 40% 규제 및 스트레스 가산금리 적용 환경에서는 가구 합산 소득 대비 원리금 상환 비율이 매수 가능 가격대의 상한선을 결정합니다. D-VIEW 단지 상세 리포트는 실거래가 대비 LTV·DSR 한도와 HUG 전세보증금 반환보증(공시가격 126% 룰) 안전 마진을 동시에 산출하여 자금 조달 리스크를 사전에 진단합니다.
              </p>
            </article>

            <article className="rounded-xl bg-body/70 dark:bg-body/30 p-4 space-y-2 border border-border/30">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs sm:text-sm">
                <h3>광역 교통망(GTX-A·트램·동인선) 입지 점수</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                동탄역 복합환승센터(GTX-A·SRT), 동탄 도시철도 트램 1·2호선 정거장, 동탄인덕원선 역세권 도보 실거리와 초·중·고 학군 및 학원가 밀집도를 종합한 5대 입지 스코어링 모델을 적용합니다. 각 단지의 실거래 시계열 추이와 입지 점수 대비 저평가 여부를 탐색 메뉴와 주거 성향(MBTI) 도감에서 비교할 수 있습니다.
              </p>
            </article>
          </div>

          {/* 7 Investment Zones Direct Crawl & User Navigation Grid */}
          <div className="space-y-2.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-primary">
              동탄 7대 핵심 권역별 아파트 실거래가 및 입지 리포트
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {ZONES.map((zone) => (
                <Link
                  key={zone.id}
                  href={`/zone/${zone.id}`}
                  prefetch={false}
                  className="group rounded-xl bg-body/60 dark:bg-body/25 hover:bg-body dark:hover:bg-body/50 border border-border/30 hover:border-emerald-500/40 p-3 flex flex-col justify-between gap-1 transition-all"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 block truncate">
                      {zone.dongLabel}
                    </span>
                    <h4 className="text-xs font-black text-primary group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
                      {zone.name}
                    </h4>
                    <p className="text-[11px] text-tertiary line-clamp-1 leading-normal">
                      {zone.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top 10 Real Transaction Leader Apartments Direct Links */}
          {top10LeaderApts.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-primary">
                  동탄 실거래 시세 리더 대장 단지 TOP 10 심층 리포트
                </h3>
                <Link
                  href="/explore"
                  prefetch={false}
                  className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>전체 단지 탐색</span>
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {top10LeaderApts.map((apt, idx) => (
                  <Link
                    key={apt.name}
                    href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                    prefetch={false}
                    className="group rounded-xl bg-body/60 dark:bg-body/25 hover:bg-body dark:hover:bg-body/50 border border-border/30 hover:border-blue-500/40 p-2.5 flex flex-col justify-between gap-1 transition-all"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-tertiary">
                      <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                        #{idx + 1}
                      </span>
                      <span className="truncate">{apt.dong}</span>
                    </div>
                    <div className="text-xs font-bold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                      {apt.name}
                    </div>
                    <div className="text-[11px] tabular-nums font-extrabold text-emerald-700 dark:text-emerald-400">
                      {formatPrice(apt.latestPrice)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Editorial Guide Cards */}
          <div className="space-y-2.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-primary">
              필독 동탄 부동산 분석 칼럼 및 밸류에이션 가이드
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {GUIDE_ARTICLES.map((article) => (
                <Link
                  key={article.slug}
                  href={`/guide/${article.slug}`}
                  prefetch={false}
                  className="group rounded-xl bg-body/60 dark:bg-body/25 hover:bg-body dark:hover:bg-body/50 border border-border/30 hover:border-emerald-500/40 p-3.5 flex flex-col justify-between gap-2.5 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-tertiary">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{article.category}</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        {article.readingTime}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-[13px] font-black text-primary group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      {article.title}
                    </h4>
                    <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                    <span>칼럼 전문 읽기</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Core Hub Quick Links */}
          <nav
            aria-label="D-VIEW 핵심 분석 허브 바로가기"
            className="flex flex-col gap-3 pt-4 border-t border-border/40 text-xs font-bold text-secondary"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[11px] font-black text-tertiary uppercase tracking-wider">주요 서비스:</span>
              <Link href="/map" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                단지 지도
              </Link>
              <Link href="/compare" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                단지 1:1 비교
              </Link>
              <Link href="/calculator" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                대출·세금 계산기
              </Link>
              <Link href="/complex-ranking" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                실거래 랭킹
              </Link>
              <Link href="/stats" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                시장 통계 지표
              </Link>
              <Link href="/lounge" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                입주민 라운지
              </Link>
              <Link href="/subscription" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                실거래 알림 구독
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/20">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Link href="/explore" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  동탄 184개 아파트 탐색 카탈로그
                </Link>
                <Link href="/technovalley" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  동탄테크노밸리 지식산업센터 56곳 시세 분석
                </Link>
                <Link href="/mbti" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  16개 주거 성향(MBTI)별 추천 단지 도감
                </Link>
                <Link href="/news" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  동탄 부동산·교통 정책 브리핑
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-tertiary">
                <Link href="/about" prefetch={false} className="hover:text-primary transition-colors">
                  D-VIEW 분석 방법론 소개
                </Link>
                <Link href="/privacy" prefetch={false} className="hover:text-primary transition-colors">
                  개인정보처리방침
                </Link>
                <Link href="/terms" prefetch={false} className="hover:text-primary transition-colors">
                  이용약관
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </section>
    </>
  );
}
