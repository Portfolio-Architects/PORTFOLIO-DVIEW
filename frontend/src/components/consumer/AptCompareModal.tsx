'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Building2, TrendingUp, Sparkles, Award, Star, School, TreePine, MapPin, Check } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { findTxKey, normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';

interface AptCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAptName?: string;
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  fieldReportsMap: Map<string, FieldReportData>;
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
}

interface TxDataPoint {
  contractYm: string;
  price: number;
  dealType: string;
  deposit?: number;
  areaPyeong: number;
}

// Fallback metrics estimator for apartments without Firestore scouting reports
function getEffectiveMetrics(apt: DongApartment, report: FieldReportData | undefined) {
  if (report?.metrics) {
    return {
      brand: report.metrics.brand || apt.brand || '',
      householdCount: report.metrics.householdCount || apt.householdCount || 800,
      parkingPerHousehold: report.metrics.parkingPerHousehold || (report.sections?.specs?.parkingRatio ? parseFloat(report.sections.specs.parkingRatio) : 1.25),
      yearBuilt: report.metrics.yearBuilt || (apt.yearBuilt ? parseInt(apt.yearBuilt.substring(0, 4)) : 2018),
      distanceToSubway: report.metrics.distanceToSubway || 2000,
      distanceToElementary: report.metrics.distanceToElementary || 350,
      distanceToPark: report.metrics.distanceToPark || 500,
      distanceToStarbucks: report.metrics.distanceToStarbucks || 800,
    };
  }

  // Estimate based on brand, dong, and basic info
  const brand = apt.brand || '';
  const householdCount = apt.householdCount || 800;
  const yearBuilt = apt.yearBuilt ? parseInt(apt.yearBuilt.substring(0, 4)) : 2018;
  const parkingPerHousehold = 1.25; // default fallback

  // Approximate distance based on dong
  let distanceToSubway = 2000;
  let distanceToElementary = 350;
  let distanceToPark = 500;
  let distanceToStarbucks = 800;

  const dong = apt.dong || '';
  if (dong.includes('오산동')) {
    distanceToSubway = 500; // Close to Dongtan Station
    distanceToPark = 400; // 여울공원
    distanceToStarbucks = 400;
    distanceToElementary = 300;
  } else if (dong.includes('송동') || dong.includes('산척동')) {
    distanceToSubway = 2500;
    distanceToPark = 250; // 동탄호수공원
    distanceToStarbucks = 450;
    distanceToElementary = 400;
  } else if (dong.includes('청계동')) {
    distanceToSubway = 1200; // 시범단지
    distanceToPark = 350; // 청계중앙공원
    distanceToStarbucks = 300;
    distanceToElementary = 200;
  } else if (dong.includes('영천동')) {
    distanceToSubway = 1800;
    distanceToPark = 500;
    distanceToStarbucks = 500;
    distanceToElementary = 300;
  } else if (dong.includes('목동')) {
    distanceToSubway = 2800;
    distanceToPark = 400;
    distanceToStarbucks = 600;
    distanceToElementary = 250;
  } else if (dong.includes('방교동') || dong.includes('금곡동')) {
    distanceToSubway = 3000;
    distanceToPark = 800;
    distanceToStarbucks = 1200;
    distanceToElementary = 600;
  }

  return {
    brand,
    householdCount,
    parkingPerHousehold,
    yearBuilt,
    distanceToElementary,
    distanceToSubway,
    distanceToPark,
    distanceToStarbucks,
  };
}

export default function AptCompareModal({
  isOpen,
  onClose,
  initialAptName,
  sheetApartments,
  txSummaryData,
  nameMapping,
  fieldReportsMap,
  typeMap,
}: AptCompareModalProps) {
  // Flatten list of all apartments
  const allApartments = useMemo(() => {
    return Object.values(sheetApartments).flat();
  }, [sheetApartments]);

  // Selected apartment states
  const [apt1, setApt1] = useState<DongApartment | null>(null);
  const [apt2, setApt2] = useState<DongApartment | null>(null);

  // Search input & focus states
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [isFocused1, setIsFocused1] = useState(false);
  const [isFocused2, setIsFocused2] = useState(false);

  // Transaction data states
  const [txData1, setTxData1] = useState<TxDataPoint[]>([]);
  const [txData2, setTxData2] = useState<TxDataPoint[]>([]);
  const [isTxLoading1, setIsTxLoading1] = useState(false);
  const [isTxLoading2, setIsTxLoading2] = useState(false);

  // Chart type: 'sale' (매매) vs 'jeonse' (전세)
  const [chartType, setChartType] = useState<'sale' | 'jeonse'>('sale');

  // Input refs for clicking outside
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef1 = useRef<HTMLDivElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);

  // Set initial apartment if passed
  useEffect(() => {
    if (initialAptName && isOpen) {
      const matched = allApartments.find(a => normalizeAptName(a.name) === normalizeAptName(initialAptName));
      if (matched) {
        setApt1(matched);
        setSearchQuery1(getDisplayAptName(matched.name));
      }
    }
  }, [initialAptName, allApartments, isOpen]);

  // Handle clicking outside of dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef1.current && !dropdownRef1.current.contains(event.target as Node)) {
        setIsFocused1(false);
      }
      if (dropdownRef2.current && !dropdownRef2.current.contains(event.target as Node)) {
        setIsFocused2(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch transactions for Apartment 1
  useEffect(() => {
    if (!apt1) {
      setTxData1([]);
      return;
    }
    setIsTxLoading1(true);
    const txKey = findTxKey(apt1.name, txSummaryData, nameMapping) || apt1.name;
    fetch(`/tx-data/${encodeURIComponent(txKey)}.json`)
      .then(res => {
        if (!res.ok) throw new Error('No data');
        return res.json();
      })
      .then(data => setTxData1(data))
      .catch(() => setTxData1([]))
      .finally(() => setIsTxLoading1(false));
  }, [apt1, txSummaryData, nameMapping]);

  // Fetch transactions for Apartment 2
  useEffect(() => {
    if (!apt2) {
      setTxData2([]);
      return;
    }
    setIsTxLoading2(true);
    const txKey = findTxKey(apt2.name, txSummaryData, nameMapping) || apt2.name;
    fetch(`/tx-data/${encodeURIComponent(txKey)}.json`)
      .then(res => {
        if (!res.ok) throw new Error('No data');
        return res.json();
      })
      .then(data => setTxData2(data))
      .catch(() => setTxData2([]))
      .finally(() => setIsTxLoading2(false));
  }, [apt2, txSummaryData, nameMapping]);

  // Filter lists for Autocomplete
  const filteredApts1 = useMemo(() => {
    if (!searchQuery1.trim()) return allApartments.slice(0, 15);
    const query = normalizeAptName(searchQuery1);
    return allApartments.filter(a => normalizeAptName(a.name).includes(query) || a.dong.includes(searchQuery1)).slice(0, 15);
  }, [searchQuery1, allApartments]);

  const filteredApts2 = useMemo(() => {
    if (!searchQuery2.trim()) return allApartments.slice(0, 15);
    const query = normalizeAptName(searchQuery2);
    return allApartments.filter(a => normalizeAptName(a.name).includes(query) || a.dong.includes(searchQuery2)).slice(0, 15);
  }, [searchQuery2, allApartments]);

  // Retrieve metrics & summary stats for compared apartments
  const metrics1 = useMemo(() => {
    if (!apt1) return null;
    const report = fieldReportsMap.get(apt1.name);
    const effective = getEffectiveMetrics(apt1, report);
    const txKey = findTxKey(apt1.name, txSummaryData, nameMapping);
    const summary = txKey ? txSummaryData[txKey] : null;

    const avg3MPriceVal = summary ? (summary.avg3MPrice || summary.avg1MPrice || summary.latestPrice || 0) : 0;
    const avg3MRentVal = summary ? (summary.avg3MRentDeposit || summary.avg1MRentDeposit || summary.latestRentDeposit || 0) : 0;
    const jeonseRatioVal = avg3MPriceVal > 0 && avg3MRentVal > 0 ? (avg3MRentVal / avg3MPriceVal) * 100 : 0;

    return {
      ...effective,
      avg3MPrice: avg3MPriceVal,
      avg3MRent: avg3MRentVal,
      jeonseRatio: jeonseRatioVal,
    };
  }, [apt1, fieldReportsMap, txSummaryData, nameMapping]);

  const metrics2 = useMemo(() => {
    if (!apt2) return null;
    const report = fieldReportsMap.get(apt2.name);
    const effective = getEffectiveMetrics(apt2, report);
    const txKey = findTxKey(apt2.name, txSummaryData, nameMapping);
    const summary = txKey ? txSummaryData[txKey] : null;

    const avg3MPriceVal = summary ? (summary.avg3MPrice || summary.avg1MPrice || summary.latestPrice || 0) : 0;
    const avg3MRentVal = summary ? (summary.avg3MRentDeposit || summary.avg1MRentDeposit || summary.latestRentDeposit || 0) : 0;
    const jeonseRatioVal = avg3MPriceVal > 0 && avg3MRentVal > 0 ? (avg3MRentVal / avg3MPriceVal) * 100 : 0;

    return {
      ...effective,
      avg3MPrice: avg3MPriceVal,
      avg3MRent: avg3MRentVal,
      jeonseRatio: jeonseRatioVal,
    };
  }, [apt2, fieldReportsMap, txSummaryData, nameMapping]);

  // Determine comparison highlight wins (true means Apt1 wins, false means Apt2 wins, null means tie or N/A)
  const wins = useMemo(() => {
    if (!metrics1 || !metrics2) return {} as Record<string, boolean | null>;

    const compare = (val1: number, val2: number, lowerIsBetter = false) => {
      if (val1 === val2) return null;
      return lowerIsBetter ? val1 < val2 : val1 > val2;
    };

    return {
      subway: compare(metrics1.distanceToSubway, metrics2.distanceToSubway, true),
      elementary: compare(metrics1.distanceToElementary, metrics2.distanceToElementary, true),
      park: compare(metrics1.distanceToPark, metrics2.distanceToPark, true),
      starbucks: compare(metrics1.distanceToStarbucks, metrics2.distanceToStarbucks, true),
      households: compare(metrics1.householdCount, metrics2.householdCount),
      year: compare(metrics1.yearBuilt, metrics2.yearBuilt),
      parking: compare(metrics1.parkingPerHousehold, metrics2.parkingPerHousehold),
      price: compare(metrics1.avg3MPrice, metrics2.avg3MPrice), // Higher valuation
      rent: compare(metrics1.avg3MRent, metrics2.avg3MRent),     // Higher rent
      ratio: compare(metrics1.jeonseRatio, metrics2.jeonseRatio), // Higher jeonse ratio
    };
  }, [metrics1, metrics2]);

  // Aggregate monthly transaction averages for the compared charts
  const combinedChartData = useMemo(() => {
    if ((txData1.length === 0 && txData2.length === 0) || (!apt1 && !apt2)) return [];

    const groupDataByMonth = (txs: TxDataPoint[]) => {
      const grouped: Record<string, number[]> = {};
      txs.forEach(tx => {
        if (!tx.contractYm) return;
        const yy = tx.contractYm.substring(2, 4);
        const mm = tx.contractYm.substring(4, 6);
        const key = `${yy}.${mm}`;

        const isMatch = chartType === 'jeonse' ? tx.dealType === '전세' : (tx.dealType !== '전세' && tx.dealType !== '월세');
        const value = chartType === 'jeonse' ? (tx.deposit || tx.price || 0) : (tx.price || 0);

        if (isMatch && value > 0) {
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(value / 10000); // 억 unit
        }
      });

      const averages: Record<string, number> = {};
      Object.entries(grouped).forEach(([key, prices]) => {
        averages[key] = prices.reduce((a, b) => a + b, 0) / prices.length;
      });
      return averages;
    };

    const avgs1 = groupDataByMonth(txData1);
    const avgs2 = groupDataByMonth(txData2);

    // Get union of all months in the last 24 months (e.g. from 24.06 to 26.05) or simply sorted months from data
    const allMonths = Array.from(new Set([...Object.keys(avgs1), ...Object.keys(avgs2)])).sort();

    // Limit to last 24 months for readability if list is too long
    const timelineMonths = allMonths.slice(-24);

    // Interpolation (Carry-forward)
    let lastA1: number | null = null;
    let lastA2: number | null = null;

    return timelineMonths.map(month => {
      const raw1 = avgs1[month];
      const raw2 = avgs2[month];

      if (raw1 !== undefined) lastA1 = raw1;
      if (raw2 !== undefined) lastA2 = raw2;

      return {
        month,
        [apt1 ? getDisplayAptName(apt1.name) : '단지 1']: lastA1 !== null ? Math.round(lastA1 * 100) / 100 : null,
        [apt2 ? getDisplayAptName(apt2.name) : '단지 2']: lastA2 !== null ? Math.round(lastA2 * 100) / 100 : null,
      };
    });
  }, [txData1, txData2, chartType, apt1, apt2]);

  if (!isOpen) return null;

  const displayPrice = (val: number) => {
    if (!val) return '-';
    const eok = Math.floor(val / 10000);
    const man = val % 10000;
    if (eok > 0) {
      return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
    }
    return `${man.toLocaleString()}`;
  };

  const getCompareClass = (isApt1: boolean, winValue: boolean | null) => {
    if (winValue === null) return 'border-border/50 text-secondary bg-surface/30';
    const isWinner = isApt1 ? winValue === true : winValue === false;
    return isWinner
      ? 'border-[#00d29d] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shadow-[0_0_0_1px_#00d29d_inset]'
      : 'border-border/30 text-tertiary opacity-70 bg-surface/10';
  };

  const apt1Label = apt1 ? getDisplayAptName(apt1.name) : '단지 1';
  const apt2Label = apt2 ? getDisplayAptName(apt2.name) : '단지 2';

  return (
    <div className="fixed inset-0 z-[12000] flex flex-col justify-end md:justify-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div
        ref={containerRef}
        className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-[1150px] h-[92vh] md:h-auto md:max-h-[90vh] rounded-t-[24px] md:rounded-[24px] flex flex-col shadow-2xl transition-transform duration-300 slide-in-from-bottom overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/40 px-6 py-4 shrink-0 bg-surface/50">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-black text-primary flex items-center gap-1.5">
              <span>⚖️</span>
              <span>1:1 아파트 단지 비교 분석기</span>
            </h2>
            <p className="text-[12px] font-medium text-tertiary">
              두 단지의 입지 조건, 단지 규모, 실거래 트렌드를 직관적으로 대조 비교합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-body hover:bg-border/30 text-secondary transition-all"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>

        {/* Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* Selectors Section */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center bg-body/50 p-4 rounded-2xl border border-border/20">
            {/* Apt 1 Input */}
            <div className="md:col-span-3 relative" ref={dropdownRef1}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
                <input
                  type="text"
                  placeholder="1번 단지 검색..."
                  value={searchQuery1}
                  onChange={(e) => {
                    setSearchQuery1(e.target.value);
                    if (apt1) setApt1(null);
                  }}
                  onFocus={() => setIsFocused1(true)}
                  className="w-full bg-surface border border-border/40 focus:border-[#00d29d] rounded-xl py-2 pl-9 pr-8 text-[13.5px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
                />
                {searchQuery1 && (
                  <button
                    onClick={() => {
                      setSearchQuery1('');
                      setApt1(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {isFocused1 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border shadow-xl rounded-xl z-50 overflow-y-auto max-h-[200px] py-1">
                  {filteredApts1.length > 0 ? (
                    filteredApts1.map(apt => (
                      <button
                        key={apt.name}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setApt1(apt);
                          setSearchQuery1(getDisplayAptName(apt.name));
                          setIsFocused1(false);
                        }}
                        className="w-full text-left px-3 py-2 text-[12.5px] font-bold hover:bg-body text-secondary flex items-center justify-between"
                      >
                        <span>{getDisplayAptName(apt.name)}</span>
                        <span className="text-[10px] text-tertiary px-1.5 py-0.5 bg-body rounded">{apt.dong}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-[12px] font-bold text-tertiary text-center">검색 결과가 없습니다</div>
                  )}
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="md:col-span-1 flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d29d] to-emerald-500 text-white font-black text-[12px] flex items-center justify-center shadow-md select-none shrink-0">
                VS
              </span>
            </div>

            {/* Apt 2 Input */}
            <div className="md:col-span-3 relative" ref={dropdownRef2}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
                <input
                  type="text"
                  placeholder="2번 단지 검색..."
                  value={searchQuery2}
                  onChange={(e) => {
                    setSearchQuery2(e.target.value);
                    if (apt2) setApt2(null);
                  }}
                  onFocus={() => setIsFocused2(true)}
                  className="w-full bg-surface border border-border/40 focus:border-[#00d29d] rounded-xl py-2 pl-9 pr-8 text-[13.5px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
                />
                {searchQuery2 && (
                  <button
                    onClick={() => {
                      setSearchQuery2('');
                      setApt2(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {isFocused2 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border shadow-xl rounded-xl z-50 overflow-y-auto max-h-[200px] py-1">
                  {filteredApts2.length > 0 ? (
                    filteredApts2.map(apt => (
                      <button
                        key={apt.name}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setApt2(apt);
                          setSearchQuery2(getDisplayAptName(apt.name));
                          setIsFocused2(false);
                        }}
                        className="w-full text-left px-3 py-2 text-[12.5px] font-bold hover:bg-body text-secondary flex items-center justify-between"
                      >
                        <span>{getDisplayAptName(apt.name)}</span>
                        <span className="text-[10px] text-tertiary px-1.5 py-0.5 bg-body rounded">{apt.dong}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-[12px] font-bold text-tertiary text-center">검색 결과가 없습니다</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warning / Instruction when not selected */}
          {(!apt1 || !apt2) && (
            <div className="flex flex-col items-center justify-center p-8 bg-body/30 rounded-2xl border border-dashed border-border text-center">
              <Building2 className="w-10 h-10 text-tertiary/75 mb-3" />
              <p className="text-[14px] font-extrabold text-secondary">비교할 단지를 모두 선택해주세요</p>
              <p className="text-[11.5px] font-medium text-tertiary mt-1">상단 자동완성 드롭다운을 통해 두 단지를 선택하면 입지 가치와 차트 비교가 활성화됩니다.</p>
            </div>
          )}

          {/* Comparison Matrix Table */}
          {apt1 && apt2 && metrics1 && metrics2 && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5 px-1">
                <Award size={16} className="text-[#00d29d]" />
                <span>1:1 지표 매트릭스 비교</span>
              </h3>

              <div className="overflow-hidden border border-border/30 rounded-2xl shadow-sm bg-surface/40">
                {/* Header row */}
                <div className="grid grid-cols-3 bg-body/50 border-b border-border/30 px-4 py-3 text-[11px] font-extrabold text-tertiary tracking-wider uppercase">
                  <div>비교 평가 지표</div>
                  <div className="text-center truncate">{apt1Label}</div>
                  <div className="text-center truncate">{apt2Label}</div>
                </div>

                {/* --- Section: 입지 인프라 --- */}
                <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
                  <MapPin size={12} className="text-[#0284c7]" /> 입지 인프라 (역세권·학세권)
                </div>

                <div className="divide-y divide-border/20">
                  {/* GTX Distance */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">GTX-A / SRT역 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.subway)}`}>
                      {metrics1.distanceToSubway ? `${metrics1.distanceToSubway}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.subway)}`}>
                      {metrics2.distanceToSubway ? `${metrics2.distanceToSubway}m` : '-'}
                    </div>
                  </div>

                  {/* School Distance */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold flex items-center gap-1">
                      <span>초등학교 도보 통학 거리</span>
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.elementary)}`}>
                      {metrics1.distanceToElementary ? `${metrics1.distanceToElementary}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.elementary)}`}>
                      {metrics2.distanceToElementary ? `${metrics2.distanceToElementary}m` : '-'}
                    </div>
                  </div>

                  {/* Park Distance */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">공원 도보 통학 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.park)}`}>
                      {metrics1.distanceToPark ? `${metrics1.distanceToPark}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.park)}`}>
                      {metrics2.distanceToPark ? `${metrics2.distanceToPark}m` : '-'}
                    </div>
                  </div>

                  {/* Starbucks Distance */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">스타벅스 거리</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.starbucks)}`}>
                      {metrics1.distanceToStarbucks ? `${metrics1.distanceToStarbucks}m` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.starbucks)}`}>
                      {metrics2.distanceToStarbucks ? `${metrics2.distanceToStarbucks}m` : '-'}
                    </div>
                  </div>
                </div>

                {/* --- Section: 단지 스펙 --- */}
                <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-t border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
                  <Building2 size={12} className="text-[#db2777]" /> 단지 스펙 (규모·연식)
                </div>

                <div className="divide-y divide-border/20">
                  {/* Household Count */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">총 세대수</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.households)}`}>
                      {metrics1.householdCount ? `${metrics1.householdCount.toLocaleString()}세대` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.households)}`}>
                      {metrics2.householdCount ? `${metrics2.householdCount.toLocaleString()}세대` : '-'}
                    </div>
                  </div>

                  {/* Year Built */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">준공년도 (연식)</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.year)}`}>
                      {metrics1.yearBuilt ? `${metrics1.yearBuilt}년 (${new Date().getFullYear() - metrics1.yearBuilt}년차)` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.year)}`}>
                      {metrics2.yearBuilt ? `${metrics2.yearBuilt}년 (${new Date().getFullYear() - metrics2.yearBuilt}년차)` : '-'}
                    </div>
                  </div>

                  {/* Parking Per Household */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">세대당 주차대수</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.parking)}`}>
                      {metrics1.parkingPerHousehold ? `${metrics1.parkingPerHousehold.toFixed(2)}대` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.parking)}`}>
                      {metrics2.parkingPerHousehold ? `${metrics2.parkingPerHousehold.toFixed(2)}대` : '-'}
                    </div>
                  </div>

                  {/* Brand */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">건설사 브랜드</div>
                    <div className="mx-auto px-3 py-1 rounded-xl border border-border/50 text-center font-bold text-secondary bg-surface/30">
                      {metrics1.brand || '-'}
                    </div>
                    <div className="mx-auto px-3 py-1 rounded-xl border border-border/50 text-center font-bold text-secondary bg-surface/30">
                      {metrics2.brand || '-'}
                    </div>
                  </div>
                </div>

                {/* --- Section: 가치 및 시세 정보 --- */}
                <div className="bg-[#f8fafc]/30 dark:bg-zinc-950/20 px-4 py-2 border-b border-t border-border/30 text-[11.5px] font-extrabold text-secondary flex items-center gap-1">
                  <TrendingUp size={12} className="text-[#00d29d]" /> 가치 & 거래 정보 (최근 3M 기준)
                </div>

                <div className="divide-y divide-border/20">
                  {/* Average Price */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">평균 매매시세 (3M)</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.price)}`}>
                      {displayPrice(metrics1.avg3MPrice)}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.price)}`}>
                      {displayPrice(metrics2.avg3MPrice)}
                    </div>
                  </div>

                  {/* Average Rent */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">평균 전세보증금 (3M)</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.rent)}`}>
                      {displayPrice(metrics1.avg3MRent)}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.rent)}`}>
                      {displayPrice(metrics2.avg3MRent)}
                    </div>
                  </div>

                  {/* Jeonse Ratio */}
                  <div className="grid grid-cols-3 px-4 py-2.5 items-center text-[12.5px] font-medium">
                    <div className="text-secondary font-bold">평균 전세가율</div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(true, wins.ratio)}`}>
                      {metrics1.jeonseRatio ? `${metrics1.jeonseRatio.toFixed(1)}%` : '-'}
                    </div>
                    <div className={`mx-auto px-3 py-1 rounded-xl border text-center font-bold transition-all ${getCompareClass(false, wins.ratio)}`}>
                      {metrics2.jeonseRatio ? `${metrics2.jeonseRatio.toFixed(1)}%` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historical Price Trend Dual Chart */}
          {apt1 && apt2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                <h3 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-[#4196f7]" />
                  <span>실거래 시계열 가격 트렌드 (월별 평균 거래가)</span>
                </h3>
                
                {/* Sale / Rent Toggle */}
                <div className="flex bg-[#f2f4f6] dark:bg-zinc-800 p-0.5 rounded-xl border border-border/10 shrink-0">
                  <button
                    onClick={() => setChartType('sale')}
                    className={`px-3 py-1 rounded-[10px] text-[12px] font-bold transition-all cursor-pointer ${chartType === 'sale' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary'}`}
                  >
                    매매 가격
                  </button>
                  <button
                    onClick={() => setChartType('jeonse')}
                    className={`px-3 py-1 rounded-[10px] text-[12px] font-bold transition-all cursor-pointer ${chartType === 'jeonse' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary'}`}
                  >
                    전세 보증금
                  </button>
                </div>
              </div>

              <div className="w-full bg-surface/50 border border-border/20 rounded-2xl p-4 md:p-6 shadow-sm">
                {isTxLoading1 || isTxLoading2 ? (
                  <div className="w-full h-[320px] flex items-center justify-center">
                    <span className="text-[13px] font-bold text-tertiary animate-pulse">실거래 추이 데이터를 불러오는 중...</span>
                  </div>
                ) : combinedChartData.length > 0 ? (
                  <div className="w-full h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.2)" />
                        <XAxis
                          dataKey="month"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontWeight="bold"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          fontWeight="bold"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}억`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(30, 41, 59, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                          }}
                          labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          formatter={(value: any) => [`${value}억원`]}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Line
                          type="monotone"
                          dataKey={getDisplayAptName(apt1.name)}
                          stroke="#00d29d"
                          strokeWidth={2.5}
                          dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey={getDisplayAptName(apt2.name)}
                          stroke="#4196f7"
                          strokeWidth={2.5}
                          dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-full h-[320px] flex items-center justify-center text-center">
                    <p className="text-[12.5px] font-bold text-tertiary">시계열 거래 정보가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
