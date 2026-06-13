import React from 'react';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
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
