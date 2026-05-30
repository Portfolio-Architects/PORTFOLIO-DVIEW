import { Metadata } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import DashboardClient from '@/components/DashboardClient';
import { fetchSheetTypeMap } from '@/lib/services/googleSheets';
import { redis } from '@/lib/redis';
import txSummaryDataRaw from '../../../../public/data/tx-summary.json';
import fs from 'fs';
import path from 'path';

const TX_SUMMARY = (txSummaryDataRaw as any).summary;

interface Transaction {
  contractYm: string;
  contractDay: string;
  price: number;
  priceEok: string;
  deposit: number;
  monthlyRent: number;
  area: number;
  areaPyeong: number;
  floor: number;
  dealType: string;
}

interface PyeongSummary {
  pyeong: number;
  areaM2: number;
  salesCount: number;
  rentCount: number;
  latestPrice: number;
  latestPriceStr: string;
  maxPrice: number;
  maxPriceStr: string;
  avgPrice: number;
  avgPriceStr: string;
  latestDeposit: number;
  latestDepositStr: string;
  avgDeposit: number;
  avgDepositStr: string;
  jeonseRatio: number;
}

function formatPriceEok(priceMan: number): string {
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${priceMan.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억 ${remainder.toLocaleString()}`;
}

function getApartmentTransactions(aptName: string): Transaction[] {
  try {
    const filePath = path.join(process.cwd(), 'public', 'tx-data', `${aptName}.json`);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.warn(`[SEO] Failed to read transaction file for ${aptName}:`, error);
  }
  return [];
}

function getPyeongSummaries(txs: Transaction[]): PyeongSummary[] {
  const groups: Record<number, Transaction[]> = {};
  
  txs.forEach(t => {
    const pyeong = Math.round(t.areaPyeong);
    if (!pyeong) return;
    if (!groups[pyeong]) groups[pyeong] = [];
    groups[pyeong].push(t);
  });
  
  const summaries: PyeongSummary[] = [];
  
  Object.entries(groups).forEach(([pyeongKey, groupTxs]) => {
    const pyeong = parseInt(pyeongKey);
    const sortedTxs = [...groupTxs].sort((a, b) => {
      const dateA = a.contractYm + String(a.contractDay).padStart(2, '0');
      const dateB = b.contractYm + String(b.contractDay).padStart(2, '0');
      return dateB.localeCompare(dateA);
    });
    
    const avgArea = sortedTxs.reduce((sum, t) => sum + t.area, 0) / sortedTxs.length;
    const sales = sortedTxs.filter(t => t.dealType !== '전세' && t.dealType !== '월세');
    const jeonse = sortedTxs.filter(t => t.dealType === '전세' && t.deposit > 0);
    
    if (sales.length === 0 && jeonse.length === 0) return;
    
    const latestSale = sales[0];
    const latestPrice = latestSale ? latestSale.price : 0;
    const latestPriceStr = latestSale ? latestSale.priceEok : '정보 없음';
    
    const salePrices = sales.map(s => s.price).filter(p => p > 0);
    const maxPrice = salePrices.length > 0 ? Math.max(...salePrices) : 0;
    const maxPriceStr = maxPrice > 0 ? formatPriceEok(maxPrice) : '정보 없음';
    
    const avgPrice = salePrices.length > 0 ? Math.round(salePrices.reduce((sum, p) => sum + p, 0) / salePrices.length) : 0;
    const avgPriceStr = avgPrice > 0 ? formatPriceEok(avgPrice) : '정보 없음';
    
    const latestJeonse = jeonse[0];
    const latestDeposit = latestJeonse ? latestJeonse.deposit : 0;
    const latestDepositStr = latestJeonse ? latestJeonse.priceEok : '정보 없음';
    
    const jeonseDeposits = jeonse.map(j => j.deposit).filter(d => d > 0);
    const avgDeposit = jeonseDeposits.length > 0 ? Math.round(jeonseDeposits.reduce((sum, d) => sum + d, 0) / jeonseDeposits.length) : 0;
    const avgDepositStr = avgDeposit > 0 ? formatPriceEok(avgDeposit) : '정보 없음';
    
    let jeonseRatio = 0;
    if (avgDeposit > 0 && avgPrice > 0) {
      jeonseRatio = Math.round((avgDeposit / avgPrice) * 100);
    } else if (latestDeposit > 0 && latestPrice > 0) {
      jeonseRatio = Math.round((latestDeposit / latestPrice) * 100);
    }
    
    summaries.push({
      pyeong,
      areaM2: Math.round(avgArea * 100) / 100,
      salesCount: sales.length,
      rentCount: jeonse.length,
      latestPrice,
      latestPriceStr,
      maxPrice,
      maxPriceStr,
      avgPrice,
      avgPriceStr,
      latestDeposit,
      latestDepositStr,
      avgDeposit,
      avgDepositStr,
      jeonseRatio
    });
  });
  
  return summaries.sort((a, b) => a.pyeong - b.pyeong);
}

function generateAiBriefing(aptName: string, aptSummary: any, pyeongSummaries: PyeongSummary[]) {
  const defaultBrief = `동탄 ${aptName} 실거래가, 매매가, 전세가율, 학군, 교통 호재, 적정 가치 분석. D-VIEW에서 실제 데이터 기반의 프리미엄 분석을 확인하세요.`;
  
  if (pyeongSummaries.length === 0) {
    if (!aptSummary) return defaultBrief;
    const avg1MPrice = aptSummary.avg1MPriceEok ? `${aptSummary.avg1MPriceEok}억` : '정보 없음';
    return `${aptName}의 최근 1개월 평균 매매가는 ${avg1MPrice}원이며, D-VIEW에서 학군, 교통 인프라 및 프리미엄 적정 가치 분석 리포트를 확인해보세요.`;
  }

  const pyeongListStr = pyeongSummaries.map(p => `${p.pyeong}평`).join(', ');
  
  const majorDetails = pyeongSummaries.slice(0, 2).map(p => {
    const saleStr = p.latestPriceStr !== '정보 없음' ? `최근 매매가 ${p.latestPriceStr}` : '';
    const jeonseStr = p.latestDepositStr !== '정보 없음' ? `전세가 ${p.latestDepositStr}` : '';
    const ratioStr = p.jeonseRatio > 0 ? `전세가율 ${p.jeonseRatio}%` : '';
    const parts = [saleStr, jeonseStr, ratioStr].filter(Boolean);
    return `${p.pyeong}평형(${parts.join(', ')})`;
  }).join(' 및 ');

  return `동탄 ${aptName} 아파트는 ${pyeongListStr} 다양한 평형대를 형성하고 있습니다. ${majorDetails} 등 평형별 정확한 실거래가 시세와 전세가율 변동 추이, 학군 정보, 대중교통 인프라 요약을 D-VIEW에서 제공합니다.`;
}

// --- SEO: Dynamic Metadata Generator ---
// Await the params Promise for Next.js 15+
export async function generateMetadata(props: { params: Promise<{ aptName: string }> }): Promise<Metadata> {
  const params = await props.params;
  const decodedName = decodeURIComponent(params.aptName);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  
  let imageUrl = '';
  if (adminDb) {
    try {
      const snap = await adminDb.collection('scoutingReports').where('apartmentName', '==', decodedName).limit(1).get();
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.images && data.images.length > 0) {
          imageUrl = data.images[0].url;
        } else if (data.thumbnailUrl) {
          imageUrl = data.thumbnailUrl;
        }
      }
    } catch (e) {
      console.warn('[SEO] Failed to fetch report image for metadata:', e);
    }
  }
  
  const aptSummary = TX_SUMMARY[decodedName];
  const txs = getApartmentTransactions(decodedName);
  const pyeongSummaries = getPyeongSummaries(txs);
  
  // Dynamic OG Image URL
  const ogUrl = new URL(`${baseUrl}/api/og`);
  ogUrl.searchParams.set('title', decodedName);
  
  let subtitleText = '동탄 실거래가 및 가치 분석';
  if (aptSummary?.dong) {
    subtitleText = `동탄구 ${aptSummary.dong} · 실거래 가치 분석 리포트`;
  }
  ogUrl.searchParams.set('subtitle', subtitleText);
  
  if (imageUrl) {
    ogUrl.searchParams.set('bgUrl', imageUrl);
  }
  
  if (aptSummary?.latestPrice) {
    ogUrl.searchParams.set('price', formatPriceEok(aptSummary.latestPrice));
  }
  
  const salesVal = aptSummary ? (aptSummary.avg3MPrice || aptSummary.avg1MPrice || aptSummary.latestPrice || 0) : 0;
  const jeonseVal = aptSummary ? (aptSummary.avg3MRentDeposit || aptSummary.avg1MRentDeposit || aptSummary.latestRentDeposit || 0) : 0;
  const ratioPercent = salesVal > 0 && jeonseVal > 0 ? Math.round((jeonseVal / salesVal) * 100) : 0;
  if (ratioPercent > 0) {
    ogUrl.searchParams.set('ratio', ratioPercent.toString());
  }
  
  const maxPriceVal = aptSummary?.maxPrice || 0;
  const latestPriceVal = aptSummary?.latestPrice || 0;
  const isHigh = latestPriceVal > 0 && maxPriceVal > 0 && latestPriceVal >= maxPriceVal - 500;
  const statusStr = isHigh ? '신고가' : (ratioPercent >= 75 ? '갭투자추천' : '인기단지');
  ogUrl.searchParams.set('status', statusStr);
  
  let seoTitle = '';
  if (pyeongSummaries.length > 0) {
    const pyeongListStr = pyeongSummaries.map(p => `${p.pyeong}평`).join('/');
    seoTitle = `${decodedName} ${pyeongListStr} 실거래가, 매매가, 전세가율 및 학군 분석 - D-VIEW`;
  } else {
    const pyeongStr = aptSummary?.latestArea ? `${Math.round(aptSummary.latestArea)}평` : '';
    const titlePyeong = pyeongStr ? ` ${pyeongStr}` : '';
    seoTitle = `${decodedName}${titlePyeong} 실거래가, 매매가, 전세가율 및 학군 분석 - D-VIEW`;
  }
  
  const seoDescription = generateAiBriefing(decodedName, aptSummary, pyeongSummaries);
  const pyeongKeywordsList = pyeongSummaries.map(p => `${decodedName} ${p.pyeong}평, ${decodedName} ${p.pyeong}평 실거래가, ${decodedName} ${p.pyeong}평 전세가율`).join(', ');
  const dynamicKeywords = `동탄, ${decodedName}, 실거래가, 매매가, 전세가율, 학군, 교통, 인프라, 아파트 분석, 임장, 호갱노노, 아실, 부동산${pyeongKeywordsList ? `, ${pyeongKeywordsList}` : ''}`;

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: dynamicKeywords,
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
    }
  };
}

import { createInitialKPIs } from '@/lib/services/kpi.service';

export const revalidate = 3600;

export async function generateStaticParams() {
  const aptNames = Object.keys(TX_SUMMARY || {});
  // Pre-render the first 50 apartments to prevent long build times
  return aptNames.slice(0, 50).map((name) => ({
    aptName: encodeURIComponent(name),
  }));
}

async function getInitialData() {
  const result: {
    favoriteCounts: Record<string, number>;
    typeMap: { aptName: string; area: string; typeM2: string; typePyeong: string }[];
    apartmentMeta: Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
    fieldReports?: any[];
    kpis?: any[];
  } = {
    favoriteCounts: {},
    typeMap: [],
    apartmentMeta: {},
    fieldReports: [],
    kpis: createInitialKPIs(),
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), ms))
    ]);

  const fetchFavCounts = async () => {
    if (redis) {
      try {
        const cachedCounts = await redis.hgetall('DTDLS:cache:favoriteCounts');
        if (cachedCounts && Object.keys(cachedCounts).length > 0) {
          result.favoriteCounts = cachedCounts as Record<string, number>;
          return;
        }
      } catch (e) {
        console.warn('[Server] Redis favCounts read error:', e);
      }
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), 3000);
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.count > 0) result.favoriteCounts[data.aptName || doc.id] = data.count;
      });
      if (redis && Object.keys(result.favoriteCounts).length > 0) {
        redis.hmset('DTDLS:cache:favoriteCounts', result.favoriteCounts).catch(err => console.warn('Redis HMSET error:', err));
      }
    }
  };

  const fetchMeta = async () => {
    if (redis) {
      try {
        const cachedMeta = await redis.get('DTDLS:cache:apartmentMeta');
        if (cachedMeta && typeof cachedMeta === 'object') {
          result.apartmentMeta = cachedMeta as Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
          return;
        }
      } catch (e) {
        console.warn('[Server] Redis meta read error:', e);
      }
    }
    if (adminDb) {
      const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), 3000);
      if (metaDoc.exists) {
        const metaData = (metaDoc.data() || {}) as Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
        result.apartmentMeta = metaData;
        if (redis && Object.keys(metaData).length > 0) {
          redis.set('DTDLS:cache:apartmentMeta', metaData, { ex: 86400 }).catch(e => console.warn('[Server] Redis meta write error:', e));
        }
      }
    }
  };

  const fetchReports = async () => {
    if (redis) {
      try {
        const cachedReports = await redis.get('DTDLS:cache:fieldReports');
        if (cachedReports && Array.isArray(cachedReports)) {
          result.fieldReports = cachedReports;
          return;
        }
      } catch (e) {
        console.warn('[Server] Redis reports read error:', e);
      }
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('scoutingReports').orderBy('createdAt', 'desc').limit(30).get(), 5000);
      const reports = snap.docs.map(doc => {
        const data = doc.data();
        let createdAtStr = '방금 전';
        let rawTimestamp = 0;
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            const d = data.createdAt.toDate();
            createdAtStr = d.toLocaleDateString('ko-KR');
            rawTimestamp = d.getTime();
          } else if (data.createdAt.seconds) {
            const d = new Date(data.createdAt.seconds * 1000);
            createdAtStr = d.toLocaleDateString('ko-KR');
            rawTimestamp = d.getTime();
          }
        }
        return {
          id: doc.id,
          dong: data.dong || '오산동 (동탄역)',
          apartmentName: data.apartmentName,
          premiumScores: data.premiumScores,
          premiumContent: data.premiumContent,
          pros: data.premiumContent || '포장 싹 뺀 진짜 동네 아파트 리뷰',
          cons: '',
          rating: 5,
          author: '데이터 랩스',
          likes: data.likes || 0,
          viewCount: data.viewCount || 0,
          commentCount: data.commentCount || 0,
          imageUrl: data.thumbnailUrl || data.imageUrl,
          thumbnail: data.thumbnail,
          images: data.images || [],
          metrics: data.metrics,
          scoutingDate: data.scoutingDate || '',
          createdAt: createdAtStr,
          _rawTimestamp: rawTimestamp
        };
      });
      result.fieldReports = reports;
      if (redis && reports.length > 0) {
        redis.set('DTDLS:cache:fieldReports', reports, { ex: 3600 }).catch(e => console.warn('[Server] Redis reports write error:', e));
      }
    }
  };

  const fetchTypeMap = async () => {
    const data = await fetchSheetTypeMap();
    result.typeMap = data;
  };

  await Promise.allSettled([
    fetchFavCounts().catch(e => console.warn('[Server] favCounts error:', e)),
    fetchMeta().catch(e => console.warn('[Server] meta error:', e)),
    fetchReports().catch(e => console.warn('[Server] reports error:', e)),
    fetchTypeMap().catch(e => console.warn('[Server] typeMap error:', e))
  ]);

  return result;
}

export default async function ApartmentPage(props: { params: Promise<{ aptName: string }> }) {
  const params = await props.params;
  const decodedName = decodeURIComponent(params.aptName);
  const initialData = await getInitialData();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  // Fetch report for structured data (JSON-LD)
  let structuredImages: string[] = [];
  if (adminDb) {
    try {
      const snap = await adminDb.collection('scoutingReports').where('apartmentName', '==', decodedName).limit(1).get();
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.images && Array.isArray(data.images)) {
          structuredImages = data.images.map((img: any) => img.url).filter(Boolean);
        }
      }
    } catch (e) {}
  }

  // --- SSR SEO HTML Block ---
  const aptSummary = TX_SUMMARY[decodedName];
  const txs = getApartmentTransactions(decodedName);
  const pyeongSummaries = getPyeongSummaries(txs);
  
  const salePrices = pyeongSummaries.map(p => p.latestPrice).filter(p => p > 0);
  const minSalePrice = salePrices.length > 0 ? Math.min(...salePrices) : 0;
  const maxSalePrice = salePrices.length > 0 ? Math.max(...salePrices) : 0;

  const offers = salePrices.length > 0 ? {
    "@type": "AggregateOffer",
    "priceCurrency": "KRW",
    "lowPrice": minSalePrice * 10000,
    "highPrice": maxSalePrice * 10000,
    "offerCount": pyeongSummaries.reduce((sum, p) => sum + p.salesCount, 0)
  } : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    "name": `${decodedName}`,
    "description": `동탄 ${decodedName} 아파트 실거래가 및 임장 리포트`,
    "url": `${baseUrl}/apartment/${encodeURIComponent(decodedName)}`,
    ...(structuredImages.length > 0 ? { "image": structuredImages } : {}),
    ...(offers ? { "offers": offers } : {}),
    "priceRange": minSalePrice > 0 ? `₩${(minSalePrice * 10000).toLocaleString()} - ₩${(maxSalePrice * 10000).toLocaleString()}` : undefined
  };

  const aiBriefing = generateAiBriefing(decodedName, aptSummary, pyeongSummaries);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Search Engine Optimization (SSR Content) */}
      <div className="sr-only" aria-hidden="true">
        <h1>{decodedName} 아파트 실거래가 및 학군 가치 분석 리포트</h1>
        <p>{aiBriefing}</p>
        
        {pyeongSummaries.length > 0 ? (
          pyeongSummaries.map((p) => (
            <section key={p.pyeong} style={{ marginTop: '20px' }}>
              <h2>{decodedName} {p.pyeong}평형 실거래가 및 전세가율</h2>
              <ul>
                <li>전용면적: {p.areaM2}㎡</li>
                <li>최근 실거래 매매가: {p.latestPriceStr}</li>
                <li>평균 매매 실거래가: {p.avgPriceStr}</li>
                <li>역대 최고 매매가: {p.maxPriceStr}</li>
                <li>최근 전세 거래가: {p.latestDepositStr}</li>
                <li>평균 전세 실거래가: {p.avgDepositStr}</li>
                <li>전세가율: {p.jeonseRatio > 0 ? `${p.jeonseRatio}%` : '정보 없음'}</li>
                <li>누적 거래 건수: 매매 {p.salesCount}건, 전세 {p.rentCount}건</li>
              </ul>
              <p>
                동탄 {decodedName} {p.pyeong}평형은 전용면적 {p.areaM2}㎡ 크기이며, 
                {p.latestPriceStr !== '정보 없음' ? ` 최근 실거래가 기준 매매가는 ${p.latestPriceStr} 수준을 기록하고 있고` : ''}
                {p.latestDepositStr !== '정보 없음' ? ` 전세가는 ${p.latestDepositStr} 수준입니다.` : ''}
                {p.jeonseRatio > 0 ? ` 해당 평형의 매매 대비 전세가율은 약 ${p.jeonseRatio}%를 보이고 있습니다.` : ''}
                {p.salesCount > 0 ? ` 누적 매매 실거래 건수는 총 ${p.salesCount}건이 등록되어 데이터 기반의 흐름을 보여줍니다.` : ''}
              </p>
            </section>
          ))
        ) : (
          <div>
            <h2>{decodedName} 실거래 데이터 요약</h2>
            <ul>
              <li>최근 매매가: {aptSummary?.latestPriceEok ? `${aptSummary.latestPriceEok}억` : '정보 없음'}</li>
              <li>최근 3개월 평균가: {aptSummary?.avg3MPriceEok ? `${aptSummary.avg3MPriceEok}억` : '정보 없음'}</li>
              <li>최근 전세가: {aptSummary?.latestRentDepositEok ? `${aptSummary.latestRentDepositEok}억` : '정보 없음'}</li>
            </ul>
          </div>
        )}
      </div>

      <DashboardClient initialDashboardData={initialData} preselectedAptName={decodedName} />
    </>
  );
}
