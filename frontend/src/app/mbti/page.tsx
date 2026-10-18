import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Compass, Building2 } from 'lucide-react';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import { MBTIContainer } from '@/components/mbti/MBTIContainer';
import { AdSlot } from '@/components/ads/AdSlot';
import { ALL_MBTI_TYPES, MBTI_PROFILES, TEMPERAMENTS } from '@/lib/data/mbtiData';
import { safeJsonLd } from '@/lib/utils/structuredData';

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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Quiz',
        '@id': `${baseUrl}/mbti#quiz`,
        url: `${baseUrl}/mbti`,
        name: '동탄 아파트 MBTI 주거 성향 진단 테스트',
        description:
          '교통·자연·학군·슬세권·미래가치 5대 입지 지표를 기반으로 16개 MBTI 주거 성향과 동탄 랜드마크 아파트를 매칭하는 정량 진단 도구',
        about: {
          '@type': 'Place',
          name: '경기도 화성시 동탄신도시 아파트 단지',
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${baseUrl}/mbti#encyclopedia`,
        name: '16개 MBTI 주거 성향별 동탄 대표 매칭 아파트 목록',
        numberOfItems: ALL_MBTI_TYPES.length,
        itemListElement: ALL_MBTI_TYPES.map((type, idx) => {
          const profile = MBTI_PROFILES[type];
          return {
            '@type': 'ListItem',
            position: idx + 1,
            url: `${baseUrl}/mbti/${type}`,
            name: `[${profile.type}] ${profile.alias} — ${profile.aptName}`,
            item: {
              '@type': 'Place',
              name: profile.aptName,
              description: profile.recommendationReason,
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'KR',
                addressRegion: '경기도',
                addressLocality: `화성시 ${profile.dong}`,
              },
            },
          };
        }),
      },
    ],
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-body relative pb-[env(safe-area-inset-bottom)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      <LoungeHeader activeTab="mbti" />

      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto py-6 sm:py-8 space-y-8">
        <MBTIContainer initialView="intro" />

        {/* Visible SSR Semantic Catalog for Search Crawlers & Users */}
        <section
          id="mbti-hub-ssr-summary"
          className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8"
        >
          <div className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
            <div className="border-b border-border/60 pb-5">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1 rounded-full mb-3 border border-emerald-500/20">
                <Compass size={13} className="shrink-0" />
                <span>D-VIEW 16개 주거 성향 정량 매칭 아키텍처</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                동탄 16개 MBTI 유형별 대표 랜드마크 단지 입지 분석표
              </h2>
              <p className="mt-2 text-[13.5px] sm:text-[14.5px] text-secondary leading-relaxed font-medium">
                분석가형(NT), 외교관형(NF), 관리자형(SJ), 탐험가형(SP) 4대 기질과 5대 주거 인프라 지표(교통, 자연, 학군, 상권, 미래가치)를 결합한 동탄 대표 아파트 16선입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(TEMPERAMENTS).map((temp) => (
                <div key={temp.group} className="bg-body p-4 rounded-2xl border border-border/50">
                  <strong className="text-sm font-black text-primary block">{temp.name}</strong>
                  <p className="mt-1 text-[12px] text-secondary leading-relaxed font-medium">
                    {temp.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table className="w-full text-left text-[12.5px] text-secondary">
                <caption className="sr-only">
                  16개 MBTI 주거 성향별 매칭 아파트 단지, 행정동, 핵심 지표 및 상세 리포트 링크표
                </caption>
                <thead className="bg-body text-primary font-bold border-b border-border/60">
                  <tr>
                    <th scope="col" className="p-3 whitespace-nowrap">MBTI 유형</th>
                    <th scope="col" className="p-3 whitespace-nowrap">성향 별칭</th>
                    <th scope="col" className="p-3 whitespace-nowrap">매칭 랜드마크 단지</th>
                    <th scope="col" className="p-3 whitespace-nowrap">법정동</th>
                    <th scope="col" className="p-3 whitespace-nowrap">5대 지표 (교통/자연/학군/상권/가치)</th>
                    <th scope="col" className="p-3 whitespace-nowrap">상세 분석</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {ALL_MBTI_TYPES.map((type) => {
                    const p = MBTI_PROFILES[type];
                    const aptSlug = encodeURIComponent(p.txKey || p.aptName);
                    return (
                      <tr key={type} className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                        <th scope="row" className="p-3 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          <Link href={`/mbti/${type}`} className="hover:underline">
                            {type}
                          </Link>
                        </th>
                        <td className="p-3 font-semibold text-primary whitespace-nowrap">{p.alias}</td>
                        <td className="p-3 font-bold text-primary whitespace-nowrap">
                          <Link href={`/apartment/${aptSlug}`} className="inline-flex items-center gap-1 hover:text-emerald-600 transition-colors">
                            <Building2 size={13} className="shrink-0 text-emerald-600" />
                            <span>{p.aptName}</span>
                          </Link>
                        </td>
                        <td className="p-3 whitespace-nowrap">화성시 {p.dong}</td>
                        <td className="p-3 whitespace-nowrap">
                          {p.radar.transit} / {p.radar.nature} / {p.radar.education} / {p.radar.commerce} / {p.radar.futureValue}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Link
                            href={`/mbti/${type}`}
                            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                          >
                            유형 리포트 →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Zero-CLS AdSlot */}
            <div
              data-testid="mbti-hub-adslot"
              className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
            >
              <AdSlot
                slotId="1000000001"
                refreshSlotId="1000000001_mbti_hub"
                format="rectangle"
                minHeightClass="min-h-[250px]"
                cpaCampaignId="mortgage-refinance"
                apartmentName="동탄 MBTI"
              />
            </div>
          </div>
        </section>
      </main>

      <MobileDock activeTab="mbti" />
    </div>
  );
}
