import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR, { preload } from 'swr';
import { User } from 'firebase/auth';
import type { AptTxSummary, LocationScoreItem } from '@/lib/types/transaction';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import { normalizeAptName, findTxKey, isSameApartment, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import { DongApartment } from '@/lib/dong-apartments';
import type { ObjectiveMetrics } from '@/lib/types/scoutingReport';
import { BUILD_VERSION } from '@/lib/build-version';
import { logger } from '@/lib/services/logger';

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
  isOutlier?: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.ok ? res.json() : []);

const EMPTY_ARRAY: RawTransactionRecord[] = [];
const EMPTY_TX_ARRAY: TransactionRecord[] = [];

export interface UseApartmentDetailsReturn {
  txSummaryData: Record<string, AptTxSummary>;
  fullReportData: FieldReportData | null;
  modalTransactions: TransactionRecord[];
  isLoadingDetail: boolean;
  isTxLoading: boolean;
  resolvedReport: (FieldReportData & { metrics: ObjectiveMetrics }) | null;
  aptTxSummary: AptTxSummary | undefined;
  loadAllTransactions: () => void;
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
}

export function useApartmentDetails(
  selectedReport: FieldReportData | null,
  sheetApartments: Record<string, DongApartment[]>,
  nameMapping: Record<string, string> | undefined,
  user: User | null,
  txSummaryData: Record<string, AptTxSummary> = {},
  locationScores: Record<string, LocationScoreItem> = {}
): UseApartmentDetailsReturn {
  const [fullReportData, setFullReportData] = useState<FieldReportData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const flatApartments = useMemo(() => {
    if (!sheetApartments) return [];
    return Object.values(sheetApartments).flat();
  }, [sheetApartments]);

  const apartmentsMap = useMemo(() => {
    const map = new Map<string, DongApartment>();
    if (!sheetApartments) return map;
    Object.values(sheetApartments).flat().forEach(apt => {
      map.set(normalizeAptName(apt.name), apt);
    });
    return map;
  }, [sheetApartments]);


  const formatPriceEok = (priceMan: number) => {
    const eok = Math.floor(priceMan / 10000);
    const remainder = priceMan % 10000;
    if (eok === 0) return `${priceMan.toLocaleString()}만`;
    if (remainder === 0) return `${eok}억`;
    return `${eok}억${remainder.toLocaleString()}`;
  };

  const fileKey = useMemo(() => {
    if (!selectedReport) return null;
    const normalizedName = normalizeAptName(selectedReport.apartmentName);
    let rawApt = apartmentsMap.get(normalizedName) || null;
    if (!rawApt) {
      rawApt = flatApartments.find(a => isSameApartment(a.name, selectedReport.apartmentName, nameMapping, a.dong, selectedReport.dong)) || null;
    }
    const overrideKey = HARDCODED_MAPPING[normalizedName];
    const rawTxKey = overrideKey || (rawApt as { txKey?: string })?.txKey || findTxKey(selectedReport.apartmentName, txSummaryData, nameMapping, false, selectedReport.dong);
    const txKey = rawTxKey ? normalizeAptName(rawTxKey) : '';
    return txKey || normalizedName;
  }, [selectedReport, flatApartments, apartmentsMap, txSummaryData, nameMapping]);


  const [shouldFetchFull, setShouldFetchFull] = useState(false);

  useEffect(() => {
    if (!selectedReport) {
      setShouldFetchFull(false);
      return;
    }
    setShouldFetchFull(false); // Reset on new report selection
    
    const timer = setTimeout(() => {
      setShouldFetchFull(true);
    }, 250); // 250ms delay to balance transition performance and fast initial rendering
    
    return () => clearTimeout(timer);
  }, [selectedReport]);

  const loadAllTransactions = useCallback(() => {
    setShouldFetchFull(true);
  }, []);

  const buildId = BUILD_VERSION;

  // 1. 최근 15건 실거래 데이터 초고속 로드 (보통 2KB 미만)
  const { data: recentRecords, isLoading: isRecentLoading } = useSWR<RawTransactionRecord[]>(
    fileKey ? `/tx-data/${encodeURIComponent(fileKey)}-recent.json?v=${buildId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000,
    }
  );

  // 2. 전체 실거래 데이터 백그라운드 지연 로드 (용량 무관하게 UX 정체 없음)
  const { data: fullRecords, isLoading: isFullLoading } = useSWR<RawTransactionRecord[]>(
    fileKey && shouldFetchFull ? `/tx-data/${encodeURIComponent(fileKey)}.json?v=${buildId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000,
    }
  );

  const records = Array.isArray(fullRecords) ? fullRecords : (Array.isArray(recentRecords) ? recentRecords : EMPTY_ARRAY);
  const isTxLoading = isRecentLoading && !recentRecords; // 최근 데이터가 왔거나 이미 캐시가 있으면 로딩 해제

  const modalTransactions = useMemo(() => {
    if (!records || records.length === 0) return EMPTY_TX_ARRAY;

    return records.map((r: RawTransactionRecord, i) => {
      if (!r || typeof r !== 'object') {
        return {
          no: i + 1, sigungu: '', dong: '', aptName: fileKey || '',
          area: 0, areaPyeong: 0,
          contractYm: '', contractDay: '1',
          contractDate: '',
          price: 0, priceEok: '-',
          deposit: 0, monthlyRent: 0,
          floor: 0, buyer: '', seller: '', buildYear: 0, roadName: '',
          cancelDate: '', dealType: '',
          agentLocation: '', registrationDate: '-', housingType: '',
          reqGb: '', rnuYn: '',
          isOutlier: false,
        };
      }

      const isRent = r.dealType === '전세' || r.dealType === '월세';
      let eokStr = '';
      if (isRent) {
         eokStr = formatPriceEok(r.deposit || 0);
         if (r.dealType === '월세' && r.monthlyRent) eokStr += ` / ${r.monthlyRent}만`;
      } else {
         eokStr = formatPriceEok(r.price || 0);
      }

      return {
        no: i + 1, sigungu: '', dong: '', aptName: fileKey || '',
        area: r.area || 0, areaPyeong: r.areaPyeong || 0,
        contractYm: r.contractYm || '', contractDay: String(r.contractDay || '1'),
        contractDate: r.contractYm ? `${r.contractYm}${String(r.contractDay || '1').padStart(2, '0')}` : '',
        price: r.price || 0, priceEok: eokStr,
        deposit: r.deposit || 0, monthlyRent: r.monthlyRent || 0,
        floor: r.floor || 0, buyer: '', seller: '', buildYear: 0, roadName: '',
        cancelDate: r.cancelDate || '', dealType: r.dealType || '',
        agentLocation: '', registrationDate: '-', housingType: '',
        reqGb: r.reqGb || '', rnuYn: r.rnuYn || '',
        isOutlier: !!r.isOutlier
      };
    });
  }, [records, fileKey]);

  useEffect(() => {
    if (!selectedReport) { 
      setFullReportData(null);
      setIsLoadingDetail(false);
      return; 
    }
    
    setFullReportData(null);
    setIsLoadingDetail(!selectedReport.id.startsWith('stub-'));
    
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
        if (unmounted) return;
        fetch('/api/report-view', { method: 'POST', body: JSON.stringify({ reportId: selectedReport.id, userEmail: user?.email }) }).catch(() => {});
      };

      if (user) {
        user.getIdTokenResult().then(idTokenResult => {
          if (!unmounted && !idTokenResult.claims.admin) trackView();
        }).catch(() => {
          if (!unmounted) trackView();
        });
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
  }, [selectedReport, user]);

  const resolvedReport = useMemo(() => {
    if (!selectedReport) return null;
    const raw = fullReportData || selectedReport;
    const normalizedName = normalizeAptName(raw.apartmentName);
    let fallback = apartmentsMap.get(normalizedName) || null;
    if (!fallback) {
      fallback = flatApartments.find(a => isSameApartment(a.name, raw.apartmentName, nameMapping, a.dong, raw.dong)) || null;
    }
    
    // Find location scores dynamically from public/data/location-scores.json
    const matchKey = findTxKey(raw.apartmentName, locationScores, nameMapping, false, raw.dong);
    const locScore = (matchKey ? locationScores[matchKey] : {}) as LocationScoreItem;

    const mergedMetrics = { ...(fallback || {}), ...locScore } as Record<string, unknown>;
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
    
    return { ...raw, metrics: mergedMetrics as unknown as ObjectiveMetrics };
  }, [selectedReport, fullReportData, flatApartments, apartmentsMap, nameMapping, locationScores]);

  const aptTxSummary = useMemo(() => {
    if (!selectedReport) return undefined;
    const normalizedName = normalizeAptName(selectedReport.apartmentName);
    let rawApt = apartmentsMap.get(normalizedName) || null;
    if (!rawApt) {
      rawApt = flatApartments.find(a => isSameApartment(a.name, selectedReport.apartmentName, nameMapping, a.dong, selectedReport.dong)) || null;
    }
    const overrideKey = HARDCODED_MAPPING[normalizedName];
    const rawTxKey = overrideKey || (rawApt as { txKey?: string })?.txKey || findTxKey(selectedReport.apartmentName, txSummaryData, nameMapping, false, selectedReport.dong);
    const txKey = rawTxKey ? normalizeAptName(rawTxKey) : '';
    const fileKey = txKey || normalizedName;
    return txSummaryData[fileKey];
  }, [selectedReport, flatApartments, apartmentsMap, nameMapping, txSummaryData]);

  const preloadApartmentTx = useCallback((apartmentName: string, dong: string) => {
    if (!apartmentName) return;
    const normalizedName = normalizeAptName(apartmentName);
    let rawApt = apartmentsMap.get(normalizedName) || null;
    if (!rawApt) {
      rawApt = flatApartments.find(a => isSameApartment(a.name, apartmentName, nameMapping, a.dong, dong)) || null;
    }
    const overrideKey = HARDCODED_MAPPING[normalizedName];
    const rawTxKey = overrideKey || (rawApt as { txKey?: string })?.txKey || findTxKey(apartmentName, txSummaryData, nameMapping, false, dong);
    const txKey = rawTxKey ? normalizeAptName(rawTxKey) : '';
    const fileKey = txKey || normalizedName;

    if (fileKey) {
      const buildId = BUILD_VERSION;
      const recentUrl = `/tx-data/${encodeURIComponent(fileKey)}-recent.json?v=${buildId}`;
      const fullUrl = `/tx-data/${encodeURIComponent(fileKey)}.json?v=${buildId}`;
      
      try {
        preload(recentUrl, fetcher);
      } catch (e) {
        fetch(recentUrl).catch(() => {});
      }
      
      try {
        preload(fullUrl, fetcher);
      } catch (e) {
        fetch(fullUrl).catch(() => {});
      }
    }
  }, [flatApartments, apartmentsMap, txSummaryData, nameMapping]);

  return {
    txSummaryData,
    fullReportData,
    modalTransactions,
    isLoadingDetail,
    isTxLoading,
    resolvedReport,
    aptTxSummary,
    loadAllTransactions,
    preloadApartmentTx
  };
}
