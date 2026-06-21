import { Metadata } from 'next';
import { Suspense } from 'react';
import TechnoValleyClient from './TechnoValleyClient';

export const metadata: Metadata = {
  title: 'D-VIEW 테크노밸리 | 동탄 지식산업센터 공실 매칭 & 혜택 센터',
  description: '동탄 테크노밸리 지식산업센터의 공실 해소를 위한 원스톱 솔루션. 빌딩별 공실 정보, 소형 오피스 공동임차 매칭, 입주 혜택 시뮬레이터 및 맞춤형 오피스 핏파인더를 제공합니다.',
  alternates: {
    canonical: '/technovalley',
  },
};

function TechnoValleySkeleton() {
  return (
    <div className="w-full flex flex-col bg-transparent animate-pulse px-4 sm:px-6 md:px-10 lg:px-16 pt-3">
      {/* Page Title Skeleton */}
      <div className="min-h-[144px] py-6 flex flex-col gap-3">
        <div className="w-48 h-8 bg-black/5 dark:bg-surface/5 rounded-xl" />
        <div className="w-72 h-4 bg-black/5 dark:bg-surface/5 rounded-lg" />
      </div>
      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="w-full h-[220px] bg-black/5 dark:bg-surface/5 rounded-3xl" />
        <div className="w-full h-[220px] bg-black/5 dark:bg-surface/5 rounded-3xl" />
      </div>
    </div>
  );
}

export default async function TechnoValleyPage() {
  return (
    <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto relative pb-[100px] sm:pb-12 animate-in fade-in duration-500">
      <Suspense fallback={<TechnoValleySkeleton />}>
        <TechnoValleyClient />
      </Suspense>
    </main>
  );
}
