import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronDown, AlertTriangle, AlertCircle } from 'lucide-react';
import { useSettings } from '@/lib/contexts/SettingsContext';

export interface TransactionRecord {
  dong?: string;
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
  dealType?: string;
  reqGb?: string;
  rnuYn?: string;
  cancelDate?: string;
  isOutlier?: boolean;
}

interface TransactionTableProps {
  transactions: TransactionRecord[];
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  chartType: 'sale' | 'jeonse';
  normalizeAptName: (name: string) => string;
}

export function TransactionTable({
  transactions,
  typeMap,
  chartType,
  normalizeAptName
}: TransactionTableProps) {
  const { areaUnit } = useSettings();
  const [txSort, setTxSort] = useState<'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'>('date_desc');
  const [txFilterArea, setTxFilterArea] = useState<string>('ALL');
  const [txFilterDealType, setTxFilterDealType] = useState<string>('ALL');
  const [activeDropdown, setActiveDropdown] = useState<'sort' | 'area' | 'dealType' | null>(null);
  
  const INITIAL_DISPLAY_COUNT = 10;
  const [displayedCount, setDisplayedCount] = useState(INITIAL_DISPLAY_COUNT);

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(INITIAL_DISPLAY_COUNT);
  }, [txSort, txFilterArea, txFilterDealType, chartType]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!activeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      setActiveDropdown(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  // Derived filter options
  const { areaTypes, dealTypes } = useMemo(() => {
    const areas = new Set<number>();
    const deals = new Set<string>();
    transactions.forEach(t => {
      areas.add(t.area);
      if (t.dealType) deals.add(t.dealType);
    });
    return {
      areaTypes: Array.from(areas).sort((a, b) => a - b),
      dealTypes: Array.from(deals)
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 연동 차트에 따라 매매/전월세 기본 분류 필터링
      if (chartType === 'sale' && (tx.dealType === '전세' || tx.dealType === '월세')) return false;
      if (chartType === 'jeonse' && tx.dealType !== '전세' && tx.dealType !== '월세') return false;

      // 추가 필터링
      if (txFilterArea !== 'ALL' && tx.area !== Number(txFilterArea)) return false;
      if (txFilterDealType !== 'ALL' && tx.dealType !== txFilterDealType) return false;
      return true;
    });
  }, [transactions, chartType, txFilterArea, txFilterDealType]);

  const sortedFilteredTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const getP = (t: TransactionRecord) => (t.dealType === '전세' || t.dealType === '월세') ? (t.deposit || 0) : t.price;
      if (txSort === 'date_desc') {
        const da = a.contractYm + a.contractDay.padStart(2, '0');
        const db = b.contractYm + b.contractDay.padStart(2, '0');
        if (da !== db) return parseInt(db) - parseInt(da);
        return getP(b) - getP(a);
      }
      if (txSort === 'date_asc') {
        const da = a.contractYm + a.contractDay.padStart(2, '0');
        const db = b.contractYm + b.contractDay.padStart(2, '0');
        return parseInt(da) - parseInt(db);
      }
      if (txSort === 'price_desc') return getP(b) - getP(a);
      if (txSort === 'price_asc') return getP(a) - getP(b);
      return 0;
    });
  }, [filteredTransactions, txSort]);

  // '중개거래', '직거래' 등은 거래 방식이지 유형이 아님 — 사실상 매매
  const isSaleDealType = (dealType: string | undefined) =>
    !dealType || (dealType !== '전세' && dealType !== '월세');

  const getBadgeColorClasses = (dealType: string | undefined) => {
    if (!dealType || dealType === '-') return 'bg-toss-blue-light text-[#1b64da]'; // 매매 기본
    if (dealType === '전세') return 'bg-[#e6f4ea] text-[#0d652d]';
    if (dealType === '월세') return 'bg-[#fef0e6] text-[#c2410c]';
    // 중개거래, 직거래, 매매 등 모두 매매 계열
    return 'bg-toss-blue-light text-[#1b64da]';
  };

  const getDealTypeLabel = (dealType: string | undefined) => {
    if (!dealType || dealType === '-') return '매매';
    if (dealType === '전세' || dealType === '월세') return dealType;
    // 중개거래, 직거래 → 표시 라벨
    return dealType;
  };

  return (
    <div className="flex flex-col bg-surface rounded-2xl ring-1 ring-[#e5e8eb] overflow-hidden md:h-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 bg-surface border-b border-border w-full">
        <h4 className="text-[14px] font-bold text-secondary shrink-0">
          실거래가 <span className="text-toss-blue ml-1">{filteredTransactions.length}</span>건
        </h4>
        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto pb-0.5">
          {/* 면적 필터 */}
          <div className="relative flex-1 md:flex-none" onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'area' ? null : 'area'); }}>
            <button className="flex items-center justify-center md:justify-start gap-1 w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-[12px] font-bold text-secondary hover:bg-body transition-colors truncate">
              <span className="truncate">{txFilterArea === 'ALL' ? '전체 면적' : `${txFilterArea}m²`}</span>
              <ChevronDown size={14} className={`shrink-0 text-tertiary transition-transform ${activeDropdown === 'area' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'area' && (
              <div className="absolute top-10 left-0 w-[140px] bg-surface border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1.5 z-[100]">
                {[{ label: '전체 면적', value: 'ALL' }, ...areaTypes.map(a => ({ label: `${a}m²`, value: String(a) }))].map(opt => (
                  <button key={opt.value} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold hover:bg-body transition-colors ${txFilterArea === opt.value ? 'text-toss-blue bg-body/50' : 'text-secondary'}`}
                    onClick={(e) => { e.stopPropagation(); setTxFilterArea(opt.value); setActiveDropdown(null); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 거래유형 필터 */}
          <div className="relative flex-1 md:flex-none" onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'dealType' ? null : 'dealType'); }}>
            <button className="flex items-center justify-center md:justify-start gap-1 w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-[12px] font-bold text-secondary hover:bg-body transition-colors truncate">
              <span className="truncate">{txFilterDealType === 'ALL' ? '전체 유형' : txFilterDealType}</span>
              <ChevronDown size={14} className={`shrink-0 text-tertiary transition-transform ${activeDropdown === 'dealType' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'dealType' && (
              <div className="absolute top-10 left-0 w-[140px] bg-surface border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1.5 z-[100]">
                {[{ label: '전체 유형', value: 'ALL' }, ...dealTypes.map(d => ({ label: d, value: d }))].map(opt => (
                  <button key={opt.value} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold hover:bg-body transition-colors ${txFilterDealType === opt.value ? 'text-toss-blue bg-body/50' : 'text-secondary'}`}
                    onClick={(e) => { e.stopPropagation(); setTxFilterDealType(opt.value); setActiveDropdown(null); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 정렬 필터 */}
          <div className="relative flex-1 md:flex-none" onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'sort' ? null : 'sort'); }}>
            <button className="flex items-center justify-center md:justify-start gap-1 w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-[12px] font-bold text-secondary hover:bg-body transition-colors truncate">
              <span className="truncate">{{ 'date_desc': '최신순', 'date_asc': '과거순', 'price_desc': '높은가', 'price_asc': '낮은가' }[txSort as string] || '최신순'}</span>
              <ChevronDown size={14} className={`shrink-0 text-tertiary transition-transform ${activeDropdown === 'sort' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'sort' && (
              <div className="absolute top-10 right-0 w-[140px] bg-surface border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1.5 z-[100]">
                {[
                  { label: '최신순 (계약일)', value: 'date_desc' },
                  { label: '과거순 (계약일)', value: 'date_asc' },
                  { label: '높은가격순', value: 'price_desc' },
                  { label: '낮은가격순', value: 'price_asc' },
                ].map(opt => (
                  <button key={opt.value} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold hover:bg-body transition-colors ${txSort === opt.value ? 'text-toss-blue bg-body/50' : 'text-secondary'}`}
                    onClick={(e) => { e.stopPropagation(); setTxSort(opt.value as 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'); setActiveDropdown(null); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:overflow-y-auto overscroll-y-contain custom-scrollbar flex-1 relative md:max-h-[500px] xl:max-h-[560px]">
        {sortedFilteredTransactions.map((tx, i) => {
          const m = tx.contractYm.substring(4, 6);
          const d = tx.contractDay;
          const isRent = tx.dealType === '전세' || tx.dealType === '월세';
          const displayPrice = isRent ? (tx.deposit || 0) : tx.price;
          const displayMonthly = isRent ? (tx.monthlyRent || 0) : 0;
          const eok = Math.floor(displayPrice / 10000);
          const rem = displayPrice % 10000;
          const key = String(tx.area);
          const txAptNorm = normalizeAptName(tx.aptName);
          const typeData = typeMap[txAptNorm]?.[key];
          let typeLabel = '';
          if (typeData) {
            typeLabel = areaUnit === 'm2' ? typeData.typeM2 : (typeData.typePyeong || typeData.typeM2);
          }
          if (!typeLabel) {
             typeLabel = areaUnit === 'm2' ? `${tx.area}m²` : `${Math.round(tx.area * 0.3025)}평`;
          }

          // cancelDate가 유효한 날짜(6자리 이상 숫자)인 경우에만 취소 거래로 판정
          const isCancelled = !!(tx.cancelDate && /^\d{6,}$/.test(tx.cancelDate.trim()));

          return (
            <div key={i} className={`flex items-center justify-between p-4 border-b border-body hover:bg-body transition-colors ${i >= displayedCount ? 'hidden md:flex' : 'flex'} ${isCancelled ? 'opacity-40' : ''}`}>
              
              {/* 좌측: 날짜 + 스펙 결합으로 시선 흐름 최적화 */}
              <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0 pr-2">
                {/* 1. 날짜 */}
                <div className="flex flex-col w-[74px] md:w-[84px] shrink-0 text-left">
                  <div className={`text-[13px] md:text-[14px] font-bold tracking-tight whitespace-nowrap ${isCancelled ? 'text-tertiary line-through decoration-[#ef4444]' : 'text-[#6b7684]'}`}>
                    {tx.contractYm.substring(2, 4)}. {m}. {d}.
                  </div>
                  {isCancelled && (
                    <div className="text-[10px] font-bold text-[#ef4444] mt-0.5 leading-tight break-keep">
                      취소 {tx.cancelDate!.substring(2).replace(/(\d{2})(\d{2})(\d{2})/, '$1.$2.$3')}
                    </div>
                  )}
                </div>
                
                {/* 2. 평형 (독립 칼럼 & 폰트 크기 확대) */}
                <div className="w-[48px] md:w-[56px] shrink-0 flex justify-center">
                  <span className={`w-full text-center text-[13px] md:text-[14px] tracking-tight font-extrabold py-0.5 rounded bg-body ${isCancelled ? 'text-tertiary' : 'text-[#333d4b]'}`} title={typeLabel}>
                    {typeLabel}
                  </span>
                </div>

                {/* 3. 층수 (독립 칼럼 & 폰트 크기 확대) */}
                <div className="w-[36px] md:w-[48px] shrink-0 text-center">
                  <span className={`text-[13px] md:text-[14px] font-bold ${isCancelled ? 'text-[#c8ced4]' : 'text-tertiary'}`}>
                    {tx.floor}층
                  </span>
                </div>

              </div>

              {/* 우측: 덴시티 최적화 가격 */}
              <div className="flex flex-col items-end gap-1 shrink-0 text-right ml-2 w-auto">
                <div className="flex items-center gap-1.5">
                  {tx.isOutlier && (
                    <div className="group relative flex items-center justify-center cursor-help">
                      <AlertTriangle size={13} className="text-[#f59e0b] drop-shadow-sm" />
                      <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:-left-2 sm:translate-x-0 w-36 sm:w-max opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-primary text-surface text-[10px] sm:text-[11px] p-2 rounded-lg shadow-lg z-50 pointer-events-none break-keep text-center sm:text-left">
                        시세 대비 이례적 편차
                      </div>
                    </div>
                  )}

                  {(tx.dealType === '전세' || tx.dealType === '월세' || tx.dealType === '직거래') && (
                    <span className={`w-[20px] h-[20px] md:w-[22px] md:h-[22px] flex items-center justify-center text-[11px] font-extrabold rounded-md shrink-0 ${isCancelled ? 'opacity-50' : ''} ${
                      tx.dealType === '전세' ? 'bg-[#e6f4ea] text-[#0d652d]' : 
                      tx.dealType === '월세' ? 'bg-[#fef0e6] text-[#c2410c]' : 
                      'bg-toss-blue-light text-[#1b64da]'
                    }`}>
                      {tx.dealType.charAt(0)}
                    </span>
                  )}
                  
                  {/* 가격 위계 분리 (억 단위 강조, 만 단위 고정폭 정렬) */}
                  <div className={`flex items-baseline justify-end shrink-0 whitespace-nowrap tracking-tight ${tx.isOutlier || isCancelled ? 'text-tertiary line-through decoration-[#c8ced4] decoration-2' : ''}`}>
                    {eok > 0 && <span className={`text-[15px] font-black mr-[2px] ${!(tx.isOutlier || isCancelled) ? 'text-primary' : ''}`}>{eok}억</span>}
                    
                    {eok > 0 ? (
                      <span className={`inline-block text-left tabular-nums text-[14px] font-bold ${!(tx.isOutlier || isCancelled) ? 'text-secondary' : ''} ${displayMonthly > 0 ? '' : 'w-[38px]'}`}>
                        {rem > 0 ? rem.toLocaleString() : ''}
                      </span>
                    ) : (
                      <span className={`text-[14px] font-black tabular-nums ${!(tx.isOutlier || isCancelled) ? 'text-primary' : ''}`}>
                        {rem > 0 ? (displayMonthly > 0 ? rem.toLocaleString() : `${rem.toLocaleString()}만`) : '0'}
                      </span>
                    )}

                    {displayMonthly > 0 && <span className={`text-[14px] font-bold ml-0.5 tabular-nums ${!(tx.isOutlier || isCancelled) ? 'text-tertiary' : ''}`}>/ {displayMonthly.toLocaleString()}</span>}
                  </div>
                </div>
              </div>

            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[200px] text-tertiary gap-2">
            <AlertCircle size={24} className="text-toss-gray" />
            <span className="text-[13px] font-bold">조건에 맞는 거래 내역이 없습니다.</span>
          </div>
        )}
      </div>

      {/* Expand/Collapse Button */}
      {displayedCount < filteredTransactions.length && (
        <div className="flex md:hidden justify-center py-4 bg-surface border-t border-body">
          <button
            onClick={() => setDisplayedCount(prev => prev + 10)}
            className="flex items-center justify-center gap-1.5 bg-primary text-surface py-2.5 px-6 rounded-full text-[13px] font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-primary/90 transition-colors"
          >
            더보기 <ChevronDown size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
