import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Building2, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import { MBTIContainer } from '@/components/mbti/MBTIContainer';
import { AdSlot } from '@/components/ads/AdSlot';
import { ALL_MBTI_TYPES, getProfileByType, TEMPERAMENTS } from '@/lib/data/mbtiData';
import { getTxSummaryData, formatPriceEok } from '@/lib/services/apartmentPageService';
import { safeJsonLd } from '@/lib/utils/structuredData';

interface PageProps {
  params: Promise<{ type: string }>;
}

export async function generateStaticParams() {
  return ALL_MBTI_TYPES.map((type) => ({
    type,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const mbtiUpper = resolved.type.toUpperCase();
  const profile = getProfileByType(mbtiUpper);

  if (!profile) {
    return {
      title: '동탄 아파트 MBTI 주거 성향 테스트 | D-VIEW',
      description: '나의 라이프스타일에 딱 맞는 동탄 아파트를 찾아보세요.',
    };
  }

  const ogImageUrl = `https://dongtanview.com/api/og?type=mbti&mbti=${profile.type}&apt=${encodeURIComponent(profile.aptName)}&dong=${encodeURIComponent(profile.dong)}`;

  return {
    title: `[${profile.type}] ${profile.alias} — ${profile.aptName} | D-VIEW 주거 MBTI`,
    description: profile.recommendationReason,
    alternates: {
      canonical: `https://dongtanview.com/mbti/${profile.type}`,
    },
    openGraph: {
      title: `[${profile.type}] ${profile.alias} — ${profile.aptName}`,
      description: `나와 영혼의 궁합인 동탄 아파트는 바로 '${profile.aptName}'! 당신의 주거 성향 MBTI를 테스트해보세요.`,
      url: `https://dongtanview.com/mbti/${profile.type}`,
      siteName: 'D-VIEW',
      locale: 'ko_KR',
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `[${profile.type}] ${profile.alias} — ${profile.aptName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `[${profile.type}] ${profile.alias} — ${profile.aptName} | D-VIEW`,
      description: profile.tagline,
      images: [ogImageUrl],
    },
  };
}

export default async function MBTIDirectResultPage({ params }: PageProps) {
  const resolved = await params;
  const mbtiUpper = resolved.type.toUpperCase();
  const profile = getProfileByType(mbtiUpper);

  if (!profile) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const temperament = TEMPERAMENTS[profile.group];
  const txSummaryMap = await getTxSummaryData();
  const aptLookupKey = profile.txKey || profile.aptName.replace(/\s+/g, '');
  const matchedSummary = txSummaryMap[aptLookupKey] || txSummaryMap[profile.aptName];

  const latestSaleStr = matchedSummary?.latestPrice
    ? `${formatPriceEok(matchedSummary.latestPrice)} (${matchedSummary.latestDate || '최근'})`
    : matchedSummary?.latestPriceEok || '실거래 데이터 연동';
  const latestRentStr = matchedSummary?.latestRentDeposit
    ? formatPriceEok(matchedSummary.latestRentDeposit)
    : matchedSummary?.latestRentDepositEok || '정보 연동';
  const jeonseRatioVal =
    matchedSummary?.latestPrice && matchedSummary?.latestRentDeposit && matchedSummary.latestPrice > 0
      ? `${Math.round((matchedSummary.latestRentDeposit / matchedSummary.latestPrice) * 100)}%`
      : '실수요 안정권';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Quiz',
        '@id': `${baseUrl}/mbti/${profile.type}#quiz`,
        url: `${baseUrl}/mbti/${profile.type}`,
        name: `[${profile.type}] ${profile.alias} 주거 성향 분석 및 매칭 리포트`,
        description: profile.recommendationReason,
        educationalAlignment: {
          '@type': 'AlignmentObject',
          alignmentType: 'educationalSubject',
          targetName: temperament.name,
        },
        about: {
          '@type': 'Place',
          '@id': `${baseUrl}/apartment/${encodeURIComponent(aptLookupKey)}#place`,
          name: profile.aptName,
        },
      },
      {
        '@type': ['Place', 'ApartmentComplex'],
        '@id': `${baseUrl}/apartment/${encodeURIComponent(aptLookupKey)}#place`,
        name: profile.aptName,
        description: `${profile.tagline} — ${profile.recommendationReason}`,
        url: `${baseUrl}/apartment/${encodeURIComponent(aptLookupKey)}`,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'KR',
          addressRegion: '경기도',
          addressLocality: '화성시',
          streetAddress: `${profile.dong} ${profile.aptName}`,
        },
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
        <MBTIContainer initialView="result" initialType={profile.type} />

        {/* Visible SSR Semantic Analysis Section for Crawlers & Deep-Link Visitors */}
        <section
          id="mbti-type-ssr-analysis"
          className="w-full max-w-[960px] mx-auto px-4 sm:px-6"
        >
          <div className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
            <div className="border-b border-border/60 pb-6">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1 rounded-full mb-3 border border-emerald-500/20">
                <ShieldCheck size={14} className="shrink-0" />
                <span>{temperament.name} · 정량 주거 매칭 리포트</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                [{profile.type}] {profile.alias} — {profile.aptName} 심층 입지 분석
              </h2>
              <p className="mt-2 text-primary/80 font-bold text-[14px] sm:text-[15.5px]">
                {profile.tagline}
              </p>
              <p className="mt-3 text-secondary text-[13.5px] sm:text-[15px] leading-relaxed font-medium">
                {profile.recommendationReason}
              </p>
            </div>

            {/* Lifestyle Fit Highlights */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-extrabold text-primary tracking-tight">
                {profile.type} 맞춤형 3대 핵심 라이프스타일 핏
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profile.lifestyleFit.map((fit, idx) => (
                  <li
                    key={idx}
                    className="bg-body p-4 rounded-2xl border border-border/50 flex items-start gap-2.5 text-[13px] text-secondary font-medium"
                  >
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{fit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Matched Apartment Specs & 5-Axis Radar Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-body p-5 rounded-2xl border border-border/50 space-y-3">
                <h3 className="text-sm font-extrabold text-primary flex items-center gap-1.5">
                  <Building2 size={15} className="text-emerald-600 shrink-0" />
                  <span>매칭 단지 실거래 및 입지 스펙 요약</span>
                </h3>
                <table className="w-full text-left text-[12.5px] text-secondary">
                  <caption className="sr-only">{profile.aptName} 실거래 및 입지 스펙 요약표</caption>
                  <tbody className="divide-y divide-border/40 font-medium">
                    <tr>
                      <th scope="row" className="py-2.5 font-bold text-primary">매칭 단지명</th>
                      <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">{profile.aptName}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2.5 font-bold text-primary">소재 법정동</th>
                      <td className="py-2.5">경기도 화성시 {profile.dong}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2.5 font-bold text-primary">최근 실거래 매매가</th>
                      <td className="py-2.5 font-bold text-primary">{latestSaleStr}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2.5 font-bold text-primary">최근 전세 보증금</th>
                      <td className="py-2.5">{latestRentStr}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2.5 font-bold text-primary">전세가율 지표</th>
                      <td className="py-2.5">{jeonseRatioVal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-body p-5 rounded-2xl border border-border/50 space-y-3">
                <h3 className="text-sm font-extrabold text-primary">
                  5대 주거 인프라 정량 평가 점수 (100점 만점)
                </h3>
                <table className="w-full text-left text-[12.5px] text-secondary">
                  <caption className="sr-only">{profile.aptName} 5대 주거 인프라 정량 평가표</caption>
                  <thead className="border-b border-border/60 font-bold text-primary">
                    <tr>
                      <th scope="col" className="pb-2">평가 항목</th>
                      <th scope="col" className="pb-2">정량 점수</th>
                      <th scope="col" className="pb-2">유형 적합도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    <tr>
                      <th scope="row" className="py-2 font-bold text-primary">교통 / 기동력</th>
                      <td className="py-2 font-bold text-emerald-600 dark:text-emerald-400">{profile.radar.transit}점</td>
                      <td className="py-2">GTX-A·SRT 및 광역버스 접근성</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2 font-bold text-primary">자연 / 힐링</th>
                      <td className="py-2 font-bold text-emerald-600 dark:text-emerald-400">{profile.radar.nature}점</td>
                      <td className="py-2">호수공원·수변·숲세권 쾌적성</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2 font-bold text-primary">교육 / 학군</th>
                      <td className="py-2 font-bold text-emerald-600 dark:text-emerald-400">{profile.radar.education}점</td>
                      <td className="py-2">초품아 통학 및 학원가 밀집도</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2 font-bold text-primary">상권 / 슬세권</th>
                      <td className="py-2 font-bold text-emerald-600 dark:text-emerald-400">{profile.radar.commerce}점</td>
                      <td className="py-2">백화점·스트리트몰 생활 편의성</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-2 font-bold text-primary">미래가치 / 환금성</th>
                      <td className="py-2 font-bold text-emerald-600 dark:text-emerald-400">{profile.radar.futureValue}점</td>
                      <td className="py-2">대장주 시세 리딩 및 거래 유동성</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Direct Link to Apartment SSR Report */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border/60">
              <div>
                <strong className="text-sm font-extrabold text-primary block">
                  {profile.aptName} 평형별 실거래가 및 주담대 DSR 한도 확인
                </strong>
                <span className="text-[12px] text-secondary">
                  단지 상세 페이지에서 원리금균등 상환표와 스트레스 DSR 40% 한도를 확인하세요.
                </span>
              </div>
              <Link
                href={`/apartment/${encodeURIComponent(aptLookupKey)}`}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-extrabold transition-colors shrink-0"
              >
                <Building2 size={15} />
                <span>{profile.aptName} 상세 분석 리포트</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Zero-CLS AdSlot */}
            <div
              data-testid="mbti-type-ssr-adslot"
              className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
            >
              <AdSlot
                slotId="1000000002"
                refreshSlotId={`1000000002_mbti_${profile.type}`}
                format="rectangle"
                minHeightClass="min-h-[250px]"
                cpaCampaignId="mortgage-refinance"
                apartmentName={profile.aptName}
              />
            </div>
          </div>
        </section>
      </main>

      <MobileDock activeTab="mbti" />
    </div>
  );
}
