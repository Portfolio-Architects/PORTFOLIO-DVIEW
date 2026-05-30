import React from 'react';
import ReportClient from '@/components/ReportClient';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  return (
    <div className="w-full h-full pb-20">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-primary tracking-tight">리포트</h1>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 min-h-[500px]">
        <ReportClient />
      </div>
    </div>
  );
}
