import { Metadata } from 'next';
import { Suspense } from 'react';
import { getInitialData } from '@/lib/services/dashboardData';
import RealtimeClient from './RealtimeClient';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'D-VIEW 실거래 | 동탄 전역 아파트 실시간 최근 실거래가 및 신고가 내역',
  description: '동탄 179개 아파트 단지의 실시간 최근 실거래가 및 일자별 신고가 경신 내역 대시보드를 제공합니다.',
  alternates: {
    canonical: '/realtime',
  },
};

function RealtimeSkeleton() {
  return (
    <div className="w-full flex flex-col bg-transparent animate-pulse px-4 sm:px-6 md:px-10 lg:px-16 pt-3">
      {/* Page Title Skeleton */}
      <div className="min-h-[144px] py-6 flex flex-col gap-3">
        <div className="w-48 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
        <div className="w-72 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
      </div>
      {/* Cards grid */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="w-full h-[88px] bg-black/5 dark:bg-surface/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function RealtimeDataLoader() {
  const initialData = await getInitialData();
  return <RealtimeClient initialDashboardData={initialData} />;
}

export default function RealtimePage() {
  return (
    <Suspense fallback={<RealtimeSkeleton />}>
      <RealtimeDataLoader />
    </Suspense>
  );
}
