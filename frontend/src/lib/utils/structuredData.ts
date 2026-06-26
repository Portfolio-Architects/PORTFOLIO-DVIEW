/**
 * @file structuredData.ts
 * @description Standardized, type-safe JSON-LD structured data generators for SEO & AI Crawlers.
 * Implements robust XSS injection defense by sanitizing JSON serialization.
 */

// XSS Defense: escape special HTML characters in JSON-LD script blocks
export function safeJsonLd(data: Record<string, any>): { __html: string } {
  const jsonString = JSON.stringify(data);
  // Prevent injection of script closing tags or other HTML breakages
  const sanitized = jsonString
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return { __html: sanitized };
}

// 1. Main Page Schema (WebSite & Organization)
export function getMainPageSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": baseUrl,
        "name": "D-VIEW | 동탄 아파트 가치분석",
        "description": "동탄 179개 아파트의 실거래가·인프라·학군·현장 사진 가치 분석 플랫폼",
        "publisher": {
          "@id": `${baseUrl}/#organization`
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${baseUrl}/?tab=imjang&search={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        },
        "inLanguage": "ko-KR"
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        "name": "D-VIEW 부동산 데이터 랩스",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/d-view-icon.png`,
          "width": 192,
          "height": 192
        },
        "description": "동탄 전역 아파트 실거래가 추이, 전세가율 및 깡통전세 리스크, 안심 보육 학군 지도 시각화 전문 기관"
      }
    ]
  };
}

// 2. Apartment Detail Page Schema (ApartmentComplex, Place, Accommodation)
export interface ApartmentSchemaParams {
  name: string;
  dong: string;
  address: string;
  description: string;
  imageUrl?: string;
  geo?: { latitude: number; longitude: number };
  pyeongs: Array<{
    pyeong: number;
    areaM2: number;
    latestPriceStr: string;
    maxPriceStr: string;
    jeonseRatio: number;
  }>;
}

export function getApartmentSchema(params: ApartmentSchemaParams, baseUrl: string) {
  const { name, dong, address, description, imageUrl, geo, pyeongs } = params;
  const encodedName = encodeURIComponent(name);

  // Build offer details based on pyeong ranges
  const offers = pyeongs.map((p) => ({
    "@type": "Offer",
    "name": `${name} ${p.pyeong}평형`,
    "description": `전용면적 ${p.areaM2}㎡, 최근 실거래가 ${p.latestPriceStr}, 최고가 ${p.maxPriceStr}, 전세가율 ${p.jeonseRatio}%`,
    "priceCurrency": "KRW",
    "url": `${baseUrl}/apartment/${encodedName}`
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ApartmentComplex",
        "@id": `${baseUrl}/apartment/${encodedName}#complex`,
        "name": name,
        "description": description,
        "url": `${baseUrl}/apartment/${encodedName}`,
        "image": imageUrl || `${baseUrl}/d-view-icon.png`,
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "KR",
          "addressRegion": "경기도",
          "addressLocality": "화성시 동탄동",
          "streetAddress": `${dong} ${address}`
        },
        ...(geo ? {
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": geo.latitude,
            "longitude": geo.longitude
          }
        } : {}),
        "offers": offers.length > 0 ? offers : undefined
      },
      {
        "@type": "Place",
        "@id": `${baseUrl}/apartment/${encodedName}#place`,
        "name": name,
        "address": address,
        ...(geo ? {
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": geo.latitude,
            "longitude": geo.longitude
          }
        } : {}),
        "containedInPlace": {
          "@type": "ApartmentComplex",
          "@id": `${baseUrl}/apartment/${encodedName}#complex`
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
}

// 3. Lounge Main Page Schema (CollectionPage & Breadcrumb)
export function getLoungeMainSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}/lounge#webpage`,
    "url": `${baseUrl}/lounge`,
    "name": "D-VIEW 주민 라운지 | 동탄 부동산 커뮤니티",
    "description": "동탄 거주민 및 예비 입주자들을 위한 리얼 임장 후기, 교통 호재 토론, 단지 소통 공간",
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
          "name": "주민 라운지",
          "item": `${baseUrl}/lounge`
        }
      ]
    }
  };
}

// 4. Lounge Detail Post Schema (DiscussionForumPosting)
export interface LoungePostParams {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  commentsCount?: number;
}

export function getLoungePostSchema(post: LoungePostParams, baseUrl: string) {
  const { id, title, content, author, createdAt, commentsCount = 0 } = post;
  
  let isoDate = new Date().toISOString();
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        isoDate = d.toISOString();
      }
    } catch {
      // ignore
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": `${baseUrl}/lounge/${id}#post`,
    "url": `${baseUrl}/lounge/${id}`,
    "headline": title,
    "articleBody": content,
    "author": {
      "@type": "Person",
      "name": author
    },
    "datePublished": isoDate,
    "dateModified": isoDate,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/CommentAction",
      "userInteractionCount": commentsCount
    },
    "publisher": {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      "name": "D-VIEW 부동산 데이터 랩스"
    }
  };
}

// 5. News Main Page Schema (CollectionPage)
export function getNewsMainSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}/news#webpage`,
    "url": `${baseUrl}/news`,
    "name": "동탄 교통 및 분양 소식 | D-VIEW 부동산 뉴스",
    "description": "동탄 광역 교통망(GTX, 트램, 인동선), 단지별 신규 분양 소식 및 국토부 실거래 정책 분석 뉴스 피드",
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
          "name": "동탄 소식",
          "item": `${baseUrl}/news`
        }
      ]
    }
  };
}

// 6. Explore Page Schema (CollectionPage)
export function getExploreSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}/explore#webpage`,
    "url": `${baseUrl}/explore`,
    "name": "동탄 단지 탐색 | D-VIEW 아파트 비교 분석",
    "description": "동탄 1, 2신도시 전체 179개 단지의 인프라, 전세가율, 세대수, 연식 일괄 비교 분석 맵",
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
          "name": "단지 탐색",
          "item": `${baseUrl}/explore`
        }
      ]
    }
  };
}
