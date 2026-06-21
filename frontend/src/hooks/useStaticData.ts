import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/lib/types/transaction';
import { z } from 'zod';
import { BUILD_VERSION } from '@/lib/build-version';

const FirestoreTransactionSchema = z.object({
  aptName: z.string().min(1),
  dealType: z.string().catch('매매'),
  contractYm: z.union([z.string(), z.number()]).transform(val => String(val)),
  contractDay: z.union([z.string(), z.number()]).transform(val => String(val)),
  price: z.number().catch(0),
  deposit: z.number().catch(0),
  monthlyRent: z.number().catch(0),
  area: z.number().catch(0),
  areaPyeong: z.number().catch(0),
  floor: z.number().catch(0),
  contractDate: z.string().optional(),
});

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

// 1. 가격 포맷터 (sync-transactions.js 의 formatPriceEok 이식)
function formatPriceEok(priceMan: number): string {
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${priceMan.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억${remainder.toLocaleString()}`;
}

// 2. 가격 파서 (priceEok 문자열을 만원 단위 정수로 변환)
function parsePriceEokToMan(priceStr: string): number {
  if (typeof priceStr !== 'string') return 0;
  const clean = priceStr.split('/')[0].replace(/,/g, '').trim();
  let totalMan = 0;
  if (clean.includes('억')) {
    const parts = clean.split('억');
    const eokVal = parseFloat(parts[0]) || 0;
    totalMan += eokVal * 10000;
    if (parts[1]) {
      const manVal = parseFloat(parts[1].replace(/[^0-9.]/g, '')) || 0;
      totalMan += manVal;
    }
  } else {
    const manVal = parseFloat(clean.replace(/[^0-9.]/g, '')) || 0;
    totalMan += manVal;
  }
  return Math.round(totalMan);
}

// 3. 실시간 매매 평균가 가중 업데이트 헬퍼
function updateSaleAveragesWithNewTx(target: AptTxSummary, price: number, txDate: Date) {
  const latestDateStr = target.latestDate ? String(target.latestDate) : '';
  let refDate = new Date();
  if (latestDateStr.length === 8) {
    const y = parseInt(latestDateStr.substring(0, 4), 10);
    const m = parseInt(latestDateStr.substring(4, 6), 10);
    const d = parseInt(latestDateStr.substring(6, 8), 10);
    refDate = new Date(y, m - 1, d);
  }
  
  const oneMonthAgo = new Date(refDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(refDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  if (txDate >= oneMonthAgo) {
    const prevCount = target.avg1MTxCount || 0;
    const prevAvg = target.avg1MPrice || 0;
    const newCount = prevCount + 1;
    const newAvg = Math.round(((prevAvg * prevCount) + price) / newCount / 100) * 100;
    target.avg1MTxCount = newCount;
    target.avg1MPrice = newAvg;
    target.avg1MPriceEok = formatPriceEok(newAvg);
  }
  
  if (txDate >= threeMonthsAgo) {
    const prevCount = target.avg3MTxCount || 0;
    const prevAvg = target.avg3MPrice || 0;
    const newCount = prevCount + 1;
    const newAvg = Math.round(((prevAvg * prevCount) + price) / newCount / 100) * 100;
    target.avg3MTxCount = newCount;
    target.avg3MPrice = newAvg;
    target.avg3MPriceEok = formatPriceEok(newAvg);
  }
}

// 4. 정적 요약본 + Firestore 신규 거래 메모리 병합 헬퍼 (얕은 복사 & 부분 복제)
function mergeTransactions(
  staticSummary: Record<string, AptTxSummary>,
  newTxs: any[]
): Record<string, AptTxSummary> {
  if (!newTxs || newTxs.length === 0) return staticSummary;
  
  const merged = { ...staticSummary };
  const updatedKeys = new Set<string>();

  newTxs.forEach((tx) => {
    const validation = FirestoreTransactionSchema.safeParse(tx);
    if (!validation.success) return;
    
    const validatedTx = validation.data;
    const rawAptName = validatedTx.aptName;

    const aptKey = rawAptName
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\[.*?\]\s*/g, '')
      .replace(/\s+/g, '')
      .replace(/[()（）]/g, '')
      .trim();

    const staticTarget = staticSummary[aptKey];
    if (!staticTarget) return;

    if (!updatedKeys.has(aptKey)) {
      merged[aptKey] = { ...staticTarget };
      if (staticTarget.maxPriceByArea) {
        merged[aptKey].maxPriceByArea = { ...staticTarget.maxPriceByArea };
      }
      updatedKeys.add(aptKey);
    }
    
    const target = merged[aptKey];
    const contractYmStr = validatedTx.contractYm;
    if (contractYmStr.length < 6) return;

    const isSale = validatedTx.dealType !== '전세' && validatedTx.dealType !== '월세';
    const txFullDate = validatedTx.contractDate || `${contractYmStr}${validatedTx.contractDay}`;

    if (isSale) {
      target.txCount = (target.txCount || 0) + 1;

      if (validatedTx.price > (target.maxPrice || 0)) {
        target.maxPrice = validatedTx.price;
        target.maxPriceEok = formatPriceEok(validatedTx.price);
      }

      const areaKey = (Math.round(validatedTx.area * 100) / 100).toFixed(2);
      if (!target.maxPriceByArea) target.maxPriceByArea = {};
      if (!target.maxPriceByArea[areaKey] || validatedTx.price > target.maxPriceByArea[areaKey]) {
        target.maxPriceByArea[areaKey] = validatedTx.price;
      }

      if (!target.latestDate || txFullDate >= target.latestDate) {
        target.latestDate = txFullDate;
        target.latestPrice = validatedTx.price || 0;
        target.latestPriceEok = formatPriceEok(validatedTx.price);
        target.latestArea = validatedTx.areaPyeong || (validatedTx.area * 0.3025 * 1.33);
        target.latestFloor = validatedTx.floor || 0;
      }

      const latestYear = parseInt(contractYmStr.substring(0, 4), 10);
      const latestMonth = parseInt(contractYmStr.substring(4, 6), 10);
      const dayVal = parseInt(validatedTx.contractDay, 10) || 1;
      const txDate = new Date(latestYear, latestMonth - 1, dayVal);
      updateSaleAveragesWithNewTx(target, validatedTx.price, txDate);

    } else {
      const deposit = validatedTx.deposit || 0;
      const monthlyRent = validatedTx.monthlyRent || 0;
      const convertedDeposit = deposit + (monthlyRent ? Math.round(monthlyRent * 12 / 0.055) : 0);

      if (!target.latestRentDate || txFullDate >= target.latestRentDate) {
        const isRentDup = target.latestRentDate === txFullDate && 
                          target.latestRentDeposit === convertedDeposit && 
                          target.latestRentMonthly === monthlyRent;
        if (!isRentDup) {
          target.latestRentDate = txFullDate;
          target.latestRentDeposit = convertedDeposit;
          target.latestRentDepositEok = formatPriceEok(convertedDeposit);
          target.latestRentMonthly = monthlyRent;
          target.rentTxCount = (target.rentTxCount || 0) + 1;
        }
      }
    }
  });

  return merged;
}

// 4-2. 정적 최근 거래 플랫 리스트 + Firestore 신규 거래 메모리 병합 헬퍼
function mergeRecentTransactions(
  staticRecent: any[],
  newTxs: any[]
): any[] {
  if (!newTxs || newTxs.length === 0) return staticRecent;
  
  const merged = [...staticRecent];
  
  newTxs.forEach((tx) => {
    const validation = FirestoreTransactionSchema.safeParse(tx);
    if (!validation.success) return;
    
    const validatedTx = validation.data;
    const isSale = validatedTx.dealType !== '전세' && validatedTx.dealType !== '월세';
    if (!isSale) return;

    const txDateFormatted = `${validatedTx.contractYm.substring(4)}.${validatedTx.contractDay}`;
    const contractDate = validatedTx.contractDate || `${validatedTx.contractYm}${validatedTx.contractDay}`;
    const aptKey = validatedTx.aptName
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\[.*?\]\s*/g, '')
      .replace(/\s+/g, '')
      .replace(/[()（）]/g, '')
      .trim();

    const isDup = merged.some(r => 
      r.contractDate === contractDate &&
      r.txKey === aptKey &&
      Math.abs(r.area - validatedTx.area) < 0.01 &&
      r.floor === validatedTx.floor &&
      r.priceVal === validatedTx.price / 10000
    );
    if (isDup) return;

    const newTxItem = {
      aptName: validatedTx.aptName,
      txKey: aptKey,
      date: txDateFormatted,
      contractDate: contractDate,
      priceVal: validatedTx.price / 10000,
      priceEok: formatPriceEok(validatedTx.price),
      area: validatedTx.area,
      areaPyeong: validatedTx.areaPyeong || (validatedTx.area * 0.3025 * 1.33),
      floor: validatedTx.floor,
      dealType: validatedTx.dealType || '매매',
      isNewHigh: false,
      delta: 0,
      deltaPercent: 0
    };

    merged.unshift(newTxItem);
  });

  merged.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
  return merged;
}

// 5. Firestore 최근 7일 거래 조회 fetcher
const fetchRecentTxsFromFirestore = async () => {
  if (!db) return [];
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const y = sevenDaysAgo.getFullYear();
    const m = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
    const d = String(sevenDaysAgo.getDate()).padStart(2, '0');
    const cutoffDateStr = `${y}${m}${d}`;

    const q = query(
      collection(db, 'transactions'),
      where('contractDate', '>=', cutoffDateStr)
    );

    const snap = await getDocs(q);
    const txs: any[] = [];
    snap.forEach(doc => {
      txs.push(doc.data());
    });
    return txs;
  } catch (err) {
    console.error('Failed to fetch recent transactions from Firestore:', err);
    return [];
  }
};

export function useTxData(
  initialMacroTrend?: DongtanMacroTrendPoint[],
  initialTxSummary?: Record<string, AptTxSummary>,
  initialRecent7DaysVolume?: any,
  initialRecentTransactions?: any[]
) {
  const [shouldFetch, setShouldFetch] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let idleId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    if ('requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(() => setShouldFetch(true), { timeout: 150 });
    } else {
      timerId = setTimeout(() => setShouldFetch(true), 100);
    }

    return () => {
      if (idleId !== null) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, []);

  // 1. 정적 요약본 페칭 (tx-summary.json)
  const { data: summaryData, error: summaryError, isLoading: isSummaryLoading } = useSWR<{
    summary: Record<string, AptTxSummary>;
    recent7DaysVolume?: {
      currentCount: number;
      prevCount: number;
      trendText: string;
      trendColor: string;
      badge: string;
    };
  }>(shouldFetch ? '/data/tx-summary.json' : null, fetcher, {
    fallbackData: (initialTxSummary && Object.keys(initialTxSummary).length > 0) ? { summary: initialTxSummary, recent7DaysVolume: initialRecent7DaysVolume } : undefined,
    revalidateOnFocus: false,
    revalidateIfStale: true,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000
  });

  // 1-2. 최근 전체 실거래 플랫 리스트 페칭 (recent-transactions.json)
  const { data: recentTxData, error: recentTxError, isLoading: isRecentTxLoading } = useSWR<any[]>(
    shouldFetch ? `/data/recent-transactions.json?v=${BUILD_VERSION}` : null,
    fetcher,
    {
      fallbackData: initialRecentTransactions,
      revalidateOnFocus: false,
      revalidateIfStale: true,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000
    }
  );

  // 2. Firestore 실시간 최근 7일 거래 페칭
  const { data: recentFirestoreTxs, error: firestoreError } = useSWR<any[]>(
    shouldFetch ? 'recent-firestore-txs' : null,
    fetchRecentTxsFromFirestore,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000
    }
  );

  // 3. 정적 데이터 + Firestore 실시간 데이터 병합 요약본 계산
  const mergedSummary = useMemo(() => {
    const activeSummary = summaryData?.summary || initialTxSummary;
    if (!activeSummary) return undefined;
    if (!recentFirestoreTxs || recentFirestoreTxs.length === 0) return activeSummary;
    return mergeTransactions(activeSummary, recentFirestoreTxs);
  }, [summaryData?.summary, initialTxSummary, recentFirestoreTxs]);

  // 3-2. 정적 최근 거래 목록 + Firestore 실시간 데이터 병합 계산
  const mergedRecentTxs = useMemo(() => {
    const activeRecent = recentTxData || initialRecentTransactions || [];
    if (!recentFirestoreTxs || recentFirestoreTxs.length === 0) return activeRecent;
    return mergeRecentTransactions(activeRecent, recentFirestoreTxs);
  }, [recentTxData, initialRecentTransactions, recentFirestoreTxs]);

  // 4. 실시간 거래량을 가산한 7일 거래 지표 계산
  const mergedRecent7DaysVolume = useMemo(() => {
    const activeVolume = summaryData?.recent7DaysVolume || initialRecent7DaysVolume;
    const activeSummary = summaryData?.summary || initialTxSummary;
    if (!activeVolume || !activeSummary) return undefined;
    if (!recentFirestoreTxs || recentFirestoreTxs.length === 0) return activeVolume;

    let maxStaticDate = '00000000';
    Object.values(activeSummary).forEach(s => {
      if (s.latestDate && s.latestDate > maxStaticDate) {
        maxStaticDate = s.latestDate;
      }
    });

    const newTxsAfterStatic = recentFirestoreTxs.filter(tx => {
      const isSale = tx.dealType !== '전세' && tx.dealType !== '월세';
      const txFullDate = tx.contractDate || `${tx.contractYm}${tx.contractDay}`;
      return isSale && txFullDate > maxStaticDate;
    });

    if (newTxsAfterStatic.length === 0) return activeVolume;

    const currentCount = activeVolume.currentCount + newTxsAfterStatic.length;
    const prevCount = activeVolume.prevCount;
    const diff = currentCount - prevCount;
    const rate = prevCount > 0 ? (diff / prevCount) * 100 : 0;
    const isUp = diff > 0;
    const isDown = diff < 0;
    let trendText = "보합 (0%)";
    let trendColor = "#94a3b8";

    if (isUp) {
      trendText = `상승 (+${rate.toFixed(1)}%)`;
      trendColor = "#ff4b5c";
    } else if (isDown) {
      trendText = `하락 (${rate.toFixed(1)}%)`;
      trendColor = "#2e7cf6";
    }

    return {
      currentCount,
      prevCount,
      trendText,
      trendColor,
      badge: `${diff >= 0 ? "+" : ""}${diff}건 (${diff >= 0 ? "+" : ""}${rate.toFixed(0)}%)`,
    };
  }, [summaryData?.recent7DaysVolume, initialRecent7DaysVolume, summaryData?.summary, initialTxSummary, recentFirestoreTxs]);

  const { data: trendData, error: trendError, isLoading: isTrendLoading } = useSWR<DongtanMacroTrendPoint[]>(
    shouldFetch ? `/data/macro-trend.json?v=${BUILD_VERSION}` : null,
    fetcher,
    {
      fallbackData: initialMacroTrend,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000
    }
  );
  
  if (summaryError) {
    console.error("useTxData SWR summary error:", summaryError);
  }

  return {
    txSummary: mergedSummary,
    recentTransactions: mergedRecentTxs,
    recent7DaysVolume: mergedRecent7DaysVolume,
    macroTrend: trendData || initialMacroTrend,
    isLoading: (!shouldFetch && !initialMacroTrend) || isSummaryLoading || isRecentTxLoading || (isTrendLoading && !initialMacroTrend),
    error: summaryError || trendError || recentTxError || firestoreError
  };
}

export function useLocationScores() {
  const [shouldFetch, setShouldFetch] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let idleId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    if ('requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(() => setShouldFetch(true), { timeout: 150 });
    } else {
      timerId = setTimeout(() => setShouldFetch(true), 100);
    }

    return () => {
      if (idleId !== null) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, []);

  const { data, error, isLoading } = useSWR<Record<string, any>>(shouldFetch ? `/data/location-scores.json?v=${BUILD_VERSION}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000 // 1 hour cache
  });
  
  return {
    locationScores: data,
    isLoading: !shouldFetch || isLoading,
    error
  };
}
