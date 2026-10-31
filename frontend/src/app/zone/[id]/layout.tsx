import { Metadata } from 'next';
import React from 'react';
import { getZoneById, getDongsForZone } from '@/lib/zones';

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
        canonical: `https://dongtanview.com/zone/${params.id}`,
      },
    };
  }

  const dongs = getDongsForZone(zone.id);
  const legalDongsStr = dongs.filter((d) => !zone.dongLabel.includes(d)).join('·');
  const combinedDongBadge = legalDongsStr
    ? `${legalDongsStr} · ${zone.dongLabel}`
    : zone.dongLabel;

  return {
    title: `동탄 ${zone.name}(${combinedDongBadge}) 아파트 실거래가·전세가율·학군 비교 - D-VIEW`,
    description: `동탄 ${zone.name}(${combinedDongBadge}) 국토교통부 실거래 시세, 전세가율, 초·중·고 학군 및 입지 분석 리포트를 D-VIEW에서 확인하세요. ${zone.description}`,
    alternates: {
      canonical: `https://dongtanview.com/zone/${params.id}`,
    },
  };
}

export default function ZoneLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
