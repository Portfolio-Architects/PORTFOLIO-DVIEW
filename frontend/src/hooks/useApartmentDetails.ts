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
  txSummaryData: Record<string, AptTxSummary> = {}
) {
  const [fullReportData, setFullReportData] = useState<FieldReportData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

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
    fileKey ? `/tx-data/${encodeURIComponent(fileKey)}.json` : null,
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
    return records.map((r, i) => {
      let eokStr = '';
      if (r.dealType === '전세' || r.dealType === '월세') {
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
        reqGb: r.reqGb || '', rnuYn: r.rnuYn || ''
      };
    });
  }, [records, fileKey]);

  useEffect(() => {
    if (!selectedReport) { return; }
    
    // Clear stale fullReportData from previous selection immediately
    setFullReportData(null);

    let unmounted = false;

    // Fetch Full Report & View count
    const isStubReport = selectedReport.id.startsWith('stub-');
    if (!isStubReport) {
      setIsLoadingDetail(true);
      dashboardFacade.getFullReport!(selectedReport.id).then((data) => {
        if (!unmounted) {
          setFullReportData(data);
          setIsLoadingDetail(false);
        }
      }).catch(() => { if (!unmounted) setIsLoadingDetail(false); });

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
        setIsLoadingDetail(true);
        dashboardFacade.getFullReportByApartmentName(selectedReport.apartmentName).then((data) => {
          if (!unmounted) {
            setFullReportData(data);
            setIsLoadingDetail(false);
          }
        }).catch(() => { if (!unmounted) setIsLoadingDetail(false); });
      } else {
        setFullReportData(null);
      }
    }
    
    return () => { unmounted = true; };
  }, [selectedReport, sheetApartments, nameMapping, txSummaryData, user]);

  const resolvedReport = useMemo(() => {
    if (!selectedReport) return null;
    const raw = fullReportData || selectedReport;
    const fallback = Object.values(sheetApartments).flat().find(a => isSameApartment(a.name, raw.apartmentName, nameMapping)) as any;
    
    const mergedMetrics = { ...fallback };
    if (raw.metrics) {
      for (const [k, v] of Object.entries(raw.metrics)) {
        if (v !== undefined && v !== null && v !== '') {
          mergedMetrics[k] = v;
        }
      }
    }
    
    return { ...raw, metrics: mergedMetrics as unknown as import('@/lib/types/scoutingReport').ObjectiveMetrics };
  }, [selectedReport, fullReportData, sheetApartments, nameMapping]);

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
    aptTxSummary
  };
}
