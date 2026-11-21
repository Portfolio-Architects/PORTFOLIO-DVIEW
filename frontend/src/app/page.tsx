import { Suspense } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { Metadata } from 'next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import DashboardClient from '@/components/DashboardClient';
import HomeEditorialFeatureSection from '@/components/home/HomeEditorialFeatureSection';
import { getInitialData } from '@/lib/services/dashboardData';
import { toSlimDashboardInitialData } from '@/lib/services/slimInitialPayload';
import {
  resolveCanonicalAptSlug,
  isAdSenseApprovalMode,
} from '@/lib/services/apartmentPageService';
import { getMainPageSchema, safeJsonLd } from '@/lib/utils/structuredData';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import { resolveBalanceMatchups } from '@/lib/data/balanceMatchups';
import { extractVerifiedComplexCatalog } from '@/lib/finance/budgetTierEngine';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { ZONES, dongToZoneId, getZoneShortTagline } from '@/lib/zones';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionChevronClass,
  getSeoAccordionBodyClass,
  getVisualSignalPillClass,
} from '@/lib/design-system/copyDiet';

interface HomeTransactionRecord {
  apartmentName?: string;
  aptName?: string;
  txKey?: string;
  dong?: string;
  price?: number;
  priceVal?: number;
  priceEok?: string;
  areaPyeong?: number;
  floor?: number | string;
  dealType?: string;
  date?: string;
  contractDate?: string;
  contractYm?: string | number;
  contractDay?: string | number;
  registeredDate?: string;
}

interface TxSummaryItem {
  latestPrice?: number;
  dong?: string;
  avg1MPrice?: number;
  avg1MRentDeposit?: number;
  latestArea?: number;
  latestDate?: string;
}

export const dynamic = 'force-static';
export const revalidate = false;

const HOME_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent('동탄 아파트 시세·실거래가·집값 추이 그래프')}&subtitle=${encodeURIComponent('동탄 1·2신도시 184개 단지 국토부 실거래가·전세가율·학군 비교 | D-VIEW')}`;

export const metadata: Metadata = {
  title: '동탄 아파트 시세·집값 추이 그래프 (184개 실거래 리포트) | D-VIEW',
  description:
    '동탄 1·2신도시 184개 아파트 시세·집값 추이 그래프·국토교통부 실거래가, 1:1 밸런스 맞대결, 내 현금·연봉 현실 티어 진단 및 25편 심층 입지 분석 리포트를 매일 동기화해 제공합니다.',
  keywords:
    '동탄 아파트 시세, 동탄 아파트 실거래가, 동탄 집값 추이, 1동탄 2동탄 비교, 동탄 전세가율, 동탄 학군, 스트레스 DSR, D-VIEW, 디뷰',
  alternates: {
    canonical: 'https://dongtanview.com',
    types: {
      'application/rss+xml': 'https://dongtanview.com/feed.xml',
    },
  },
  openGraph: {
    title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (1·2신도시 184개 가격 순위·전세가율) | D-VIEW',
    description:
      '동탄 아파트 시세·집값 추이 그래프·실거래가 순위 매일 동기화 — 동탄 1·2신도시 184개 아파트 가격·전세가율·학군 비교 및 스트레스 DSR 40% 한도 계산기.',
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
    title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (1·2신도시 184개 가격 순위·전세가율) | D-VIEW',
    description:
      '동탄 아파트 시세·집값 추이 그래프·실거래가 순위 — 동탄 1·2신도시 184개 아파트 가격·전세가율 비교 및 주담대 DSR 계산기.',
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
      <div className="h-[130px] sm:h-[128px] flex flex-col gap-3 sm:gap-4 px-4 sm:px-6 md:px-10 lg:px-16 pt-[28px] md:pt-6 lg:pt-8 pb-3 w-full max-w-[2000px] mx-auto border-b border-border/60 shrink-0">
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
                  <div className="w-[270px] h-[270px] sm:w-[226px] sm:h-[226px] lg:w-[174px] lg:h-[174px] xl:w-[220px] xl:h-[220px] 2xl:w-[262px] 2xl:h-[262px] rounded-full border-[20px] border-black/10 dark:border-surface/10 shrink-0" />
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

        {/* ═══ Zone 4A: Finance In-Feed AdSlot 2 Skeleton ═══ */}
        {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
          <div className="w-full h-[140px] sm:h-[160px] mb-6 rounded-2xl bg-black/5 dark:bg-surface/5 border border-border/30" />
        )}

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
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch"
          >
            <div className="lg:col-span-7 flex flex-col min-w-0">
              <div className="h-[288px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between">
                <div className="w-40 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                <div className="space-y-2.5">
                  <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-xl" />
                  <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-xl" />
                  <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-xl" />
                  <div className="w-full h-8 bg-black/10 dark:bg-surface/10 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-col min-w-0">
              <div className="h-[288px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-36 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                  <div className="w-16 h-5 bg-black/10 dark:bg-surface/10 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2.5 flex-1 my-3">
                  <div className="rounded-xl bg-black/10 dark:bg-surface/10" />
                  <div className="rounded-xl bg-black/10 dark:bg-surface/10" />
                </div>
                <div className="w-44 h-4 bg-black/10 dark:bg-surface/10 rounded" />
              </div>
            </div>
            <div className="lg:col-span-7 flex flex-col min-w-0">
              <div className="h-[268px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-44 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                  <div className="w-20 h-5 bg-black/10 dark:bg-surface/10 rounded-md" />
                </div>
                <div className="space-y-2">
                  <div className="w-full h-10 bg-black/10 dark:bg-surface/10 rounded-xl" />
                  <div className="w-full h-10 bg-black/10 dark:bg-surface/10 rounded-xl" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="w-36 h-4 bg-black/10 dark:bg-surface/10 rounded" />
                  <div className="w-28 h-8 bg-black/10 dark:bg-surface/10 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-col min-w-0">
              <div className="h-[268px] rounded-2xl bg-black/5 dark:bg-surface/5 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-36 h-5 bg-black/10 dark:bg-surface/10 rounded" />
                  <div className="w-16 h-5 bg-black/10 dark:bg-surface/10 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-14 rounded-xl bg-black/10 dark:bg-surface/10" />
                  <div className="h-14 rounded-xl bg-black/10 dark:bg-surface/10" />
                  <div className="h-14 rounded-xl bg-black/10 dark:bg-surface/10" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="w-36 h-4 bg-black/10 dark:bg-surface/10 rounded" />
                  <div className="w-28 h-8 bg-black/10 dark:bg-surface/10 rounded-xl" />
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

const formatCompactPrice = (val: number) => {
  if (!val || val <= 0 || !Number.isFinite(val)) return '정보 없음';
  const rounded = Math.round(val);
  const eok = Math.floor(rounded / 10000);
  const remainder = rounded % 10000;
  if (eok === 0) return `${remainder.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억 ${remainder.toLocaleString()}만`;
};

const formatYmShort = (rawDate?: string) => {
  if (!rawDate) return '';
  const digits = String(rawDate).replace(/\D/g, '');
  if (digits.length < 6) return '';
  return `${digits.slice(2, 4)}.${digits.slice(4, 6)}`;
};

const formatHomeTxPrice = (tx: HomeTransactionRecord) => {
  if (typeof tx.price === 'number' && tx.price > 0) return formatPrice(tx.price);
  if (typeof tx.priceVal === 'number' && Number.isFinite(tx.priceVal) && tx.priceVal > 0) {
    return formatPrice(Math.round(tx.priceVal * 10000));
  }
  if (tx.priceEok && tx.priceEok.trim() && tx.priceEok !== '0만') {
    const trimmed = tx.priceEok.trim();
    if (trimmed.endsWith('원')) return trimmed;
    if (trimmed.endsWith('만') || trimmed.endsWith('억')) return `${trimmed}원`;
    return `${trimmed}만원`;
  }
  return '정보 없음';
};

const formatHomeTxDate = (tx: HomeTransactionRecord) => {
  if (tx.contractYm && tx.contractDay) {
    const ym = String(tx.contractYm).replace(/\D/g, '');
    const day = String(tx.contractDay).replace(/\D/g, '').padStart(2, '0');
    return ym.length === 6 ? `${ym.slice(0, 4)}.${ym.slice(4, 6)}.${day}` : `${tx.contractYm}.${tx.contractDay}`;
  }
  const rawDate = tx.contractDate || tx.registeredDate || '';
  const digits = rawDate.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return rawDate || tx.date || '-';
};

async function DashboardDataLoader({
  initialTab = 'overview',
  prefetchedInitialData,
}: {
  initialTab?: 'overview' | 'imjang';
  prefetchedInitialData?: Awaited<ReturnType<typeof getInitialData>>;
}) {
  const initialData = prefetchedInitialData ?? (await getInitialData());

  return (
    <DashboardClient
      initialDashboardData={toSlimDashboardInitialData(initialData)}
      initialTab={initialTab}
    />
  );
}

export default async function HomePage() {
  const nonce = undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const jsonLd = getMainPageSchema(baseUrl);
  const initialData = await getInitialData();
  const txSummary = initialData.txSummary || {};
  const recentTxs = (initialData.recentTransactions || []) as HomeTransactionRecord[];

  const zoneStats = new Map<string, { withLatestCount: number; sumLatestPrice: number }>();
  for (const sum of Object.values(txSummary)) {
    const s = sum as TxSummaryItem;
    if (!s || typeof s.latestPrice !== 'number' || !Number.isFinite(s.latestPrice) || s.latestPrice <= 0) continue;
    const zId = dongToZoneId(s.dong);
    const prev = zoneStats.get(zId) || { withLatestCount: 0, sumLatestPrice: 0 };
    prev.withLatestCount += 1;
    prev.sumLatestPrice += s.latestPrice;
    zoneStats.set(zId, prev);
  }

  const top10LeaderApts = Object.entries(txSummary)
    .map(([name, sum]) => {
      const s = sum as TxSummaryItem;
      const dong = s?.dong || '';
      const latestPrice =
        typeof s?.latestPrice === 'number' && Number.isFinite(s.latestPrice) ? s.latestPrice : 0;
      const latestArea =
        typeof s?.latestArea === 'number' && Number.isFinite(s.latestArea) && s.latestArea > 0
          ? s.latestArea
          : 0;
      return {
        name,
        displayName: getDisplayAptName(name),
        canonicalSlug: resolveCanonicalAptSlug(name, { txMap: txSummary, dong }) || name,
        latestPrice,
        latestArea,
        latestDate: s?.latestDate || '',
        dong,
      };
    })
    .filter((a) => Number.isFinite(a.latestPrice) && a.latestPrice > 0)
    .sort((a, b) => b.latestPrice - a.latestPrice)
    .slice(0, 10);

  const approvalMode = isAdSenseApprovalMode();
  const homeMatchups = resolveBalanceMatchups('home', txSummary);
  const homeBudgetCatalog = extractVerifiedComplexCatalog(txSummary);

  return (
    <>
      <Script
        id="jsonld-overview-schema"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader initialTab="overview" prefetchedInitialData={initialData} />
      </Suspense>

      {/* Site-Wide Engagement Hub (1:1 Balance Matchup + Budget Tier Reality Check) */}
      <section
        id="home-engagement-editorial-hub"
        aria-label="동탄 실거래 참여 랩"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-2 pb-4"
      >
        <HomeEditorialFeatureSection
          matchups={homeMatchups}
          budgetCatalog={homeBudgetCatalog}
          totalGuidesCount={GUIDE_ARTICLES.length}
          verifiedComplexCount={homeBudgetCatalog.length}
        />
      </section>

      {/* Visible SSR Market Commentary & Editorial Hub for Search Crawlers and Users */}
      <section
        id="home-ssr-market-editorial"
        aria-label="동탄 신도시 부동산 시장 심층 분석 및 밸류에이션 리포트"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pb-8 pt-2"
      >
        <div className="rounded-2xl bg-elevated/80 dark:bg-elevated/35 p-4 sm:p-5 space-y-4 transition-colors">
          {/* Collapsible 25-Report Archive Directory (Deduplicated from top 6 featured cards) */}
          <div id="home-guide-4col-grid" className="scroll-mt-20">
            <details className={getSeoAccordionClass('bg-body! dark:bg-[#17171c]!')}>
              <summary className={getSeoAccordionSummaryClass()}>
                <span className="tabular-nums">분석 리포트 {GUIDE_ARTICLES.length}편 전체 목차 보기</span>
                <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass('space-y-3')}>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#eff1f5] dark:border-[#1e2532] text-[11px] font-extrabold">
                  <span className="text-tertiary tabular-nums">총 {GUIDE_ARTICLES.length}편 수록</span>
                  <a
                    href="#apt-market-energy-donut"
                    className="text-secondary hover:text-primary transition-colors"
                  >
                    상단 실거래 랩으로 이동
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {GUIDE_ARTICLES.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/guide/${article.slug}`}
                      prefetch={false}
                      className="group rounded-2xl bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] p-3 flex flex-col justify-between gap-1.5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#eff1f5] dark:bg-[#1e2532] text-secondary text-[10px] font-extrabold">
                          {article.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-tertiary group-hover:text-primary transition-colors">
                          <span>{article.readingTime}</span>
                          <ChevronRight size={12} aria-hidden="true" />
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-primary group-hover:underline leading-snug transition-colors">
                        {article.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          </div>

          {/* 7 Investment Zones Direct Crawl & Real-Data Navigation Grid */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-primary">
              7대 권역별 실거래 · 입지
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              {ZONES.map((zone) => {
                const stat = zoneStats.get(zone.id);
                const withLatestCount = stat?.withLatestCount || 0;
                const avgLatestPrice = withLatestCount > 0 && stat
                  ? Math.round(stat.sumLatestPrice / withLatestCount)
                  : 0;
                return (
                  <Link
                    key={zone.id}
                    href={`/zone/${zone.id}`}
                    prefetch={false}
                    className="group rounded-2xl bg-body/90 hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] p-3.5 flex flex-col justify-between gap-2 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-secondary">
                          {zone.dongLabel}
                        </span>
                        {withLatestCount > 0 && (
                          <span className="text-[11px] font-bold text-tertiary tabular-nums shrink-0">
                            {withLatestCount}단지
                          </span>
                        )}
                      </div>
                      <h4 className="text-[13.5px] font-black text-primary group-hover:underline transition-colors leading-snug">
                        {zone.name}
                      </h4>
                      <p className="text-[11.5px] text-secondary leading-snug">
                        {getZoneShortTagline(zone.id)}
                      </p>
                    </div>
                    {avgLatestPrice > 0 && (
                      <div className="pt-1.5 border-t border-[#eff1f5] dark:border-[#1e2532] flex items-baseline justify-between gap-2">
                        <span className="text-[10.5px] font-semibold text-tertiary">
                          최근 실거래 평균
                        </span>
                        <span className="text-[13px] font-black text-primary tabular-nums">
                          {formatCompactPrice(avgLatestPrice)}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Top 10 Real Transaction Leader Apartments Direct Links */}
          {top10LeaderApts.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-extrabold text-primary">
                    시세 리더 TOP 10 단지
                  </h3>
                  <span className={getVisualSignalPillClass('neutral')}>최근 실거래가</span>
                </div>
                <Link
                  href="/explore"
                  prefetch={false}
                  className="text-[11.5px] font-extrabold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>전체 단지 탐색</span>
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
                {top10LeaderApts.map((apt, idx) => {
                  const ymShort = formatYmShort(apt.latestDate);
                  const areaText = apt.latestArea > 0 ? `${Math.round(apt.latestArea)}평` : '';
                  const metaLine = [areaText, ymShort].filter(Boolean).join(' · ');
                  return (
                    <Link
                      key={apt.name}
                      href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                      prefetch={false}
                      className="group min-w-0 overflow-hidden rounded-2xl bg-body/90 hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] p-3 sm:p-3.5 flex flex-col justify-between gap-2 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-tertiary leading-tight">
                          <span className={`tabular-nums font-black ${idx === 0 ? 'text-brand-red' : 'text-secondary'}`}>
                            #{idx + 1}
                          </span>
                          <span className="shrink-0">{apt.dong}</span>
                        </div>
                        <div className="text-[13px] font-bold text-primary group-hover:underline leading-snug break-keep [overflow-wrap:anywhere] min-w-0 transition-colors">
                          {apt.displayName}
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-[#eff1f5] dark:border-[#1e2532] flex flex-col gap-0.5">
                        <div className="text-[13.5px] tabular-nums font-black text-primary leading-tight">
                          {formatCompactPrice(apt.latestPrice)}
                        </div>
                        {metaLine && (
                          <div className="text-[10.5px] font-semibold text-tertiary tabular-nums">
                            {metaLine}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Layer 2 Reference Drawers: Methodology & Latest 15 MOLIT Real Transactions */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-primary">
              산출 기준 · 최근 실거래
            </h3>

            {/* Layer 2 Progressive SEO Accordion: Valuation Methodology & Market Commentary */}
            <details
              open={approvalMode}
              data-editorial-open={approvalMode ? 'true' : undefined}
              className={getSeoAccordionClass('bg-body! dark:bg-[#151a23]!')}
            >
              <summary className={getSeoAccordionSummaryClass()}>
                <span>밸류에이션 방법론 · 산출 기준 더보기</span>
                <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass('space-y-4')}>
                <div className="border-b border-border/40 pb-4">
                  <div className="space-y-1.5 max-w-3xl">
                    <h2 className="text-base sm:text-lg font-black text-primary tracking-tight">
                      동탄 아파트 시세·집값 추이 그래프 밸류에이션 방법론 및 권역별 심층 리포트
                    </h2>
                    <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                      D-VIEW(디뷰 · 동뷰 · 동탄뷰)는 국토교통부 실거래가 공개시스템의 100% 검증된 매매·전월세 신고 데이터를 매일 동기화하여, 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프·전세가율과 56개 동탄테크노밸리 지식산업센터의 내재 가치를 정량 분석합니다.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <article className="rounded-xl bg-elevated dark:bg-body/40 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-extrabold text-xs sm:text-sm">
                      <h3>실거주 PER 및 전세가율 하방 경직성</h3>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      단지별 매매가를 전세가로 나눈 실거주 PER(Price-to-Jeonse Ratio) 지표를 통해 실수요 지지력을 계측합니다. 반송동·능동 중심의 동탄1신도시는 완성된 학원가와 중심 상권을 기반으로 65~74% 구간의 전세가율 지지대를 형성하며, 청계동·오산동·송동 중심의 동탄2신도시는 GTX-A 동탄역 직결 수혜와 신축 선호도에 따른 상방 탄력성을 나타냅니다.
                    </p>
                  </article>

                  <article className="rounded-xl bg-elevated dark:bg-body/40 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-extrabold text-xs sm:text-sm">
                      <h3>스트레스 DSR 40% 한도 및 주담대 감응도</h3>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      차주 단위 DSR 40% 규제 및 스트레스 가산금리 적용 환경에서는 가구 합산 소득 대비 원리금 상환 비율이 매수 가능 가격대의 상한선을 결정합니다. D-VIEW 단지 상세 리포트는 실거래가 대비 LTV·DSR 한도와 HUG 전세보증금 반환보증(공시가격 126% 룰) 안전 마진을 동시에 산출하여 자금 조달 리스크를 사전에 진단합니다.
                    </p>
                  </article>

                  <article className="rounded-xl bg-elevated dark:bg-body/40 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-extrabold text-xs sm:text-sm">
                      <h3>광역 교통망(GTX-A·트램·동인선) 입지 점수</h3>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      동탄역 복합환승센터(GTX-A·SRT), 동탄 도시철도 트램 1·2호선 정거장, 동탄인덕원선 역세권 도보 실거리와 초·중·고 학군 및 학원가 밀집도를 종합한 5대 입지 스코어링 모델을 적용합니다. 각 단지의 실거래 시계열 추이와 입지 점수 대비 저평가 여부를 탐색 메뉴와 아파트 통계 리포트에서 비교할 수 있습니다.
                    </p>
                  </article>
                </div>
              </div>
            </details>

            {/* Layer 2 Progressive SEO Accordion: Latest 15 MOLIT Real Transactions (Collapsed by Default) */}
            <details
              id="home-ssr-recent-tx-accordion"
              className={getSeoAccordionClass('bg-body! dark:bg-[#151a23]!')}
            >
              <summary className={getSeoAccordionSummaryClass()}>
                <span>최근 실거래 등록 내역 더보기</span>
                <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass()}>
                {recentTxs.length === 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    등록된 실거래 내역이 없습니다.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <caption className="text-left text-xs font-extrabold text-primary pb-2 tabular-nums">
                        최근 실거래 등록 내역 (최신 15건)
                      </caption>
                      <thead className="border-b border-slate-200/70 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                        <tr>
                          <th scope="col" className="py-2 pr-2 whitespace-nowrap">단지명</th>
                          <th scope="col" className="py-2 px-2 whitespace-nowrap">평형 · 층</th>
                          <th scope="col" className="py-2 px-2 whitespace-nowrap">거래금액</th>
                          <th scope="col" className="py-2 pl-2 whitespace-nowrap">계약일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/60 tabular-nums">
                        {recentTxs.slice(0, 15).map((tx, idx) => {
                          const displayTxAptName = tx.apartmentName || tx.aptName || '';
                          const canonicalTxSlug = displayTxAptName
                            ? resolveCanonicalAptSlug(displayTxAptName, {
                                txKey: tx.txKey,
                                dong: tx.dong,
                                txMap: initialData.txSummary,
                                sheetApartments: initialData.sheetApartments,
                              }) || displayTxAptName
                            : '';
                          return (
                            <tr key={idx}>
                              <th scope="row" className="py-2 pr-2 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {displayTxAptName ? (
                                  <Link
                                    href={`/apartment/${encodeURIComponent(canonicalTxSlug)}`}
                                    prefetch={false}
                                    className="hover:underline underline-offset-2"
                                  >
                                    {displayTxAptName}
                                  </Link>
                                ) : (
                                  '아파트'
                                )}
                              </th>
                              <td className="py-2 px-2 whitespace-nowrap">
                                {tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평` : '-'}
                                {tx.floor ? ` · ${tx.floor}층` : ''}
                              </td>
                              <td className="py-2 px-2 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {tx.dealType || '매매'} {formatHomeTxPrice(tx)}
                              </td>
                              <td className="py-2 pl-2 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                {formatHomeTxDate(tx)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
