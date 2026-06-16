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

// 3. 매매 평균값 및 건수 재산출 헬퍼
function recalculateSaleAverages(target: AptTxSummary) {
  if (!target.recent || target.recent.length === 0) return;
  const latestDateStr = target.latestDate ? String(target.latestDate) : '';
  if (latestDateStr.length !== 8) return;
  
  const latestYear = parseInt(latestDateStr.substring(0, 4), 10);
  const latestMonth = parseInt(latestDateStr.substring(4, 6), 10);
  const latestDay = parseInt(latestDateStr.substring(6, 8), 10);
  const latestDt = new Date(latestYear, latestMonth - 1, latestDay);
  
  const oneMonthAgo = new Date(latestDt.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(latestDt.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  let sum1MPrice = 0;
  let count1M = 0;
  let sum1MPerPyeong = 0;
  
  let sum3MPrice = 0;
  let count3M = 0;
  let sum3MPerPyeong = 0;
  
  target.recent.forEach(r => {
    const parts = r.date.split('.');
    if (parts.length < 2) return;
    const m = parseInt(parts[0], 10) - 1;
    const d = parseInt(parts[1], 10);
    
    let y = latestYear;
    if (m > latestMonth - 1) {
      y = latestYear - 1; // 12월 -> 1월 등 연도 경계 처리
    }
    const txDate = new Date(y, m, d);
    const price = parsePriceEokToMan(r.priceEok);
    
    if (txDate >= oneMonthAgo) {
      sum1MPrice += price;
      count1M++;
      if (r.areaPyeong > 0) {
        sum1MPerPyeong += price / r.areaPyeong;
      }
    }
    if (txDate >= threeMonthsAgo) {
      sum3MPrice += price;
      count3M++;
      if (r.areaPyeong > 0) {
        sum3MPerPyeong += price / r.areaPyeong;
      }
    }
  });
  
  if (count1M > 0) {
    target.avg1MPrice = Math.round(sum1MPrice / count1M / 100) * 100;
    target.avg1MPriceEok = formatPriceEok(target.avg1MPrice);
    target.avg1MPerPyeong = Math.round(sum1MPerPyeong / count1M);
    target.avg1MTxCount = count1M;
  } else if (target.latestPrice > 0) {
    target.avg1MPrice = target.latestPrice;
    target.avg1MPriceEok = target.latestPriceEok;
    target.avg1MPerPyeong = target.latestArea > 0 ? Math.round(target.latestPrice / target.latestArea) : 0;
    target.avg1MTxCount = 1;
  }
  
  if (count3M > 0) {
    target.avg3MPrice = Math.round(sum3MPrice / count3M / 100) * 100;
    target.avg3MPriceEok = formatPriceEok(target.avg3MPrice);
    target.avg3MPerPyeong = Math.round(sum3MPerPyeong / count3M);
    target.avg3MTxCount = count3M;
  } else if (target.latestPrice > 0) {
    target.avg3MPrice = target.latestPrice;
    target.avg3MPriceEok = target.latestPriceEok;
    target.avg3MPerPyeong = target.latestArea > 0 ? Math.round(target.latestPrice / target.latestArea) : 0;
    target.avg3MTxCount = 1;
  }
}

// 4. 정적 요약본 + Firestore 신규 거래 메모리 병합 헬퍼
function mergeTransactions(
  staticSummary: Record<string, AptTxSummary>,
  newTxs: any[]
): Record<string, AptTxSummary> {
  if (!newTxs || newTxs.length === 0) return staticSummary;
  
  // 깊은 복사로 불변성 보장
  const merged = JSON.parse(JSON.stringify(staticSummary)) as Record<string, AptTxSummary>;

  newTxs.forEach((tx) => {
    const validation = FirestoreTransactionSchema.safeParse(tx);
    if (!validation.success) {
      return; // Skip invalid records safely
    }
    const validatedTx = validation.data;
    const rawAptName = validatedTx.aptName;

    // 아파트명 정규화 (sync-transactions.js 와 통일)
    const aptKey = rawAptName
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\[.*?\]\s*/g, '')
      .replace(/\s+/g, '')
      .replace(/[()（）]/g, '')
      .trim();

    const target = merged[aptKey];
    if (!target) return; // Google Sheet상 승인된 동탄 아파트 단지가 아니면 패스

    const contractYmStr = validatedTx.contractYm;
    if (contractYmStr.length < 6) return;

    const isSale = validatedTx.dealType !== '전세' && validatedTx.dealType !== '월세';
    const txDateFormatted = `${contractYmStr.substring(4)}.${validatedTx.contractDay}`; // MM.DD 포맷

    if (isSale) {
      // 1. 매매 중복 검증
      if (!target.recent) {
        target.recent = [];
      }
      const isDup = target.recent.some(r => 
        r.date === txDateFormatted &&
        Math.abs(r.area - validatedTx.area) < 0.01 &&
        r.floor === validatedTx.floor &&
        parsePriceEokToMan(r.priceEok) === validatedTx.price
      );
      if (isDup) return;

      const priceDisplay = formatPriceEok(validatedTx.price || 0);
      const newRecentItem = {
        date: txDateFormatted,
        priceEok: priceDisplay,
        areaPyeong: validatedTx.areaPyeong || (validatedTx.area * 0.3025 * 1.33),
        floor: validatedTx.floor || 0,
        area: validatedTx.area
      };

      // 병합 및 정렬 (최근 25건 컷)
      target.recent = [newRecentItem, ...target.recent];
      target.recent.sort((a, b) => b.date.localeCompare(a.date));
      target.recent = target.recent.slice(0, 25);
      
      target.txCount = (target.txCount || 0) + 1;

      // 단지 전체 최고가 검증
      if (validatedTx.price > (target.maxPrice || 0)) {
        target.maxPrice = validatedTx.price;
        target.maxPriceEok = priceDisplay;
      }

      // 평형별 최고가 갱신
      const areaKey = (Math.round(validatedTx.area * 100) / 100).toFixed(2);
      if (!target.maxPriceByArea) target.maxPriceByArea = {};
      if (!target.maxPriceByArea[areaKey] || validatedTx.price > target.maxPriceByArea[areaKey]) {
        target.maxPriceByArea[areaKey] = validatedTx.price;
      }

      // 최근 거래 메타데이터 업데이트
      const txFullDate = validatedTx.contractDate || `${validatedTx.contractYm}${validatedTx.contractDay}`;
      if (!target.latestDate || txFullDate >= target.latestDate) {
        target.latestDate = txFullDate;
        target.latestPrice = validatedTx.price || 0;
        target.latestPriceEok = priceDisplay;
        target.latestArea = validatedTx.areaPyeong || (validatedTx.area * 0.3025 * 1.33);
        target.latestFloor = validatedTx.floor || 0;
      }

      // 평균값 재산출
      recalculateSaleAverages(target);

    } else {
      // 2. 임대차 (전세/월세) 처리
      const txFullDate = validatedTx.contractDate || `${contractYmStr}${validatedTx.contractDay}`;
      const deposit = validatedTx.deposit || 0;
      const monthlyRent = validatedTx.monthlyRent || 0;
      const convertedDeposit = deposit + (monthlyRent ? Math.round(monthlyRent * 12 / 0.055) : 0);
      const priceDisplay = formatPriceEok(convertedDeposit) + (monthlyRent ? `/${monthlyRent}` : '');

      // 중복 체크 및 업데이트 판정 (latestRentDate보다 최신이거나 같을 때)
      if (!target.latestRentDate || txFullDate >= target.latestRentDate) {
        // 중복이 아닐 때만 갱신
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

// 5. Firestore 최근 7일 거래 조회 fetcher
const fetchRecentTxsFromFirestore = async () => {
  if (!db) return [];
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const y = sevenDaysAgo.getFullYear();
    const m = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
    const d = String(sevenDaysAgo.getDate()).padStart(2, '0');
    const cutoffDateStr = `${y}${m}${d}`; // YYYYMMDD

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
  initialRecent7DaysVolume?: any
) {
  const [shouldFetch, setShouldFetch] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => setShouldFetch(true), { timeout: 150 });
    } else {
      setTimeout(() => setShouldFetch(true), 100);
    }
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
  }>(shouldFetch ? `/data/tx-summary.json?v=${BUILD_VERSION}` : null, fetcher, {
    fallbackData: initialTxSummary ? { summary: initialTxSummary, recent7DaysVolume: initialRecent7DaysVolume } : undefined,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000 // 1 hour cache
  });

  // 2. Firestore 실시간 최근 7일 거래 페칭
  const { data: recentFirestoreTxs, error: firestoreError } = useSWR<any[]>(
    shouldFetch ? 'recent-firestore-txs' : null,
    fetchRecentTxsFromFirestore,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000 // 5 minutes cache to prevent spamming Firestore reads
    }
  );

  // 3. 정적 데이터 + Firestore 실시간 데이터 병합 요약본 계산
  const mergedSummary = useMemo(() => {
    const activeSummary = summaryData?.summary || initialTxSummary;
    if (!activeSummary) return undefined;
    if (!recentFirestoreTxs || recentFirestoreTxs.length === 0) return activeSummary;
    return mergeTransactions(activeSummary, recentFirestoreTxs);
  }, [summaryData?.summary, initialTxSummary, recentFirestoreTxs]);

  // 4. 실시간 거래량을 가산한 7일 거래 지표 계산
  const mergedRecent7DaysVolume = useMemo(() => {
    const activeVolume = summaryData?.recent7DaysVolume || initialRecent7DaysVolume;
    const activeSummary = summaryData?.summary || initialTxSummary;
    if (!activeVolume || !activeSummary) return undefined;
    if (!recentFirestoreTxs || recentFirestoreTxs.length === 0) return activeVolume;

    // staticSummary의 아파트들 중 가장 최신 거래일을 구함
    let maxStaticDate = '00000000';
    Object.values(activeSummary).forEach(s => {
      if (s.latestDate && s.latestDate > maxStaticDate) {
        maxStaticDate = s.latestDate;
      }
    });

    // staticSummary 기준일보다 이후에 일어난 신규 실시간 매매 건수를 카운트
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
  if (summaryData) {
    console.log("useTxData summaryData successfully loaded. keys:", Object.keys(summaryData.summary || {}).length);
  }

  return {
    txSummary: mergedSummary,
    recent7DaysVolume: mergedRecent7DaysVolume,
    macroTrend: trendData || initialMacroTrend,
    isLoading: (!shouldFetch && !initialMacroTrend) || isSummaryLoading || (isTrendLoading && !initialMacroTrend),
    error: summaryError || trendError || firestoreError
  };
}

export function useLocationScores() {
  const [shouldFetch, setShouldFetch] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => setShouldFetch(true), { timeout: 150 });
    } else {
      setTimeout(() => setShouldFetch(true), 100);
    }
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
