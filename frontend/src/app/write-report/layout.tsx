import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'D-VIEW | 동탄 아파트 현장 임장 보고서 작성',
  description: '동탄 아파트 현장을 직접 방문하여 촬영한 사진과 생생한 가치 평가 정보를 바탕으로 프리미엄 임장 보고서를 작성합니다. 다른 사용자들과 입지, 교통, 학군 정보를 나누세요.',
  alternates: {
    canonical: '/write-report',
  },
};

export default function WriteReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
