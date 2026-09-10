import { Metadata } from 'next';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import { MBTIContainer } from '@/components/mbti/MBTIContainer';

export const metadata: Metadata = {
  title: '동탄 아파트 MBTI 주거 성향 테스트 | D-VIEW',
  description:
    '7가지 라이프스타일 질문으로 알아보는 나의 운명 동탄 아파트 매칭! 16개 MBTI 유형별 대표 랜드마크 단지와 입지 가치 분석 도감을 확인하세요.',
  alternates: {
    canonical: 'https://dongtanview.com/mbti',
  },
  openGraph: {
    title: '동탄 아파트 MBTI 주거 성향 테스트 | D-VIEW',
    description: '나의 라이프스타일과 성향에 딱 맞는 동탄 아파트는 어디일까요? 1분 주거 성향 진단!',
    url: 'https://dongtanview.com/mbti',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: 'https://dongtanview.com/api/og?type=mbti&mbti=ENTJ&apt=%EB%8F%99%ED%83%84%EC%97%AD%20%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
        width: 1200,
        height: 630,
        alt: 'D-VIEW 동탄 아파트 MBTI 주거 성향 테스트',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '동탄 아파트 MBTI 주거 성향 테스트 | D-VIEW',
    description: '7문항으로 진단하는 나의 맞춤 동탄 신도시 랜드마크 아파트!',
    images: [
      'https://dongtanview.com/api/og?type=mbti&mbti=ENTJ&apt=%EB%8F%99%ED%83%84%EC%97%AD%20%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
    ],
  },
};

export default function MBTIHubPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-body relative pb-[env(safe-area-inset-bottom)]">
      <LoungeHeader activeTab="mbti" />

      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto py-6 sm:py-8">
        <MBTIContainer initialView="intro" />
      </main>

      <MobileDock activeTab="mbti" />
    </div>
  );
}
