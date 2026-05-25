import React, { useState, useMemo } from 'react';
import { normalizeAptName, findTypeMapEntry } from '@/lib/utils/apartmentMapping';
import { useSettings } from '@/lib/contexts/SettingsContext';

interface TransactionRecord {
  dong: string;
  aptName: string;
  area: number;
  areaPyeong: number;
  contractYm: string;
  contractDay: string;
  price: number;
  priceEok: string;
  deposit?: number;
  monthlyRent?: number;
  floor: number;
  buildYear: number;
  dealType: string;
  reqGb?: string;
  rnuYn?: string;
}

interface TransactionSummaryMetricsProps {
  transactions: TransactionRecord[];
  apartmentName: string;
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
}

export function TransactionSummaryMetrics({ transactions, apartmentName, typeMap }: TransactionSummaryMetricsProps) {
  const { areaUnit } = useSettings();
  const [priceTypeFilter, setPriceTypeFilter] = useState<string>('ALL');
  const [showPriceHelp, setShowPriceHelp] = useState(false);
  const [periodDealType, setPeriodDealType] = useState<'sale' | 'jeonse'>('sale');

  const metrics = useMemo(() => {
    const now = new Date();
    
    // 1) 타입 필터 칩 목록 구성
    const byArea = new Map<string, { label: string; area: number }>();
    transactions.forEach(tx => {
      const key = String(tx.area);
      if (!byArea.has(key)) {
        const typeData = findTypeMapEntry(typeMap, tx.aptName, tx.area);
        const typeName = typeData ? (areaUnit === 'm2' ? typeData.typeM2 : (typeData.typePyeong || typeData.typeM2)) : undefined;
        const label = typeName || (areaUnit === 'm2' ? `${tx.area}m²` : `${tx.areaPyeong}평`);
        byArea.set(key, { label, area: tx.area });
      }
    });

    const typeFilters = [
      { key: 'ALL', label: '단지 전체', area: 0 },
      ...Array.from(byArea.values())
        .sort((a, b) => {
          const numA = parseInt(a.label.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.label.match(/\d+/)?.[0] || '0');
          if (numA !== numB) return numA - numB;
          return a.label.localeCompare(b.label);
        })
        .map(c => ({ key: String(c.area), label: c.label, area: c.area }))
    ];

    // 2) 기간별 평균 산출
    const periods = [
      { key: '1M', label: '1개월', months: 1 },
      { key: '3M', label: '3개월', months: 3 },
      { key: '6M', label: '6개월', months: 6 },
      { key: '1Y', label: '1년', months: 12 },
      { key: '3Y', label: '3년', months: 36 },
      { key: '5Y', label: '5년', months: 60 },
      { key: '10Y', label: '10년', months: 120 },
      { key: 'ALL', label: '전체', months: 9999 },
    ];

    const getTxDate = (tx: TransactionRecord) => {
      const y = parseInt(tx.contractYm.slice(0, 4));
      const m = parseInt(tx.contractYm.slice(4, 6));
      const d = parseInt(tx.contractDay) || 1;
      return new Date(y, m - 1, d);
    };

    const periodTransactions = transactions.filter(tx => {
      if (periodDealType === 'sale' && (tx.dealType === '전세' || tx.dealType === '월세')) return false;
      if (periodDealType === 'jeonse' && tx.dealType !== '전세' && tx.dealType !== '월세') return false;
      return true;
    });

    const baseTx = priceTypeFilter === 'ALL'
      ? periodTransactions
      : periodTransactions.filter(tx => String(tx.area) === priceTypeFilter);

    const getTxSupplyPyeong = (tx: TransactionRecord) => {
      const typeData = findTypeMapEntry(typeMap, tx.aptName, tx.area);
      if (typeData?.typeM2) {
        const supplyM2Match = typeData.typeM2.match(/\d+(\.\d+)?/);
        if (supplyM2Match) return parseFloat(supplyM2Match[0]) * 0.3025;
      }
      return tx.area * 0.3025 * 1.33; 
    };

    const formatEok = (priceMan: number) => {
      if (priceMan >= 10000) {
        const eok = Math.floor(priceMan / 10000);
        const rem = Math.round(priceMan % 10000);
        return `${eok}억${rem > 0 ? rem.toLocaleString() : ''}`;
      }
      return `${Math.round(priceMan).toLocaleString()}만`;
    };

    const overallAvgPrice = baseTx.length > 0 ? baseTx.reduce((s, t) => s + t.price, 0) / baseTx.length : 0;
    const sortedBaseTx = [...baseTx].sort((a, b) => getTxDate(b).getTime() - getTxDate(a).getTime());
    const fallbackTx = sortedBaseTx.length > 0 ? sortedBaseTx[0] : null;

    const periodData = periods.map(p => {
      const cutoffDate = new Date(now.getFullYear(), now.getMonth() - p.months, now.getDate());
      const filtered = baseTx.filter(tx => p.months >= 9999 || getTxDate(tx) >= cutoffDate);
      
      let rawAvgPrice = 0;
      let perPyeong = 0;
      let count = filtered.length;

      if (filtered.length > 0) {
        rawAvgPrice = filtered.reduce((s, t) => s + t.price, 0) / filtered.length;
        perPyeong = Math.round(filtered.reduce((s, tx) => s + (tx.price / getTxSupplyPyeong(tx)), 0) / filtered.length);
      } else if (fallbackTx) {
        rawAvgPrice = fallbackTx.price;
        perPyeong = Math.round(fallbackTx.price / getTxSupplyPyeong(fallbackTx));
        count = 0;
      }

      const avgPrice = Math.round(rawAvgPrice / 100) * 100;
      const trendPct = overallAvgPrice > 0 && p.months < 9999 
        ? ((avgPrice - overallAvgPrice) / overallAvgPrice * 100) 
        : null;

      return {
        ...p,
        count,
        avgPrice,
        avgPriceEok: formatEok(avgPrice),
        perPyeong,
        perPyeongEok: formatEok(perPyeong),
        trendPct,
      };
    }).filter(p => p.count > 0 || p.avgPrice > 0);

    // 3) 갭투자 필요자금 및 전세가율 계산 (최근 6개월 평균 기준, 거래 부족시 전체 기준)
    const filteredSales = baseTx.filter(tx => tx.dealType !== '전세' && tx.dealType !== '월세');
    const filteredJeonses = baseTx.filter(tx => tx.dealType === '전세');

    const getAvgForGap = (txs: TransactionRecord[]) => {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      const recent = txs.filter(tx => getTxDate(tx) >= sixMonthsAgo);
      const targetList = recent.length > 0 ? recent : txs;
      return targetList.length > 0 ? targetList.reduce((sum, tx) => sum + tx.price, 0) / targetList.length : 0;
    };

    const avgSalePrice = getAvgForGap(filteredSales);
    const avgJeonsePrice = getAvgForGap(filteredJeonses);
    const gapPrice = avgSalePrice > 0 && avgJeonsePrice > 0 ? (avgSalePrice - avgJeonsePrice) : 0;
    const jeonseRatio = avgSalePrice > 0 && avgJeonsePrice > 0 ? (avgJeonsePrice / avgSalePrice) * 100 : 0;

    const gapPriceEok = gapPrice > 0 ? formatEok(Math.round(gapPrice)) : null;

    return { typeFilters, periodData, avgSalePrice, avgJeonsePrice, gapPriceEok, jeonseRatio };
  }, [transactions, apartmentName, typeMap, areaUnit, priceTypeFilter, periodDealType]);

  if (transactions.length === 0 || metrics.periodData.length === 0) return null;

  return (
    <div className="bg-surface w-full px-4 md:px-10 pb-6 border-b border-border">
      <div className="pt-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap w-full">
          <div className="flex items-center gap-2 justify-between w-full sm:w-auto sm:justify-start">
            <h5 className="text-[16px] md:text-[18px] font-bold text-secondary flex items-center gap-1.5">기간별 평균가격
              <button
                onClick={(e) => { e.stopPropagation(); setShowPriceHelp((prev) => !prev); }}
                className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-toss-gray hover:bg-[#8b95a1] text-[10px] md:text-[11px] font-extrabold text-surface inline-flex items-center justify-center transition-colors leading-none flex-shrink-0"
                aria-label="기준 설명"
              >?</button>
            </h5>
            <div className="bg-body p-1 rounded-lg flex items-center shadow-inner ml-2">
              <button onClick={() => setPeriodDealType('sale')} className={`px-3.5 py-1.5 rounded-md text-[13px] md:text-[14px] font-bold transition-all ${periodDealType === 'sale' ? 'bg-surface text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-tertiary hover:text-secondary'}`}>매매</button>
              <button onClick={() => setPeriodDealType('jeonse')} className={`px-3.5 py-1.5 rounded-md text-[13px] md:text-[14px] font-bold transition-all ${periodDealType === 'jeonse' ? 'bg-surface text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-tertiary hover:text-secondary'}`}>전월세</button>
            </div>
          </div>
          {showPriceHelp && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setShowPriceHelp(false)} />
              <div className="absolute left-4 top-12 z-[9999] w-[260px] bg-[#1e293b] text-surface text-[11px] leading-relaxed rounded-xl px-4 py-3 shadow-2xl">
                <div className="font-bold mb-1.5">📊 기간별 평균가격이란?</div>
                <p className="text-surface/80">각 기간 내 실거래된 모든 자료의 <span className="text-surface font-bold">산술 평균</span>입니다.</p>
                <p className="text-surface/80 mt-1">100만 원 단위로 반올림하여 표시합니다.</p>
                <p className="text-surface/50 mt-1.5 text-[10px]">예: "1개월" = 최근 1개월간 거래된 가격의 평균</p>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto custom-scrollbar pb-3 -mx-1 px-1">
          {metrics.typeFilters.map(f => {
            const isActive = priceTypeFilter === f.key;
            return (
              <button key={f.key} onClick={() => setPriceTypeFilter(f.key)}
                className={`shrink-0 px-[18px] py-[7.5px] rounded-[10px] text-[13px] md:text-[13.5px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-surface shadow-sm'
                    : 'bg-body text-tertiary hover:bg-[#e5e8eb]'
                }`}
              >{f.label}</button>
            );
          })}
        </div>

        {/* 갭투자 및 전세가율 요약 카드 (선택된 평형 필터 대응) */}
        {metrics.avgSalePrice > 0 && metrics.avgJeonsePrice > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5 mt-3">
            <div className="bg-body border border-border/80 rounded-2xl p-4.5 flex items-center justify-between shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-bold text-tertiary">실투자금 (매매-전세 갭)</span>
                <span className="text-[11px] text-tertiary font-medium">최근 6개월 평균 실거래 기준</span>
              </div>
              <div className="text-right">
                <span className="text-[18px] font-black text-toss-blue tabular-nums">{metrics.gapPriceEok}</span>
                <span className="text-[12px] font-bold text-secondary ml-0.5">필요</span>
              </div>
            </div>
            <div className="bg-body border border-border/80 rounded-2xl p-4.5 flex items-center justify-between shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-bold text-tertiary">실거래 전세가율</span>
                <span className="text-[11px] text-tertiary font-medium">매매 대비 전세 가격 비율</span>
              </div>
              <div className="text-right">
                <span className="text-[18px] font-black text-[#00d29d] tabular-nums">{metrics.jeonseRatio.toFixed(1)}%</span>
                <span className="text-[12px] font-bold text-secondary ml-0.5">기록</span>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar -mx-4 md:-mx-10 px-4 md:px-10 mt-1">
          <table className="w-full text-sm min-w-[600px] border-t border-body">
            <thead>
              <tr className="border-b border-border text-tertiary text-[13px] md:text-[14px] font-bold bg-body">
                <th className="py-3 px-2 text-center w-[56px] min-w-[56px] shrink-0">구분</th>
                {metrics.periodData.map(p => (
                  <th key={`th-${p.key}`} className="py-3 px-3 text-center whitespace-nowrap">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-body hover:bg-[#f8faff] transition-colors">
                <td className="py-3.5 px-2 text-[13px] md:text-[14px] font-bold text-secondary bg-body/50 align-middle">
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span>평균</span>
                    <span>가격</span>
                  </div>
                </td>
                {metrics.periodData.map(p => (
                  <td key={`price-${p.key}`} className="py-3.5 px-3 text-center whitespace-nowrap">
                    <span className="text-[14px] md:text-[16px] font-bold md:font-extrabold text-primary tracking-tight">{p.avgPriceEok}</span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-body hover:bg-[#f8faff] transition-colors">
                <td className="py-3.5 px-2 text-[13px] md:text-[14px] font-bold text-secondary bg-body/50 align-middle">
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span>평당</span>
                    <span>가격</span>
                  </div>
                </td>
                {metrics.periodData.map(p => (
                  <td key={`perpyeong-${p.key}`} className="py-3.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-0.5 whitespace-nowrap">
                      <span className="text-[13px] md:text-[14px] font-bold text-secondary tracking-tight">{p.perPyeongEok}</span>
                      <span className="text-[11px] md:text-[12px] text-tertiary font-medium tracking-tight">/평</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-body hover:bg-[#f8faff] transition-colors">
                <td className="py-3.5 px-2 text-[13px] md:text-[14px] font-bold text-secondary bg-body/50 align-middle">
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span>거래</span>
                    <span>건수</span>
                  </div>
                </td>
                {metrics.periodData.map(p => (
                  <td key={`count-${p.key}`} className="py-3.5 px-3 text-center whitespace-nowrap">
                    <span className="text-[13px] md:text-[14px] font-medium text-tertiary">{p.count}건</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
