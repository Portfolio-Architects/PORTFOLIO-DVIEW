import { Metadata } from 'next';
import React from 'react';
import { getZoneById } from '@/lib/zones';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const zone = getZoneById(params.id);
  if (!zone) {
    return {
      title: 'D-VIEW | 동탄 아파트 투자 권역 분석',
      description: '동탄 아파트 투자 권역별 실거래 시세, 전세가율, 인프라 요약을 확인하세요.',
      alternates: {
        canonical: `/zone/${params.id}`,
      },
    };
  }

  return {
    title: `D-VIEW | ${zone.name} (${zone.dongLabel}) 아파트 투자 가치분석`,
    description: `${zone.name} (${zone.dongLabel}): ${zone.description} 해당 권역에 속한 아파트의 실거래 시세, 전세가율, 현장 임장 보고서를 D-VIEW에서 확인해 보세요.`,
    alternates: {
      canonical: `/zone/${params.id}`,
    },
  };
}

export default function ZoneLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
