import { Suspense } from 'react';
import Script from 'next/script';
import DashboardClient from '@/components/DashboardClient';
import { getInitialData } from '@/lib/services/dashboardData';
import { getMainPageSchema, safeJsonLd } from '@/lib/utils/structuredData';

// Use Incremental Static Regeneration (ISR) to eliminate TTFB bottlenecks
export const revalidate = 3600;


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

async function DashboardDataLoader() {
  const initialData = await getInitialData();
  
  // Extract top 10 apartments by latest price for 대장 단지 랭킹
  const txSummary = initialData.txSummary || {};
  const allApts = Object.entries(txSummary).map(([name, sum]: [string, any]) => ({
    name,
    latestPrice: sum.latestPrice || 0,
    dong: sum.dong || '',
    avg1MPrice: sum.avg1MPrice || 0,
    jeonseRatio: sum.avg1MPrice > 0 && sum.avg1MRentDeposit > 0 ? Math.round((sum.avg1MRentDeposit / sum.avg1MPrice) * 100) : 0
  })).filter(a => a.latestPrice > 0);

  const top10Leaderboard = [...allApts]
    .sort((a, b) => b.latestPrice - a.latestPrice)
    .slice(0, 10);

  // Extract recent transactions (up to 15 items)
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
      {/* SSR SEO Semantic HTML Block */}
      <div className="sr-only" aria-hidden="true">
        <h1>동탄 부동산 실거래 대시보드 - D-VIEW</h1>
        <p>동탄 신도시 전체 아파트 실거래가 추이, 최고가 상승/하락 트렌드, 전세가율 갭투자 리스크 진단 전문 분석 리포트 플랫폼</p>
        
        <section>
          <h2>동탄 시세 리더 아파트 TOP 10 (대장 단지 랭킹)</h2>
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
            <h2>최근 동탄 아파트 실거래 등록 내역 (최신 15건)</h2>
            <ul>
              {recentTxs.slice(0, 15).map((tx: any, idx: number) => {
                const txPrice = tx.price || 0;
                return (
                  <li key={idx}>
                    <strong>{tx.apartmentName || '아파트'}</strong> ({tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평형` : ''}, {tx.floor ? `${tx.floor}층` : ''}) - 
                    {tx.dealType || '매매'} {formatPrice(txPrice)} 
                    {tx.contractYm && tx.contractDay ? ` (거래일: ${tx.contractYm}.${tx.contractDay})` : ''}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
      <DashboardClient initialDashboardData={initialData} />
    </>
  );
}

export default async function Page() {
  const nonce = undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const jsonLd = getMainPageSchema(baseUrl);

  return (
    <>
      <Script
        id="jsonld-main-schema"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader />
      </Suspense>
    </>
  );
}

