import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Building2, MapPin, BookOpen, ArrowRight } from 'lucide-react';
import { ZONES, getZoneById, getDongsForZone } from '@/lib/zones';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { getInitialData } from '@/lib/services/dashboardData';
import { AdSlot } from '@/components/ads/AdSlot';
import ZoneDetailClient from './ZoneDetailClient';
import { DongApartment } from '@/lib/dong-apartments';

import { getTxSummaryData, formatPriceEok } from '@/lib/services/apartmentPageService';

export async function generateStaticParams() {
  return ZONES.map((zone) => ({
    id: zone.id,
  }));
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const params = await props.params;
  const zone = getZoneById(params.id);

  if (!zone) {
    return {
      title: '투자 권역 상세 분석 - D-VIEW',
      description: '동탄 아파트 가치분석 권역 상세 리포트',
    };
  }

  const dongs = getDongsForZone(zone.id);
  const txSummary = await getTxSummaryData();
  const zoneEntries = Object.entries(txSummary || {})
    .filter(([, s]) => s && s.dong && dongs.includes(s.dong) && (s.latestPrice || 0) > 0)
    .sort((a, b) => (b[1].latestPrice || 0) - (a[1].latestPrice || 0));

  const zoneAptCount = zoneEntries.length;
  const topApt = zoneEntries[0];
  const leaderPriceBadge = topApt
    ? ` (대장 ${topApt[0]} 최근 ${formatPriceEok(topApt[1].latestPrice || 0)})`
    : '';
  const countBadge = zoneAptCount > 0 ? `${zoneAptCount}개 단지 ` : '';

  const legalDongsStr = dongs.filter((d) => !zone.dongLabel.includes(d)).join('·');
  const combinedDongBadge = legalDongsStr
    ? `${legalDongsStr} · ${zone.dongLabel}`
    : zone.dongLabel;

  const title = `동탄 ${zone.name}(${combinedDongBadge}) 아파트 실거래가·전세가율·학군 비교 - D-VIEW`;
  const description = `동탄 ${zone.name}(${combinedDongBadge}) ${countBadge}국토교통부 실거래가 비교${leaderPriceBadge}. ${zone.description} 단지별 매매가·전세가율·입지 가치 리포트를 D-VIEW에서 확인하세요.`;

  const ogUrl = new URL(`${baseUrl}/api/og`);
  ogUrl.searchParams.set('title', `동탄 ${zone.name}`);
  ogUrl.searchParams.set('subtitle', `${combinedDongBadge} · ${countBadge}국토부 실거래 분석`);

  return {
    title,
    description,
    keywords: `동탄 ${zone.name}, ${zone.dongLabel} 아파트, ${dongs.map((d) => `동탄 ${d} 실거래가`).join(', ')}, 동탄 학군, 전세가율, D-VIEW`,
    alternates: {
      canonical: `https://dongtanview.com/zone/${params.id}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/zone/${params.id}`,
      siteName: 'D-VIEW',
      locale: 'ko_KR',
      type: 'website',
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: `동탄 ${zone.name} 아파트 실거래 분석`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl.toString()],
    },
  };
}

export default async function ZoneDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const zone = getZoneById(params.id);
  const nonce = undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  if (!zone) {
    return <ZoneDetailClient />;
  }

  // Fetch initial data for SSR SEO extraction
  const initialData = await getInitialData();
  const dongs = getDongsForZone(zone.id);

  const apartmentsList: DongApartment[] = [];
  const sheetApartments = initialData.sheetApartments;
  if (sheetApartments) {
    dongs.forEach((dong) => {
      const apts = sheetApartments[dong];
      if (Array.isArray(apts)) {
        apts.forEach((apt: DongApartment) => {
          if (apt && apt.name) {
            apartmentsList.push({
              name: apt.name,
              dong: dong,
              householdCount: apt.householdCount,
              yearBuilt: apt.yearBuilt,
              brand: apt.brand,
            });
          }
        });
      }
    });
  }

  const txSummary = initialData.txSummary || {};

  const formatPrice = (val: number) => {
    if (!val || val === 0) return '정보 없음';
    const eok = Math.floor(val / 10000);
    const remainder = Math.round(val % 10000);
    if (eok === 0) return `${remainder.toLocaleString()}만원`;
    if (remainder === 0) return `${eok}억원`;
    return `${eok}억 ${remainder.toLocaleString()}만원`;
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${baseUrl}/zone/${params.id}#webpage`,
        url: `${baseUrl}/zone/${params.id}`,
        name: `동탄 ${zone.name} 아파트 분석 및 임장 리포트`,
        description: zone.description,
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: '홈',
              item: baseUrl,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: '아파트 탐색',
              item: `${baseUrl}/explore`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: `${zone.name} 권역`,
              item: `${baseUrl}/zone/${params.id}`,
            },
          ],
        },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: apartmentsList.length,
          itemListElement: apartmentsList.map((apt, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            url: `${baseUrl}/apartment/${encodeURIComponent(apt.name)}`,
            name: apt.name,
          })),
        },
      },
      {
        '@type': 'RealEstateAgent',
        '@id': `${baseUrl}/#agent`,
        name: 'D-VIEW 부동산 데이터 랩스',
        description: '동탄 전역 아파트 비교 분석 및 AI 매도/전세 안전성 진단 전문 부동산 테크 플랫폼',
        url: baseUrl,
        telephone: '+82-2-000-0000',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'KR',
          addressRegion: '경기도',
          addressLocality: '화성시 동탄역로',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      <ZoneDetailClient />

      {/* Visible Semantic SSR Zone Data Table (No aria-hidden masking) */}
      <section
        id="zone-ssr-data-table"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-8 my-6"
      >
        <div className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          <div className="border-b border-border/60 pb-6">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1 rounded-full mb-3 border border-emerald-500/20">
              <MapPin size={13} className="shrink-0" />
              <span>D-VIEW 권역별 실거래 정량 분석</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
              동탄 {zone.name} 아파트 가치 및 학군 분석 리포트
            </h1>
            <p className="mt-2 text-[14px] sm:text-[15.5px] text-secondary leading-relaxed font-medium">
              {zone.description}
            </p>
            <p className="mt-1 text-[13px] text-tertiary font-semibold">
              행정 구역 및 해당 동: {zone.dongLabel}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <Building2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{zone.name} 권역 소속 아파트 단지 실거래가 및 전세가율 현황</span>
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table className="w-full text-left text-[13px] text-secondary">
                <caption className="sr-only">
                  {zone.name} 권역 소속 아파트 단지별 법정동, 준공연식, 세대수, 평균 매매가, 평균 전세가 및 전세가율 비교표
                </caption>
                <thead className="bg-body text-primary font-bold border-b border-border/60">
                  <tr>
                    <th scope="col" className="p-3.5 whitespace-nowrap">단지명</th>
                    <th scope="col" className="p-3.5 whitespace-nowrap">행정동</th>
                    <th scope="col" className="p-3.5 whitespace-nowrap">연식</th>
                    <th scope="col" className="p-3.5 whitespace-nowrap">세대수</th>
                    <th scope="col" className="p-3.5 whitespace-nowrap">평균 매매가</th>
                    <th scope="col" className="p-3.5 whitespace-nowrap">평균 전세가</th>
                    <th scope="col" className="p-3.5 whitespace-nowrap">전세가율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {apartmentsList.map((apt) => {
                    const summary = txSummary[apt.name] || {};
                    const salesPrice = summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0;
                    const rentPrice = summary.avg1MRentDeposit || summary.avg3MRentDeposit || summary.latestRentDeposit || 0;
                    const ratio = salesPrice > 0 && rentPrice > 0 ? Math.round((rentPrice / salesPrice) * 100) : 0;

                    return (
                      <tr key={apt.name} className="hover:bg-black/[0.02] dark:hover:bg-surface/5 transition-colors">
                        <th scope="row" className="p-3.5 font-bold text-primary whitespace-nowrap">
                          <Link
                            href={`/apartment/${encodeURIComponent(apt.name)}`}
                            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            {apt.name}
                          </Link>
                        </th>
                        <td className="p-3.5 whitespace-nowrap">{apt.dong}</td>
                        <td className="p-3.5 whitespace-nowrap">{apt.yearBuilt ? `${apt.yearBuilt}년` : '정보 없음'}</td>
                        <td className="p-3.5 whitespace-nowrap">{apt.householdCount ? `${apt.householdCount}세대` : '정보 없음'}</td>
                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatPrice(salesPrice)}</td>
                        <td className="p-3.5 whitespace-nowrap">{formatPrice(rentPrice)}</td>
                        <td className="p-3.5 whitespace-nowrap">{ratio > 0 ? `${ratio}%` : '정보 없음'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {GUIDE_ARTICLES.some((a) => (a.featuredZones || []).includes(zone.id)) && (
            <div
              id="zone-related-guides-ssr"
              className="space-y-3 pt-4 border-t border-border/60"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-primary tracking-tight flex items-center gap-2">
                  <BookOpen size={17} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{zone.name} 권역 1:1 비교 가이드 및 심층 리포트</span>
                </h2>
                <Link
                  href="/guide"
                  prefetch={false}
                  className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>전체 비교 가이드</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...GUIDE_ARTICLES]
                  .filter((a) => (a.featuredZones || []).includes(zone.id))
                  .sort((a, b) =>
                    (b.updatedDate || b.date || '').localeCompare(a.updatedDate || a.date || '')
                  )
                  .map((article) => (
                    <Link
                      key={article.slug}
                      href={`/guide/${article.slug}`}
                      prefetch={false}
                      className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-emerald-300 dark:hover:border-emerald-700 p-4 flex flex-col justify-between gap-2 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                          {article.category}
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                          {article.title}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
                        <span>1:1 실거래 비교 읽기</span>
                        <ArrowRight size={12} />
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Zone Zero-CLS AdSlot */}
          <div
            data-testid="zone-ssr-adslot"
            className="w-full min-h-[250px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-4 flex flex-col justify-center overflow-hidden"
          >
            <AdSlot
              slotId="1000000002"
              refreshSlotId={`1000000002_zone_${zone.id}`}
              format="rectangle"
              minHeightClass="min-h-[250px]"
              cpaCampaignId="mortgage-refinance"
              apartmentName={zone.name}
            />
          </div>
        </div>
      </section>
    </>
  );
}
