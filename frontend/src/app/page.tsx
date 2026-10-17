import { Suspense } from 'react';
import Link from 'next/link';
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
}

interface TxSummaryItem {
  latestPrice?: number;
  dong?: string;
  avg1MPrice?: number;
  avg1MRentDeposit?: number;
}

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'D-VIEW 동탄 아파트 랩 | 동탄 아파트 실거래가·시세·AI 밸류에이션 분석 허브',
  description: '동탄 179개 단지 아파트 실거래가, AI 밸류에이션, 주담대·갈아타기 적정가 진단부터 안심 전세 자산 리포트를 제공합니다.',
  alternates: {
    canonical: 'https://dongtanview.com',
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
      <DashboardClient initialDashboardData={initialData} initialTab={initialTab} />

      {/* 📊 High-Visibility Market Overview & Internal Navigation (Visible SSR Content for Users & AdSense Reviewers) */}
      <section className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-8 my-6">
        <div className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          
          <div className="border-b border-border/60 pb-5">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1 rounded-full mb-3 border border-emerald-500/20">
              📈 동탄 부동산 시장 지형도
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              동탄 부동산 실거래 대시보드 및 시세 리더보드
            </h1>
            <p className="mt-2 text-secondary text-[13px] sm:text-[14.5px] leading-relaxed font-medium">
              동탄 179개 단지 아파트 실거래가, AI 밸류에이션, 주담대·갈아타기 적정가 진단부터 안심 전세 자산 리포트를 실시간 공공데이터 기반으로 통합 분석합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top 10 Leaderboard */}
            <div className="space-y-3">
              <h2 className="text-base sm:text-lg font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                동탄 시세 리더 아파트 TOP 10 (대장 단지 랭킹)
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-[12.5px] text-secondary">
                  <thead className="bg-body text-primary font-bold border-b border-border/60">
                    <tr>
                      <th className="p-3">순위</th>
                      <th className="p-3">단지명</th>
                      <th className="p-3">법정동</th>
                      <th className="p-3">최근 실거래가</th>
                      <th className="p-3">전세가율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {top10Leaderboard.map((apt, index) => (
                      <tr key={apt.name} className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                        <td className="p-3 font-bold text-primary">{index + 1}위</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          <Link href={`/apartment/${encodeURIComponent(apt.name)}`} className="hover:underline">
                            {apt.name}
                          </Link>
                        </td>
                        <td className="p-3 text-tertiary">{apt.dong}</td>
                        <td className="p-3 font-bold text-primary">{formatPrice(apt.latestPrice)}</td>
                        <td className="p-3">{apt.jeonseRatio > 0 ? `${apt.jeonseRatio}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent 15 Transactions */}
            <div className="space-y-3">
              <h2 className="text-base sm:text-lg font-extrabold text-primary tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                최근 동탄 아파트 실거래 등록 내역 (최신 등록)
              </h2>
              {recentTxs.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-border/60">
                  <table className="w-full text-left text-[12.5px] text-secondary">
                    <thead className="bg-body text-primary font-bold border-b border-border/60">
                      <tr>
                        <th className="p-3">단지명</th>
                        <th className="p-3">면적/층</th>
                        <th className="p-3">유형</th>
                        <th className="p-3">거래금액</th>
                        <th className="p-3">계약일</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {(recentTxs as HomeTransactionRecord[]).slice(0, 10).map((tx, idx: number) => {
                        const txPrice = tx.price || 0;
                        const aptName = tx.apartmentName || '아파트';
                        return (
                          <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                            <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                              <Link href={`/apartment/${encodeURIComponent(aptName)}`} className="hover:underline">
                                {aptName}
                              </Link>
                            </td>
                            <td className="p-3 text-tertiary">
                              {tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평` : '-'} {tx.floor ? `(${tx.floor}층)` : ''}
                            </td>
                            <td className="p-3 font-semibold">{tx.dealType || '매매'}</td>
                            <td className="p-3 font-bold text-primary">{formatPrice(txPrice)}</td>
                            <td className="p-3 text-tertiary">{tx.contractYm && tx.contractDay ? `${tx.contractYm}.${tx.contractDay}` : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-body p-4 rounded-2xl border border-border/50 text-[13px] text-secondary">
                  최근 거래 내역을 실시간 수집 중입니다.
                </div>
              )}
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

export default async function HomePage(props: {
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
