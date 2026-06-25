import { Metadata } from 'next';
import { ZONES, getZoneById } from '@/lib/zones';
import { safeJsonLd } from '@/lib/utils/structuredData';
import ZoneDetailClient from './ZoneDetailClient';

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
      canonical: `/zone/${params.id}`,
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
              "name": zone.name,
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
      </div>
      <ZoneDetailClient />
    </>
  );
}
