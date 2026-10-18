import { Suspense } from 'react';
import Script from 'next/script';
import { Metadata } from 'next';
import DashboardClient from '@/components/DashboardClient';
import { getInitialData } from '@/lib/services/dashboardData';
import { getMainPageSchema, safeJsonLd } from '@/lib/utils/structuredData';

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
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-stretch">
          <div className="lg:col-span-6 h-[420px] lg:h-[566px] bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse" />
          <div className="lg:col-span-6 h-[420px] lg:h-[566px] bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse" />
        </div>
      </main>
    </div>
  );
}

async function DashboardDataLoader({ initialTab = 'overview' }: { initialTab?: 'overview' | 'imjang' | 'mbti' }) {
  const initialData = await getInitialData();

  return <DashboardClient initialDashboardData={initialData} initialTab={initialTab} />;
}

export default async function HomePage() {
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
        <DashboardDataLoader initialTab="overview" />
      </Suspense>
    </>
  );
}
