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

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-body">
      <header className="bg-surface/90 border-b border-border sticky top-0 z-40">
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 h-14 sm:h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-32 h-8 bg-body rounded-full animate-pulse" />
            <div className="w-16 h-8 bg-body rounded-full animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-body rounded-full animate-pulse" />
        </div>
      </header>
      <main className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-3 sm:py-5 md:py-8">
        <div className="mb-6 flex gap-3 items-center">
           <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/5 dark:bg-surface/5 rounded-xl animate-pulse" />
           <div className="w-48 sm:w-64 h-8 bg-black/5 dark:bg-surface/5 rounded-lg animate-pulse" />
        </div>
        <div className="flex flex-col md:flex-row md:bg-surface md:rounded-2xl md:border md:border-border md:shadow-sm gap-4 md:gap-0">
           <div className="w-full md:w-[380px] h-[600px] bg-surface rounded-2xl md:bg-transparent md:border-r md:border-border flex flex-col">
             <div className="p-4 border-b border-border">
               <div className="w-full h-10 bg-black/5 dark:bg-surface/5 rounded-xl animate-pulse" />
             </div>
             <div className="p-4 flex flex-col gap-4">
               {[1, 2, 3, 4, 5, 6].map(i => (
                 <div key={i} className="w-full h-[72px] bg-black/5 dark:bg-surface/5 rounded-xl animate-pulse" />
               ))}
             </div>
           </div>
           <div className="hidden md:block flex-1 h-[600px] bg-body rounded-tr-2xl rounded-br-2xl p-8">
             <div className="w-48 h-10 bg-black/5 dark:bg-surface/5 rounded-xl animate-pulse mb-8" />
             <div className="w-full h-64 bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse mb-4" />
             <div className="w-full h-32 bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse" />
           </div>
        </div>
      </main>
    </div>
  );
}

async function DashboardDataLoader({ initialTab }: { initialTab?: 'overview' | 'imjang' | 'mbti' }) {
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
      <section
        id="overview-ssr-semantic-catalog"
        aria-label="동탄 대장 아파트 랭킹 및 최신 실거래 내역"
        className="sr-only"
      >
        <header>
          <h2>동탄 아파트 시세·실거래가·집값 추이 그래프 대시보드 - D-VIEW</h2>
          <p>국토교통부 실거래가 공개시스템 공식 데이터 기반 동탄 1·2신도시 184개 아파트 시세, 평형별 집값 추이 그래프, 전세가율 및 전세 안전 진단 리포트 플랫폼</p>
        </header>
        <section>
          <h3>동탄 시세 리더 아파트 TOP 10 (대장 단지 랭킹)</h3>
          <ol>
            {top10Leaderboard.map((apt, index) => (
              <li key={apt.name}>
                <strong>{index + 1}위: {apt.name}</strong> ({apt.dong}) - 
                최근 실거래가: {formatPrice(apt.latestPrice)}
                {apt.jeonseRatio > 0 ? ` (전세가율 약 ${apt.jeonseRatio}%)` : ''}
              </li>
            ))}
          </ol>
        </section>
        {recentTxs.length > 0 && (
          <section style={{ marginTop: '20px' }}>
            <h3>최근 동탄 아파트 실거래 등록 내역 (최신 15건)</h3>
            <ul>
              {(recentTxs as HomeTransactionRecord[]).slice(0, 15).map((tx, idx: number) => {
                const txPrice = tx.price || 0;
                return (
                  <li key={idx}>
                    <strong>{tx.apartmentName || '아파트'}</strong> ({tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평형` : ''}, {tx.floor ? `${tx.floor}층` : ''}) - 
                    {tx.dealType || '매매'} {formatPrice(txPrice)} 
                    {tx.contractYm && tx.contractDay ? ` (계약일: ${tx.contractYm}.${tx.contractDay})` : ''}
                    {tx.registeredDate ? ` [등록일: ${tx.registeredDate}]` : ''}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </section>
      <DashboardClient initialDashboardData={initialData} initialTab={initialTab} />
    </>
  );
}

export default async function OverviewPage(props: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const tab = searchParams?.tab;

  let initialTab: 'overview' | 'imjang' | 'mbti' = 'overview';
  if (tab === 'imjang') initialTab = 'imjang';
  else if (tab === 'mbti') initialTab = 'mbti';
  // legacy lounge, office & technovalley fall back cleanly to overview

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
