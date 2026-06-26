import { Metadata } from 'next';
import { ZONES, getZoneById, getDongsForZone } from '@/lib/zones';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { getInitialData } from '@/lib/services/dashboardData';
import ZoneDetailClient from './ZoneDetailClient';
import { DongApartment } from '@/lib/dong-apartments';

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

  const title = `동탄 ${zone.name} 실거래가, 학군, 입지 가치 분석 - D-VIEW`;
  const description = `${zone.name}(${zone.dongLabel}) 아파트 단지 상세 분석. ${zone.description} 실시간 임장 후기, 평점 및 투자 분석 리포트를 확인해보세요.`;

  return {
    title,
    description,
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
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    }
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
    dongs.forEach(dong => {
      const apts = sheetApartments[dong];
      if (Array.isArray(apts)) {
        apts.forEach((apt: DongApartment) => {
          if (apt && apt.name) {
            apartmentsList.push({
              name: apt.name,
              dong: dong,
              householdCount: apt.householdCount,
              yearBuilt: apt.yearBuilt,
              brand: apt.brand
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
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${baseUrl}/zone/${params.id}#webpage`,
        "url": `${baseUrl}/zone/${params.id}`,
        "name": `동탄 ${zone.name} 아파트 분석 및 임장 리포트`,
        "description": zone.description,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "홈",
              "item": baseUrl
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "아파트 탐색",
              "item": `${baseUrl}/explore`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": `${zone.name} 권역`,
              "item": `${baseUrl}/zone/${params.id}`
            }
          ]
        }
      },
      {
        "@type": "RealEstateAgent",
        "@id": `${baseUrl}/#agent`,
        "name": "D-VIEW 부동산 데이터 랩스",
        "description": "동탄 전역 아파트 비교 분석 및 AI 매도/전세 안전성 진단 전문 부동산 테크 플랫폼",
        "url": baseUrl,
        "telephone": "+82-2-000-0000",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "KR",
          "addressRegion": "경기도",
          "addressLocality": "화성시 동탄역로"
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <div className="sr-only" aria-hidden="true">
        <h1>동탄 {zone.name} 아파트 가치 및 학군 분석 리포트</h1>
        <p>{zone.description}</p>
        <p>행정 구역 및 해당 동: {zone.dongLabel}</p>

        <h2>{zone.name} 권역 소속 아파트 단지 실거래가 및 전세가율 현황</h2>
        <table>
          <thead>
            <tr>
              <th>단지명</th>
              <th>행정동</th>
              <th>연식</th>
              <th>세대수</th>
              <th>평균 매매가</th>
              <th>평균 전세가</th>
              <th>전세가율</th>
            </tr>
          </thead>
          <tbody>
            {apartmentsList.map((apt) => {
              const summary = txSummary[apt.name] || {};
              const salesPrice = summary.avg1MPrice || summary.avg3MPrice || summary.latestPrice || 0;
              const rentPrice = summary.avg1MRentDeposit || summary.avg3MRentDeposit || summary.latestRentDeposit || 0;
              const ratio = salesPrice > 0 && rentPrice > 0 ? Math.round((rentPrice / salesPrice) * 100) : 0;

              return (
                <tr key={apt.name}>
                  <td>{apt.name}</td>
                  <td>{apt.dong}</td>
                  <td>{apt.yearBuilt ? `${apt.yearBuilt}년` : '정보 없음'}</td>
                  <td>{apt.householdCount ? `${apt.householdCount}세대` : '정보 없음'}</td>
                  <td>{formatPrice(salesPrice)}</td>
                  <td>{formatPrice(rentPrice)}</td>
                  <td>{ratio > 0 ? `${ratio}%` : '정보 없음'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ZoneDetailClient />
    </>
  );
}
