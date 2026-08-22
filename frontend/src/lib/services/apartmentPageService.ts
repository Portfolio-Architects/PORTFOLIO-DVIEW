/**
 * @module apartmentPageService
 * @description Dedicated domain service for apartment detail pages:
 * data retrieval, price calculations, structured data (JSON-LD) generation, and SEO metadata orchestration.
 * Architecture Layer: Domain Service (`src/lib/services/`)
 */

import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';
import { redis } from '@/lib/redis';
import type { AptTxSummary } from '@/lib/types/transaction';
import type { FieldReportData, CommentData } from '@/lib/types/report.types';
import { logger } from '@/lib/services/logger';
import { getComments } from '@/lib/repositories/comment.repository';
import {
  decodeAptName,
  formatPriceEok,
  getPyeongSummaries,
  calculatePriceAnalytics,
  generateAiBriefing,
  type PyeongSummary,
  type TransactionRecord,
  type PriceAnalytics,
} from '@/lib/utils/analyticsUtils';

export {
  decodeAptName,
  formatPriceEok,
  getPyeongSummaries,
  calculatePriceAnalytics,
  generateAiBriefing,
  type PyeongSummary,
  type TransactionRecord,
  type PriceAnalytics,
};

export interface LocationScore {
  distanceToElementary?: number;
  distanceToMiddle?: number;
  distanceToHigh?: number;
  nearestSchoolNames?: {
    elementary?: string;
    middle?: string;
    high?: string;
  };
  nearestStationCoords?: string;
  nearestStationName?: string;
  nearestStationLine?: string;
  distanceToSubway?: number;
}

export interface ApartmentPageData {
  aptName: string;
  aptSummary?: AptTxSummary;
  txs: TransactionRecord[];
  pyeongSummaries: PyeongSummary[];
  locationScore: LocationScore | null;
  matchedReportData: FieldReportData | null;
  comments: CommentData[];
  structuredImages: string[];
  analytics: PriceAnalytics;
  aiBriefing: string;
}

/**
 * 실거래가 전체 요약 데이터 (tx-summary.json) 조회
 */
export async function getTxSummaryData(): Promise<Record<string, AptTxSummary>> {
  const parsed = await readJsonFileCached<Record<string, unknown>>('public/data/tx-summary.json', {});
  if (!parsed) return {};
  if ('summary' in parsed && parsed.summary && typeof parsed.summary === 'object') {
    return parsed.summary as Record<string, AptTxSummary>;
  }
  return parsed as Record<string, AptTxSummary>;
}

/**
 * 단지별 실거래 내역 (tx-data/{aptName}.json) 조회
 */
export async function getApartmentTransactions(aptName: string): Promise<TransactionRecord[]> {
  return readJsonFileCached<TransactionRecord[]>(`public/tx-data/${aptName}.json`, []);
}

/**
 * 단지별 입지 점수 및 인근 인프라 정보 조회
 */
export async function getLocationScore(aptName: string): Promise<LocationScore | null> {
  try {
    const allScores = await readJsonFileCached<Record<string, LocationScore>>('public/data/location-scores.json', {});
    return allScores[aptName] || null;
  } catch (err) {
    logger.warn('ApartmentPageService', `Failed to read location-scores for ${aptName}`, {}, err as Error);
    return null;
  }
}

/**
 * 단지별 임장/스카우팅 리포트 데이터 캐시 조회 (Redis -> Firestore)
 */
export async function fetchScoutingReportCached(aptName: string): Promise<FieldReportData | null> {
  const cacheKey = `DTDLS:cache:reportByApt:${encodeURIComponent(aptName)}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        if (cached === 'null') return null;
        return cached as FieldReportData;
      }
    } catch (e) {
      logger.warn('ApartmentPageService.fetchScoutingReportCached', 'Redis scouting report read error', { aptName }, e as Error);
    }
  }

  if (adminDb) {
    try {
      const snap = await adminDb.collection('scoutingReports').where('apartmentName', '==', aptName).limit(1).get();
      if (!snap.empty) {
        const data = snap.docs[0].data() as FieldReportData;
        if (redis) {
          await redis.set(cacheKey, data, { ex: 3600 }).catch((err) =>
            logger.warn('ApartmentPageService.fetchScoutingReportCached', 'Redis write error', { aptName }, err as Error)
          );
        }
        return data;
      } else {
        if (redis) {
          await redis.set(cacheKey, 'null', { ex: 300 }).catch(() => {});
        }
      }
    } catch (e) {
      logger.warn('ApartmentPageService.fetchScoutingReportCached', 'Firestore read error', { aptName }, e as Error);
    }
  }
  return null;
}

/**
 * 리포트 ID에 연결된 댓글 목록 조회
 */
export async function getApartmentComments(reportId?: string): Promise<CommentData[]> {
  if (!reportId) return [];
  try {
    return await getComments(reportId);
  } catch (e) {
    logger.warn('ApartmentPageService', 'Failed to fetch comments for SEO', { reportId }, e as Error);
    return [];
  }
}

/**
 * 아파트 상세 페이지에 필요한 전체 도메인 데이터를 합성하여 반환
 */
export async function getApartmentPageData(rawAptName: string): Promise<ApartmentPageData> {
  const aptName = decodeAptName(rawAptName);

  const [txSummary, txs, locationScore, matchedReportData] = await Promise.all([
    getTxSummaryData(),
    getApartmentTransactions(aptName),
    getLocationScore(aptName),
    fetchScoutingReportCached(aptName),
  ]);

  const aptSummary = txSummary[aptName];
  const pyeongSummaries = getPyeongSummaries(txs);
  const analytics = calculatePriceAnalytics(pyeongSummaries, aptSummary);
  const aiBriefing = generateAiBriefing(aptName, aptSummary, pyeongSummaries, locationScore);

  let structuredImages: string[] = [];
  if (matchedReportData?.images && Array.isArray(matchedReportData.images)) {
    structuredImages = matchedReportData.images
      .map((img: { url?: string }) => img.url)
      .filter((url): url is string => Boolean(url));
  }

  const comments = await getApartmentComments(matchedReportData?.id);

  return {
    aptName,
    aptSummary,
    txs,
    pyeongSummaries,
    locationScore,
    matchedReportData,
    comments,
    structuredImages,
    analytics,
    aiBriefing,
  };
}

/**
 * Search Engine Optimization: Schema.org JSON-LD 객체 생성
 */
export function buildApartmentJsonLd(
  data: ApartmentPageData,
  baseUrl: string
): Record<string, unknown> {
  const {
    aptName,
    aptSummary,
    pyeongSummaries,
    locationScore,
    matchedReportData,
    structuredImages,
    analytics,
    aiBriefing,
  } = data;

  const rawReport = matchedReportData as Record<string, unknown> | null;
  const rawMetrics = rawReport?.metrics as Record<string, unknown> | undefined;

  const lat =
    rawReport?.lat ||
    rawReport?.latitude ||
    rawMetrics?.lat ||
    locationScore?.nearestStationCoords?.split(',')[0]?.trim() ||
    37.2005;

  const lng =
    rawReport?.lng ||
    rawReport?.longitude ||
    rawMetrics?.lng ||
    locationScore?.nearestStationCoords?.split(',')[1]?.trim() ||
    127.0985;

  const geo = lat && lng ? {
    '@type': 'GeoCoordinates',
    latitude: Number(lat),
    longitude: Number(lng),
  } : undefined;

  const schools: Record<string, unknown>[] = [];
  if (locationScore?.nearestSchoolNames?.elementary) {
    schools.push({
      '@type': 'School',
      name: locationScore.nearestSchoolNames.elementary,
      description: '배정 초등학교',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressRegion: '경기도',
        addressLocality: '화성시',
      },
    });
  }
  if (locationScore?.nearestSchoolNames?.middle) {
    schools.push({
      '@type': 'School',
      name: locationScore.nearestSchoolNames.middle,
      description: '인근 중학교',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressRegion: '경기도',
        addressLocality: '화성시',
      },
    });
  }
  if (locationScore?.nearestSchoolNames?.high) {
    schools.push({
      '@type': 'School',
      name: locationScore.nearestSchoolNames.high,
      description: '인근 고등학교',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressRegion: '경기도',
        addressLocality: '화성시',
      },
    });
  }

  const containedPlaces: Record<string, unknown>[] = [...schools];
  if (locationScore?.nearestStationName && locationScore?.nearestStationCoords) {
    const coords = locationScore.nearestStationCoords.split(',');
    if (coords.length === 2) {
      const latVal = Number(coords[0].trim());
      const lngVal = Number(coords[1].trim());
      containedPlaces.push({
        '@type': 'TransitStation',
        name: locationScore.nearestStationName,
        description: `${locationScore.nearestStationLine || '지하철'}역 (단지에서 약 ${locationScore.distanceToSubway || 0}m)`,
        geo: {
          '@type': 'GeoCoordinates',
          latitude: latVal,
          longitude: lngVal,
        },
      });
    }
  }

  const address = {
    '@type': 'PostalAddress',
    addressCountry: 'KR',
    addressRegion: '경기도',
    addressLocality: '화성시',
    streetAddress: `${aptSummary?.dong || matchedReportData?.dong || ''} ${aptName}`,
  };

  const rawScale = matchedReportData?.sections?.specs?.scale;
  const rawBuiltYear = matchedReportData?.sections?.specs?.builtYear;
  const totalHouseholds = rawScale ? parseInt(rawScale.replace(/[^0-9]/g, ''), 10) : undefined;
  const yearBuiltVal = rawBuiltYear ? parseInt(rawBuiltYear.replace(/[^0-9]/g, ''), 10) : undefined;

  const floorPlans = pyeongSummaries.map((p) => ({
    '@type': 'FloorPlan',
    name: `${p.pyeong}평형 (${p.areaM2}㎡)`,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: p.areaM2,
      unitCode: 'MTK',
    },
    numberOfRooms: 3,
    offers: p.latestPrice > 0 ? {
      '@type': 'Offer',
      priceCurrency: 'KRW',
      price: p.latestPrice * 10000,
      description: `최근 실거래 매매가: ${p.latestPriceStr}, 전세가: ${p.latestDepositStr}`,
    } : undefined,
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/apartment/${encodeURIComponent(aptName)}#webpage`,
        url: `${baseUrl}/apartment/${encodeURIComponent(aptName)}`,
        name: `${aptName} 실거래가 및 가치 분석 리포트`,
        description: aiBriefing,
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
              name: aptName,
              item: `${baseUrl}/apartment/${encodeURIComponent(aptName)}`,
            },
          ],
        },
      },
      {
        '@type': 'ApartmentComplex',
        '@id': `${baseUrl}/apartment/${encodeURIComponent(aptName)}#complex`,
        name: `${aptName}`,
        description: `동탄 ${aptName} 아파트 실거래가 및 임장 리포트`,
        url: `${baseUrl}/apartment/${encodeURIComponent(aptName)}`,
        ...(structuredImages.length > 0 ? { image: structuredImages } : {}),
        ...(analytics.offers ? { offers: analytics.offers } : {}),
        priceRange: analytics.minSalePrice > 0
          ? `₩${(analytics.minSalePrice * 10000).toLocaleString()} - ₩${(analytics.maxSalePrice * 10000).toLocaleString()}`
          : undefined,
        address,
        ...(geo ? { geo } : {}),
        ...(containedPlaces.length > 0 ? { containedInPlace: containedPlaces } : {}),
        ...(floorPlans.length > 0 ? { accommodationFloorPlan: floorPlans } : {}),
        ...(totalHouseholds ? { numberOfAccommodation: totalHouseholds } : {}),
        ...(yearBuiltVal ? { yearBuilt: yearBuiltVal } : {}),
      },
      {
        '@type': 'SingleFamilyResidence',
        '@id': `${baseUrl}/apartment/${encodeURIComponent(aptName)}#residence`,
        name: `${aptName} 주거 단지`,
        description: `동탄 ${aptName} 아파트 단지 내 주거용 부동산`,
        address,
        ...(geo ? { geo } : {}),
        containedInPlace: {
          '@type': 'ApartmentComplex',
          '@id': `${baseUrl}/apartment/${encodeURIComponent(aptName)}#complex`,
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
}

/**
 * 기본 Fallback SEO 메타데이터 생성
 */
export function getDefaultApartmentMetadata(baseUrl: string, aptName: string = '아파트'): Metadata {
  const title = `동탄 ${aptName} 실거래가, 매매가, 전세가율 및 학군 분석 - D-VIEW`;
  const description = `동탄 ${aptName} 실거래가, 매매가, 전세가율, 학군, 교통 호재, 적정 가치 분석. D-VIEW에서 실제 데이터 기반의 프리미엄 분석을 확인하세요.`;
  return {
    title,
    description,
    alternates: {
      canonical: `https://dongtanview.com/apartment/${encodeURIComponent(aptName)}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/apartment/${encodeURIComponent(aptName)}`,
      siteName: 'D-VIEW',
      locale: 'ko_KR',
      type: 'website',
    },
  };
}

/**
 * 동적 페이지 SEO Metadata 생성
 */
export async function buildApartmentSeoMetadata(
  rawAptName?: string,
  searchParams?: Record<string, string | string[] | undefined>,
  siteUrl?: string
): Promise<Metadata> {
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  if (!rawAptName) {
    return getDefaultApartmentMetadata(baseUrl);
  }

  const decodedName = decodeAptName(rawAptName);

  try {
    let imageUrl = '';
    try {
      const reportData = await fetchScoutingReportCached(decodedName);
      if (reportData) {
        if (reportData.images && reportData.images.length > 0) {
          imageUrl = reportData.images[0].url;
        } else if (reportData.thumbnailUrl) {
          imageUrl = reportData.thumbnailUrl;
        } else if (reportData.thumbnail) {
          imageUrl = reportData.thumbnail;
        }
      }
    } catch (e) {
      logger.warn('ApartmentPageService.buildApartmentSeoMetadata', '[SEO] Failed to fetch report image for metadata', {}, e as Error);
    }

    const [txSummary, txs, locationScore] = await Promise.all([
      getTxSummaryData(),
      getApartmentTransactions(decodedName),
      getLocationScore(decodedName),
    ]);

    const aptSummary = txSummary[decodedName];
    const pyeongSummaries = getPyeongSummaries(txs);
    const analytics = calculatePriceAnalytics(pyeongSummaries, aptSummary);

    const ogUrl = new URL(`${baseUrl}/api/og`);
    ogUrl.searchParams.set('title', decodedName);

    const shareType = searchParams?.shareType;
    const grade = searchParams?.grade;
    const score = searchParams?.score;

    if (shareType && typeof shareType === 'string') ogUrl.searchParams.set('shareType', shareType);
    if (grade && typeof grade === 'string') ogUrl.searchParams.set('grade', grade);
    if (score && typeof score === 'string') ogUrl.searchParams.set('score', score);

    let subtitleText = '동탄 실거래가 및 가치 분석';
    if (aptSummary?.dong) {
      subtitleText = `동탄구 ${aptSummary.dong} · 실거래 가치 분석 리포트`;
    }
    ogUrl.searchParams.set('subtitle', subtitleText);

    if (imageUrl) {
      let absoluteImageUrl = imageUrl;
      if (imageUrl.startsWith('/')) {
        absoluteImageUrl = `${baseUrl}${imageUrl}`;
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        absoluteImageUrl = `${baseUrl}/${imageUrl}`;
      }
      ogUrl.searchParams.set('bgUrl', absoluteImageUrl);
    }

    if (aptSummary?.latestPrice) {
      ogUrl.searchParams.set('price', formatPriceEok(aptSummary.latestPrice));
    }

    if (analytics.ratioPercent > 0) {
      ogUrl.searchParams.set('ratio', analytics.ratioPercent.toString());
    }

    ogUrl.searchParams.set('status', analytics.statusStr);

    let seoTitle = '';
    if (pyeongSummaries.length > 0) {
      const pyeongListStr = pyeongSummaries.map((p) => `${p.pyeong}평`).join('/');
      seoTitle = `${decodedName} ${pyeongListStr} 실거래가, 매매가, 전세가율 및 학군 분석 - D-VIEW`;
    } else {
      const pyeongStr = aptSummary?.latestArea ? `${Math.round(aptSummary.latestArea)}평` : '';
      const titlePyeong = pyeongStr ? ` ${pyeongStr}` : '';
      seoTitle = `${decodedName}${titlePyeong} 실거래가, 매매가, 전세가율 및 학군 분석 - D-VIEW`;
    }

    const seoDescription = generateAiBriefing(decodedName, aptSummary, pyeongSummaries, locationScore);
    const pyeongKeywordsList = pyeongSummaries.map((p) => `${decodedName} ${p.pyeong}평, ${decodedName} ${p.pyeong}평 실거래가, ${decodedName} ${p.pyeong}평 전세가율`).join(', ');
    const dynamicKeywords = `동탄, ${decodedName}, 실거래가, 매매가, 전세가율, 학군, 교통, 인프라, 아파트 분석, 임장, 호갱노노, 아실, 부동산${pyeongKeywordsList ? `, ${pyeongKeywordsList}` : ''}`;

    return {
      title: seoTitle,
      description: seoDescription,
      keywords: dynamicKeywords,
      alternates: {
        canonical: `https://dongtanview.com/apartment/${encodeURIComponent(decodedName)}`,
      },
      openGraph: {
        title: seoTitle,
        description: seoDescription,
        url: `${baseUrl}/apartment/${encodeURIComponent(decodedName)}`,
        siteName: 'D-VIEW',
        locale: 'ko_KR',
        type: 'website',
        images: [
          {
            url: ogUrl.toString(),
            width: 1200,
            height: 630,
            alt: `${decodedName} 가치 분석 썸네일`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description: seoDescription,
        images: [ogUrl.toString()],
      },
    };
  } catch (err) {
    if (err && typeof err === 'object' && ('digest' in err || (err as Error).message?.includes('Dynamic server usage'))) {
      throw err;
    }
    logger.warn('ApartmentPageService.buildApartmentSeoMetadata', '[SEO] Failed to generate metadata, returning default', {}, err as Error);
    return getDefaultApartmentMetadata(baseUrl, decodedName);
  }
}
