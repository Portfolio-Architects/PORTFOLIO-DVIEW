import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { User } from 'firebase/auth';
import type { AptTxSummary } from '@/lib/types/transaction';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import { normalizeAptName, findTxKey, isSameApartment, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import { DongApartment } from '@/lib/dong-apartments';

export interface TransactionRecord {
  no: number;
  sigungu: string;
  dong: string;
  aptName: string;
  area: number;
  areaPyeong: number;
  contractYm: string;
  contractDay: string;
  contractDate: string;
  price: number;
  priceEok: string;
  deposit?: number;
  monthlyRent?: number;
  floor: number;
  buyer: string;
  seller: string;
  buildYear: number;
  roadName: string;
  cancelDate: string;
  dealType: string;
  agentLocation: string;
  registrationDate: string;
  housingType: string;
  reqGb: string;
  rnuYn: string;
  isOutlier?: boolean;
}

interface RawTransactionRecord {
  dealType?: string;
  deposit?: number;
  monthlyRent?: number;
  price: number;
  area: number;
  areaPyeong: number;
  contractYm: string;
  contractDay: string | number;
  floor: number;
  cancelDate?: string;
  reqGb?: string;
  rnuYn?: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.ok ? res.json() : []);

export function useApartmentDetails(
  selectedReport: FieldReportData | null,
  sheetApartments: Record<string, DongApartment[]>,
  nameMapping: Record<string, string> | undefined,
  user: User | null,
  txSummaryData: Record<string, AptTxSummary> = {},
  locationScores: Record<string, any> = {}
) {
  const [fullReportData, setFullReportData] = useState<FieldReportData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [prevReportId, setPrevReportId] = useState<string | null>(null);
  const currentReportId = selectedReport?.id || null;
  if (currentReportId !== prevReportId) {
    setPrevReportId(currentReportId);
    setFullReportData(null);
    setIsLoadingDetail(!!selectedReport && !selectedReport.id.startsWith('stub-'));
  }

  const formatPriceEok = (priceMan: number) => {
    const eok = Math.floor(priceMan / 10000);
    const remainder = priceMan % 10000;
    if (eok === 0) return `${priceMan.toLocaleString()}만`;
    if (remainder === 0) return `${eok}억`;
    return `${eok}억${remainder.toLocaleString()}`;
  };

  const fileKey = useMemo(() => {
    if (!selectedReport) return null;
    const rawApt = Object.values(sheetApartments).flat().find(a => isSameApartment(a.name, selectedReport.apartmentName, nameMapping));
    const overrideKey = HARDCODED_MAPPING[normalizeAptName(selectedReport.apartmentName)];
    const rawTxKey = overrideKey || (rawApt as { txKey?: string })?.txKey || findTxKey(selectedReport.apartmentName, txSummaryData, nameMapping);
    const txKey = rawTxKey ? normalizeAptName(rawTxKey) : '';
    return txKey || normalizeAptName(selectedReport.apartmentName);
  }, [selectedReport, sheetApartments, txSummaryData, nameMapping]);

  const [shouldFetchFull, setShouldFetchFull] = useState(false);

  useEffect(() => {
    if (!selectedReport) {
      setShouldFetchFull(false);
      return;
    }
    setShouldFetchFull(false); // Reset on new report selection
    
    const timer = setTimeout(() => {
      setShouldFetchFull(true);
    }, 1500); // 1.5s delay to keep initial mount ultra-fast
    
    return () => clearTimeout(timer);
  }, [selectedReport]);

  const loadAllTransactions = () => {
    setShouldFetchFull(true);
  };

  // 1. 최근 15건 실거래 데이터 초고속 로드 (보통 2KB 미만)
  const { data: recentRecords, isLoading: isRecentLoading } = useSWR<RawTransactionRecord[]>(
    fileKey ? `/tx-data/${encodeURIComponent(fileKey)}-recent.json` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000,
    }
  );

  // 2. 전체 실거래 데이터 백그라운드 지연 로드 (용량 무관하게 UX 정체 없음)
  const { data: fullRecords, isLoading: isFullLoading } = useSWR<RawTransactionRecord[]>(
    fileKey && shouldFetchFull ? `/tx-data/${encodeURIComponent(fileKey)}.json` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000,
    }
  );

  const records = fullRecords || recentRecords;
  const isTxLoading = isRecentLoading && !recentRecords; // 최근 데이터가 왔거나 이미 캐시가 있으면 로딩 해제

  const modalTransactions = useMemo(() => {
    if (!records) return [];

    // 1단계: 평가용 거래 정보 매핑
    const mapped = records.map((r, i) => {
      const isRent = r.dealType === '전세' || r.dealType === '월세';
      const evaluatedPrice = isRent
        ? (r.deposit || 0) + (r.monthlyRent ? Math.round(r.monthlyRent * 12 / 0.055) : 0)
        : r.price;
      const areaKey = Math.round(r.area);
      const typeKey = isRent ? 'rent' : 'sale';
      const groupKey = `${areaKey}_${typeKey}`;

      let eokStr = '';
      if (isRent) {
         eokStr = formatPriceEok(r.deposit || 0);
         if (r.dealType === '월세' && r.monthlyRent) eokStr += ` / ${r.monthlyRent}만`;
      } else {
         eokStr = formatPriceEok(r.price);
      }

      return {
        no: i + 1, sigungu: '', dong: '', aptName: fileKey || '',
        area: r.area, areaPyeong: r.areaPyeong,
        contractYm: r.contractYm, contractDay: String(r.contractDay),
        contractDate: `${r.contractYm}${String(r.contractDay).padStart(2, '0')}`,
        price: r.price, priceEok: eokStr,
        deposit: r.deposit || 0, monthlyRent: r.monthlyRent || 0,
        floor: r.floor, buyer: '', seller: '', buildYear: 0, roadName: '',
        cancelDate: r.cancelDate || '', dealType: r.dealType || '',
        agentLocation: '', registrationDate: '-', housingType: '',
        reqGb: r.reqGb || '', rnuYn: r.rnuYn || '',
        // IQR용 메타데이터 임시 저장
        groupKey,
        evaluatedPrice,
      };
    });

    // 2단계: 그룹화하여 IQR 경계 계산
    const groups: Record<string, number[]> = {};
    mapped.forEach(item => {
      if (!groups[item.groupKey]) {
        groups[item.groupKey] = [];
      }
      groups[item.groupKey].push(item.evaluatedPrice);
    });

    const iqrBounds: Record<string, { lower: number; upper: number; count: number }> = {};
    Object.entries(groups).forEach(([groupKey, prices]) => {
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const getPercentile = (arr: number[], val: number) => {
        if (arr.length === 0) return 0;
        const idx = (arr.length - 1) * val;
        const base = Math.floor(idx);
        const rest = idx - base;
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base]);
        } else {
          return arr[base];
        }
      };
      const q1 = getPercentile(sortedPrices, 0.25);
      const q3 = getPercentile(sortedPrices, 0.75);
      const iqr = q3 - q1;
      iqrBounds[groupKey] = {
        lower: q1 - 1.5 * iqr,
        upper: q3 + 1.5 * iqr,
        count: prices.length
      };
    });

    // 3단계: 최종 modalTransactions 구성
    return mapped.map(item => {
      const bounds = iqrBounds[item.groupKey];
      const isOutlier = bounds && bounds.count >= 4 && (item.evaluatedPrice < bounds.lower);
      
      const { groupKey, evaluatedPrice, ...rest } = item;
      return {
        ...rest,
        isOutlier: !!isOutlier
      };
    });
  }, [records, fileKey]);

  useEffect(() => {
    if (!selectedReport) { return; }
    
    let unmounted = false;

    // Fetch Full Report & View count
    const isStubReport = selectedReport.id.startsWith('stub-');
    if (!isStubReport) {
      if (dashboardFacade.getFullReport) {
        dashboardFacade.getFullReport(selectedReport.id).then((data) => {
          if (!unmounted) {
            setFullReportData(data);
            setIsLoadingDetail(false);
          }
        }).catch(() => { if (!unmounted) setIsLoadingDetail(false); });
      } else {
        setIsLoadingDetail(false);
      }

      const trackView = () => {
        fetch('/api/report-view', { method: 'POST', body: JSON.stringify({ reportId: selectedReport.id, userEmail: user?.email }) }).catch(() => {});
      };

      if (user) {
        user.getIdTokenResult().then(idTokenResult => {
          if (!idTokenResult.claims.admin) trackView();
        }).catch(() => trackView());
      } else {
        trackView();
      }
    } else {
      if (dashboardFacade.getFullReportByApartmentName) {
        dashboardFacade.getFullReportByApartmentName(selectedReport.apartmentName).then((data) => {
          if (!unmounted) {
            setFullReportData(data);
            setIsLoadingDetail(false);
          }
        }).catch(() => { if (!unmounted) setIsLoadingDetail(false); });
      }
    }
    
    return () => { unmounted = true; };
  }, [selectedReport, sheetApartments, nameMapping, txSummaryData, user]);

  const resolvedReport = useMemo(() => {
    if (!selectedReport) return null;
    const raw = fullReportData || selectedReport;
    const fallback = Object.values(sheetApartments).flat().find(a => isSameApartment(a.name, raw.apartmentName, nameMapping)) as any;
    
    // Find location scores dynamically from public/data/location-scores.json
    const matchKey = findTxKey(raw.apartmentName, locationScores, nameMapping);
    const locScore = matchKey ? locationScores[matchKey] : {};

    const mergedMetrics = { ...fallback, ...locScore };
    if (raw.metrics) {
      for (const [k, v] of Object.entries(raw.metrics)) {
        if (v !== undefined && v !== null && v !== '') {
          // Strongly protect Categories maps (restaurantCategories, academyCategories)
          if (k.endsWith('Categories')) {
            const hasExisting = mergedMetrics[k] && typeof mergedMetrics[k] === 'object' && Object.keys(mergedMetrics[k]).length > 0;
            const isNewValid = v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;
            if (hasExisting && !isNewValid) {
              continue; // Do not overwrite populated locScore categories with empty/invalid values
            }
          }
          // If v is an empty object (like empty categories/schools), do not overwrite the populated values
          if (typeof v === 'object' && v !== null && Object.keys(v).length === 0) {
            continue;
          }
          mergedMetrics[k] = v;
        }
      }
    }
    
    return { ...raw, metrics: mergedMetrics as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics };
  }, [selectedReport, fullReportData, sheetApartments, nameMapping, locationScores]);

  const aptTxSummary = useMemo(() => {
    if (!selectedReport) return undefined;
    const rawApt = Object.values(sheetApartments).flat().find(a => isSameApartment(a.name, selectedReport.apartmentName, nameMapping));
    const overrideKey = HARDCODED_MAPPING[normalizeAptName(selectedReport.apartmentName)];
    const rawTxKey = overrideKey || (rawApt as { txKey?: string })?.txKey || findTxKey(selectedReport.apartmentName, txSummaryData, nameMapping);
    const txKey = rawTxKey ? normalizeAptName(rawTxKey) : '';
    const fileKey = txKey || normalizeAptName(selectedReport.apartmentName);
    return txSummaryData[fileKey];
  }, [selectedReport, sheetApartments, nameMapping, txSummaryData]);

  return {
    txSummaryData,
    fullReportData,
    modalTransactions,
    isLoadingDetail,
    isTxLoading,
    resolvedReport,
    aptTxSummary,
    loadAllTransactions
  };
}
