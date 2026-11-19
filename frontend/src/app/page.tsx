import { Suspense } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { Metadata } from 'next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import DashboardClient from '@/components/DashboardClient';
import { getInitialData } from '@/lib/services/dashboardData';
import { toSlimDashboardInitialData } from '@/lib/services/slimInitialPayload';
import { resolveCanonicalAptSlug } from '@/lib/services/apartmentPageService';
import { getMainPageSchema, safeJsonLd } from '@/lib/utils/structuredData';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
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
  title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (1·2신도시 184개 가격 순위·전세가율) | D-VIEW',
  description:
    '동탄 아파트 시세·집값 추이 그래프·실거래가 순위 매일 동기화 — 동탄 1·2신도시 184개 아파트 가격·평형별 시세·전세가율·학군지 비교와 주담대 스트레스 DSR 40% 한도 계산기를 국토교통부 공식 실거래가로 바로 확인하세요.',
  keywords:
    '동탄 아파트 시세, 동탄 집값, 동탄 집값 그래프, 동탄 집값 추이 그래프, 동탄 아파트 가격, 동탄 아파트 순위, 동탄 신도시 아파트 시세, 동탄 1 신도시 아파트 시세, 동탄 아파트 실거래가, 1동탄 2동탄 차이, 동탄1 동탄2 비교, 동탄 전세가율, 동탄 학군지, 동탄역 롯데캐슬, D-VIEW, 디뷰, 동뷰, 동탄뷰',
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

      {/* Visible SSR Market Commentary & Editorial Hub for Search Crawlers and Users */}
      <section
        id="home-ssr-market-editorial"
        aria-label="동탄 신도시 부동산 시장 심층 분석 및 밸류에이션 리포트"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pb-8 pt-2"
      >
        <div className="rounded-2xl bg-elevated/80 dark:bg-elevated/35 p-4 sm:p-5 space-y-4 transition-colors">
          {/* Unified Report Hub: Contextual Interlinking Banner + Collapsed 23-Report Directory */}
          <div className="space-y-2">
            <div
              id="home-lab-to-guide-interlink"
              data-testid="home-lab-to-guide-interlink"
              className="rounded-2xl bg-body/90 dark:bg-[#17171c] px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <h3 className="text-xs sm:text-sm font-black text-primary">
                  D-VIEW 심층 분석 리포트
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={getVisualSignalPillClass('safe')}>{GUIDE_ARTICLES.length}편 아카이브</span>
                  <span className={getVisualSignalPillClass('neutral')}>평당가 · 전세가율</span>
                  <span className={getVisualSignalPillClass('down')}>DSR 40% 한도</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href="#home-guide-4col-grid"
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-elevated hover:bg-[#f2f4f6] dark:bg-body/60 dark:hover:bg-body text-primary text-[11px] font-extrabold transition-colors"
                >
                  목차 보기
                </a>
                <Link
                  href="/guide"
                  prefetch={false}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-colors"
                >
                  분석 리포트 전체보기
                </Link>
              </div>
            </div>

            <div id="home-guide-4col-grid" className="scroll-mt-20">
              <details className={getSeoAccordionClass('bg-body! dark:bg-[#17171c]!')}>
                <summary className={getSeoAccordionSummaryClass()}>
                  <span className="tabular-nums">분석 리포트 {GUIDE_ARTICLES.length}편 전체 목차 보기</span>
                  <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
                </summary>
                <div className={getSeoAccordionBodyClass('space-y-3')}>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#f2f4f6] dark:border-[#202027] text-[11px] font-extrabold">
                    <span className="text-tertiary tabular-nums">총 {GUIDE_ARTICLES.length}편 수록</span>
                    <a
                      href="#apt-market-energy-donut"
                      className="text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
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
                        className="group rounded-2xl bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] p-3 flex flex-col justify-between gap-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold">
                            {article.category}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-tertiary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            <span>{article.readingTime}</span>
                            <ChevronRight size={12} aria-hidden="true" />
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-primary group-hover:text-emerald-700 dark:group-hover:text-emerald-400 leading-snug transition-colors">
                          {article.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </div>
              </details>
            </div>
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
                    className="group rounded-2xl bg-body/90 hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] p-3.5 flex flex-col justify-between gap-2 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                          {zone.dongLabel}
                        </span>
                        {withLatestCount > 0 && (
                          <span className="text-[11px] font-bold text-tertiary tabular-nums shrink-0">
                            {withLatestCount}단지
                          </span>
                        )}
                      </div>
                      <h4 className="text-[13.5px] font-black text-primary group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                        {zone.name}
                      </h4>
                      <p className="text-[11.5px] text-secondary leading-snug">
                        {getZoneShortTagline(zone.id)}
                      </p>
                    </div>
                    {avgLatestPrice > 0 && (
                      <div className="pt-1.5 border-t border-[#f2f4f6] dark:border-[#202027] flex items-baseline justify-between gap-2">
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
                  className="text-[11.5px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
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
                      className="group min-w-0 overflow-hidden rounded-2xl bg-body/90 hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] p-3 sm:p-3.5 flex flex-col justify-between gap-2 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-tertiary leading-tight">
                          <span className="tabular-nums font-black text-emerald-700 dark:text-emerald-400">
                            #{idx + 1}
                          </span>
                          <span className="shrink-0">{apt.dong}</span>
                        </div>
                        <div className="text-[13px] font-bold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug break-keep [overflow-wrap:anywhere] min-w-0 transition-colors">
                          {apt.displayName}
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-[#f2f4f6] dark:border-[#202027] flex flex-col gap-0.5">
                        <div className="text-[13.5px] tabular-nums font-black text-emerald-700 dark:text-emerald-400 leading-tight">
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
            <details className={getSeoAccordionClass('bg-body! dark:bg-[#17171c]!')}>
              <summary className={getSeoAccordionSummaryClass()}>
                <span>밸류에이션 방법론 · 산출 기준 더보기</span>
                <ChevronDown size={16} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass('space-y-4')}>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border/40 pb-4">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
                      <span>D-VIEW 부동산 데이터 랩스 공식 분석 브리핑</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-primary tracking-tight">
                      동탄 아파트 시세·집값 추이 그래프 밸류에이션 방법론 및 권역별 심층 리포트
                    </h2>
                    <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                      D-VIEW(디뷰 · 동뷰 · 동탄뷰)는 국토교통부 실거래가 공개시스템의 100% 검증된 매매·전월세 신고 데이터를 매일 동기화하여, 동탄 1·2신도시 184개 아파트 시세·평형별 집값 추이 그래프·전세가율과 56개 동탄테크노밸리 지식산업센터의 내재 가치를 정량 분석합니다.
                    </p>
                  </div>
                  <Link
                    href="/guide"
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white text-xs font-extrabold transition-colors shrink-0 self-start lg:self-auto cursor-pointer"
                  >
                    <span>전체 심층 리포트 열람</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <article className="rounded-xl bg-elevated dark:bg-body/40 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs sm:text-sm">
                      <h3>실거주 PER 및 전세가율 하방 경직성</h3>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      단지별 매매가를 전세가로 나눈 실거주 PER(Price-to-Jeonse Ratio) 지표를 통해 실수요 지지력을 계측합니다. 반송동·능동 중심의 동탄1신도시는 완성된 학원가와 중심 상권을 기반으로 65~74% 구간의 전세가율 지지대를 형성하며, 청계동·오산동·송동 중심의 동탄2신도시는 GTX-A 동탄역 직결 수혜와 신축 선호도에 따른 상방 탄력성을 나타냅니다.
                    </p>
                  </article>

                  <article className="rounded-xl bg-elevated dark:bg-body/40 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-xs sm:text-sm">
                      <h3>스트레스 DSR 40% 한도 및 주담대 감응도</h3>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      차주 단위 DSR 40% 규제 및 스트레스 가산금리 적용 환경에서는 가구 합산 소득 대비 원리금 상환 비율이 매수 가능 가격대의 상한선을 결정합니다. D-VIEW 단지 상세 리포트는 실거래가 대비 LTV·DSR 한도와 HUG 전세보증금 반환보증(공시가격 126% 룰) 안전 마진을 동시에 산출하여 자금 조달 리스크를 사전에 진단합니다.
                    </p>
                  </article>

                  <article className="rounded-xl bg-elevated dark:bg-body/40 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs sm:text-sm">
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
              className={getSeoAccordionClass('bg-body! dark:bg-[#17171c]!')}
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
                      <caption className="text-left text-xs font-extrabold text-blue-700 dark:text-blue-400 pb-2 tabular-nums">
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
                                    className="hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2"
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

          {/* Real-Time Transaction Notification Anchor Section */}
          <section
            id="notification"
            aria-label="동탄 아파트 실거래가 동기화 및 알림 구독 안내"
            className="scroll-mt-20 rounded-2xl bg-body/90 dark:bg-[#17171c] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          >
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-primary">
                실거래 동기화 · 관심단지 알림
              </h3>
              <p className="text-[11px] sm:text-xs text-secondary tabular-nums">
                184단지 국토부 실거래 일일 반영 · 관심단지 변동 확인
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/explore"
                prefetch={false}
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-colors"
              >
                관심 단지 탐색하기
              </Link>
              <Link
                href="/contact"
                prefetch={false}
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-elevated hover:bg-[#f2f4f6] dark:bg-body/60 dark:hover:bg-body text-primary text-[11px] font-bold transition-colors"
              >
                데이터·알림 문의
              </Link>
            </div>
          </section>

          {/* Core Hub Quick Links (Deduplicated) */}
          <nav
            aria-label="D-VIEW 핵심 분석 허브 바로가기"
            className="flex flex-col gap-1.5 pt-3 border-t border-[#f2f4f6] dark:border-[#202027] text-[11px] font-bold text-secondary"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
                <span className="text-[10.5px] font-black text-tertiary uppercase tracking-wider">주요 서비스:</span>
                <Link href="/explore" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors tabular-nums">
                  단지 탐색 (184개)
                </Link>
                <Link href="/guide/stress-dsr-valuation-guide" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  대출·세금 계산기
                </Link>
                <Link href="/stats" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  시장 통계 지표
                </Link>
                <Link href="/lounge" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  입주민 라운지
                </Link>
                <Link href="/#notification" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  실거래 알림 구독
                </Link>
                <Link href="/technovalley" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors tabular-nums">
                  동탄테크노밸리 지식산업센터 56곳
                </Link>
                <Link href="/news" prefetch={false} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  부동산·교통 정책 브리핑
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-tertiary">
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
