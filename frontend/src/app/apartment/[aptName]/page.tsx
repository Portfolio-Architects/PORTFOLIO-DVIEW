import { Metadata } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import DashboardClient from '@/components/DashboardClient';
import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';

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
  
  // Dynamic OG Image URL
  const ogUrl = new URL(`${baseUrl}/api/og`);
  ogUrl.searchParams.set('title', decodedName);
  ogUrl.searchParams.set('subtitle', '동탄 실거래가 및 가치 분석');
  if (imageUrl) {
    ogUrl.searchParams.set('bgUrl', imageUrl);
  }
  
  const seoDescription = `동탄 ${decodedName} 실거래가, 매매가, 전세가율, 학군, 교통 호재, 적정 가치 분석. D-VIEW에서 실제 데이터 기반의 프리미엄 분석을 확인하세요.`;

  return {
    title: `${decodedName} 실거래가 및 프리미엄 분석 - D-VIEW`,
    description: seoDescription,
    keywords: `동탄, ${decodedName}, 실거래가, 매매가, 전세가율, 학군, 교통, 인프라, 아파트 분석, 임장, 호갱노노, 아실, 부동산`,
    openGraph: {
      title: `${decodedName} 실거래가 분석 - D-VIEW`,
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
      title: `${decodedName} 실거래가 분석 - D-VIEW`,
      description: seoDescription,
      images: [ogUrl.toString()],
    }
  };
}

import { createInitialKPIs } from '@/lib/services/kpi.service';

export const dynamic = 'force-dynamic';

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
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), 3000);
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.count > 0) result.favoriteCounts[data.aptName || doc.id] = data.count;
      });
    }
  };

  const fetchMeta = async () => {
    if (adminDb) {
      const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), 3000);
      if (metaDoc.exists) {
        result.apartmentMeta = (metaDoc.data() || {}) as Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
      }
    }
  };

  const fetchReports = async () => {
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('scoutingReports').orderBy('createdAt', 'desc').limit(30).get(), 5000);
      result.fieldReports = snap.docs.map(doc => {
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
          images: data.images || [],
          metrics: data.metrics,
          scoutingDate: data.scoutingDate || '',
          createdAt: createdAtStr,
          _rawTimestamp: rawTimestamp
        };
      });
    }
  };

  const fetchTypeMap = async () => {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TABS.TYPE_MAP)}&_t=${Date.now()}`;
    const res = await fetch(csvUrl, { cache: 'no-store' });
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter((l: string) => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 3) continue;
        const aptName = cols[1]?.trim();
        const area = cols[2]?.trim();
        const typeM2 = cols[3]?.trim() || '';
        const typePyeong = cols[5]?.trim() || '';
        if (aptName && area && (typeM2 || typePyeong)) {
          result.typeMap.push({ aptName, area, typeM2, typePyeong });
        }
      }
    }
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    "name": `${decodedName}`,
    "description": `동탄 ${decodedName} 아파트 실거래가 및 임장 리포트`,
    "url": `${baseUrl}/apartment/${encodeURIComponent(decodedName)}`,
    ...(structuredImages.length > 0 ? { "image": structuredImages } : {})
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DashboardClient initialDashboardData={initialData} preselectedAptName={decodedName} />
    </>
  );
}
