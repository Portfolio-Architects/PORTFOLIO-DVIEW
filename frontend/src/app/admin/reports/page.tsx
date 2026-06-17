'use client';

import nextDynamic from 'next/dynamic';

const AnalyticsDashboard = nextDynamic(() => import('@/components/admin/AnalyticsDashboard').catch(err => {
  console.warn('AnalyticsDashboard Chunk Load failure, initiating fallback reload', err);
  return { default: () => null };
}), {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-[500px] flex items-center justify-center bg-body/50 rounded-2xl animate-pulse">
      <span className="text-tertiary text-[13px] font-bold">애널리틱스 로드 중...</span>
    </div>
  )
});

export const dynamic = 'force-dynamic';

export default function AdminReportsPage() {
  return (
    <div className="w-full h-full pb-20">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-primary tracking-tight">애널리틱스 리포트</h1>
      </div>
      <div className="min-h-[500px]">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
