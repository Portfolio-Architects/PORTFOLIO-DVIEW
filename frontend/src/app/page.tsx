import { Suspense } from 'react';
import DashboardClient from '@/components/DashboardClient';
import { adminDb } from '@/lib/firebaseAdmin';
import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';
import { fetchSheetApartmentsByDong } from '@/lib/services/googleSheets';
import { createInitialKPIs } from '@/lib/services/kpi.service';

import { redis } from '@/lib/redis';

// Use Incremental Static Regeneration (ISR) to eliminate TTFB bottlenecks
export const revalidate = 3600;

async function getInitialData() {
  const result: {
    favoriteCounts: Record<string, number>;
    typeMap: { aptName: string; area: string; typeM2: string; typePyeong: string }[];
    apartmentMeta: Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
    sheetApartments?: Record<string, any[]>;
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
      const cachedCounts = await redis.hgetall('DTDLS:cache:favoriteCounts');
      if (cachedCounts && Object.keys(cachedCounts).length > 0) {
        result.favoriteCounts = cachedCounts as Record<string, number>;
        return;
      }
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), 5000);
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.count > 0) result.favoriteCounts[data.aptName || doc.id] = data.count;
      });
    }
  };

  const fetchMeta = async () => {
    if (adminDb) {
      const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), 5000);
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
          thumbnail: data.thumbnail,
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
    const res = await fetch(csvUrl, { next: { revalidate: 3600 } });
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

  const fetchApts = async () => {
    const aptData = await fetchSheetApartmentsByDong();
    if (aptData && aptData.byDong) {
      result.sheetApartments = aptData.byDong;
    }
  };

  await Promise.allSettled([
    fetchFavCounts().catch(e => console.warn('[Server] favCounts error:', e)),
    fetchMeta().catch(e => console.warn('[Server] meta error:', e)),
    fetchReports().catch(e => console.warn('[Server] reports error:', e)),
    fetchTypeMap().catch(e => console.warn('[Server] typeMap error:', e)),
    fetchApts().catch(e => console.warn('[Server] apts error:', e)),
  ]);

  return result;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-body">
      <header className="bg-surface/90 border-b border-border sticky top-0 z-40">
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16 h-14 sm:h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-32 h-8 bg-body rounded-full animate-pulse" />
            <div className="w-16 h-8 bg-body rounded-full animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-body rounded-full animate-pulse" />
        </div>
      </header>
      <main className="w-full max-w-[2000px] mx-auto px-3 sm:px-6 md:px-10 lg:px-16 py-3 sm:py-5 md:py-8">
        <div className="mb-6 flex gap-3 items-center">
           <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/5 dark:bg-surface/5 rounded-xl animate-pulse" />
           <div className="w-48 sm:w-64 h-8 bg-black/5 dark:bg-surface/5 rounded-lg animate-pulse" />
        </div>
        <div className="flex flex-col md:flex-row md:bg-surface md:rounded-2xl md:border md:border-border md:shadow-sm gap-4 md:gap-0">
           <div className="w-full md:w-[380px] h-[600px] bg-surface rounded-2xl md:bg-transparent md:border-r md:border-border flex flex-col">
             <div className="p-4 border-b border-border">
               <div className="w-full h-10 bg-black/5 dark:bg-surface/5 rounded-xl animate-pulse" />
             </div>
             <div className="p-4 flex flex-col gap-4">
               {[1, 2, 3, 4, 5, 6].map(i => (
                 <div key={i} className="w-full h-[72px] bg-black/5 dark:bg-surface/5 rounded-xl animate-pulse" />
               ))}
             </div>
           </div>
           <div className="hidden md:block flex-1 h-[600px] bg-body rounded-tr-2xl rounded-br-2xl p-8">
             <div className="w-48 h-10 bg-black/5 dark:bg-surface/5 rounded-xl animate-pulse mb-8" />
             <div className="w-full h-64 bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse mb-4" />
             <div className="w-full h-32 bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse" />
           </div>
        </div>
      </main>
    </div>
  );
}

async function DashboardDataLoader() {
  const initialData = await getInitialData();
  return <DashboardClient initialDashboardData={initialData} />;
}

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardDataLoader />
    </Suspense>
  );
}

