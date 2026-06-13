import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import DashboardClient from '@/components/DashboardClient';
import { getInitialData } from '@/lib/services/dashboardData';

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
  return <DashboardClient initialDashboardData={initialData} />;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string }>;
}) {
  const resolvedParams = await searchParams;
  if (resolvedParams?.tab === 'imjang') {
    const query = resolvedParams.search ? `?search=${encodeURIComponent(resolvedParams.search)}` : '';
    redirect(`/explore${query}`);
  }

  const nonce = (await headers()).get('x-nonce') || undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://dongtanview.com/#website",
        "url": "https://dongtanview.com",
        "name": "D-VIEW | 동탄 아파트 가치분석",
        "description": "동탄 179개 아파트의 실거래가·인프라·학군·현장 사진 가치 분석 플랫폼",
        "publisher": {
          "@id": "https://dongtanview.com/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${baseUrl}/?tab=imjang&search={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        },
        "inLanguage": "ko-KR"
      },
      {
        "@type": "Organization",
        "@id": "https://dongtanview.com/#organization",
        "name": "D-VIEW 부동산 데이터 랩스",
        "url": "https://dongtanview.com",
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/d-view-icon.png`,
          "width": 192,
          "height": 192
        },
        "description": "동탄 전역 아파트 실거래가 추이, 전세가율 갭투자 리스크, 안심 보육 학군 지도 시각화 전문 기관"
      }
    ]
  };

  return (
    <>
      <Script
        id="jsonld-main-schema"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader />
      </Suspense>
    </>
  );
}

