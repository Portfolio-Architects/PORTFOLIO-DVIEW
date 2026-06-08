import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronDown, AlertTriangle, AlertCircle } from 'lucide-react';
import { useSettings } from '@/lib/contexts/SettingsContext';
import { findTypeMapEntry } from '@/lib/utils/apartmentMapping';
import { useInView } from 'react-intersection-observer';
import { Tooltip } from '@/components/ui/Tooltip';

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
  areaLabelM2?: string;
  areaLabelPyeong?: string;
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
  const [activeDropdown, setActiveDropdown] = useState<'sort' | null>(null);
  
  const INITIAL_DISPLAY_COUNT = 10;

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 연동 차트에 따라 매매/전월세 기본 분류 필터링
      if (chartType === 'sale' && (tx.dealType === '전세' || tx.dealType === '월세')) return false;
      if (chartType === 'jeonse' && tx.dealType !== '전세' && tx.dealType !== '월세') return false;
      return true;
    });
  }, [transactions, chartType]);

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

  const [isMobile, setIsMobile] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(10);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: '200px',
    threshold: 0.1,
    triggerOnce: false,
  });

  useEffect(() => {
    if (!isMobile && inView && displayedCount < sortedFilteredTransactions.length) {
      setDisplayedCount(prev => Math.min(prev + 10, sortedFilteredTransactions.length));
    }
  }, [inView, sortedFilteredTransactions.length, displayedCount, isMobile]);

  // Reset displayed count when filters change, or when mobile state shifts
  useEffect(() => {
    setDisplayedCount(isMobile ? 5 : 10);
  }, [txSort, chartType, isMobile]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!activeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      setActiveDropdown(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  // '중개거래', '직거래' 등은 거래 방식이지 유형이 아님 — 사실상 매매
  const isSaleDealType = (dealType: string | undefined) =>
    !dealType || (dealType !== '전세' && dealType !== '월세');

  const getBadgeColorClasses = (dealType: string | undefined) => {
    if (!dealType || dealType === '-') return 'bg-toss-blue-light text-[#00b386] dark:text-[#00d29d]'; // 매매 기본
    if (dealType === '전세') return 'bg-[#e6f4ea] dark:bg-emerald-950/45 text-[#0d652d] dark:text-emerald-400';
    if (dealType === '월세') return 'bg-[#fef0e6] dark:bg-orange-950/45 text-[#c2410c] dark:text-orange-400';
    // 중개거래, 직거래, 매매 등 모두 매매 계열
    return 'bg-toss-blue-light text-[#00b386] dark:text-[#00d29d]';
  };

  const getDealTypeLabel = (dealType: string | undefined) => {
    if (!dealType || dealType === '-') return '매매';
    if (dealType === '전세' || dealType === '월세') return dealType;
    // 중개거래, 직거래 → 표시 라벨
    return dealType;
  };

  return (
    <div className="flex flex-col bg-[#F9FAFB] dark:bg-[#1a1a1a] rounded-2xl ring-1 ring-[#e5e8eb] dark:ring-[#2d2d2d] overflow-hidden md:h-full shadow-inner">
      <div className="flex items-center justify-between p-4 bg-[#F9FAFB] dark:bg-[#1a1a1a] border-b border-border w-full">
        <h4 className="text-[14px] font-bold text-secondary shrink-0">
          실거래가 <span className="text-toss-blue ml-1">{filteredTransactions.length}</span>건
        </h4>
        {/* 정렬 필터 */}
        <div className="relative" onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'sort' ? null : 'sort'); }}>
          <button className="flex items-center gap-1 text-[12.5px] font-bold text-[#6b7684] dark:text-secondary hover:text-[#191f28] dark:hover:text-primary transition-colors cursor-pointer bg-transparent border-none outline-none">
            <span>{{ 'date_desc': '최신순', 'date_asc': '과거순', 'price_desc': '높은가격순', 'price_asc': '낮은가격순' }[txSort as string] || '최신순'}</span>
            <ChevronDown size={14} className={`text-tertiary transition-transform duration-200 ${activeDropdown === 'sort' ? 'rotate-180' : ''}`} />
          </button>
          {activeDropdown === 'sort' && (
            <div className="absolute top-6 right-0 w-[140px] bg-surface border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1.5 z-[100]">
              {[
                { label: '최신순 (계약일)', value: 'date_desc' },
                { label: '과거순 (계약일)', value: 'date_asc' },
                { label: '높은가격순', value: 'price_desc' },
                { label: '낮은가격순', value: 'price_asc' },
              ].map(opt => (
                <button key={opt.value} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold hover:bg-body transition-colors ${txSort === opt.value ? 'text-toss-blue bg-body/50' : 'text-secondary'} border-none bg-transparent`}
                  onClick={(e) => { e.stopPropagation(); setTxSort(opt.value as 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'); setActiveDropdown(null); }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 테이블 컬럼 헤더 추가 */}
      <div className="flex items-center justify-between px-4 py-2 bg-body border-b border-border text-[11px] font-extrabold text-[#8b95a1] dark:text-[#9ca3af] select-none shrink-0 w-full gap-2">
        <div className="w-[74px] md:w-[84px] shrink-0 text-left">계약일</div>
        <div className="w-[48px] md:w-[56px] shrink-0 text-center">전용면적</div>
        <div className="w-[36px] md:w-[48px] shrink-0 text-center">층</div>
        <div className="w-[90px] md:w-[110px] shrink-0 text-right">거래금액</div>
      </div>

      <div 
      className="md:overflow-y-auto overscroll-y-contain custom-scrollbar flex-1 relative md:max-h-[500px] xl:max-h-[560px]"
      >
        {sortedFilteredTransactions.slice(0, displayedCount).map((tx, i) => {
          const m = tx.contractYm.substring(4, 6);
          const d = String(tx.contractDay).trim().padStart(2, '0');
          const isRent = tx.dealType === '전세' || tx.dealType === '월세';
          const displayPrice = isRent ? (tx.deposit || 0) : tx.price;
          const displayMonthly = isRent ? (tx.monthlyRent || 0) : 0;
          const eok = Math.floor(displayPrice / 10000);
          const rem = displayPrice % 10000;
          let typeLabel = areaUnit === 'm2' ? tx.areaLabelM2 : tx.areaLabelPyeong;
          if (!typeLabel) {
            const typeData = findTypeMapEntry(typeMap, tx.aptName, tx.area);
            if (typeData) {
              typeLabel = areaUnit === 'm2' ? typeData.typeM2 : (typeData.typePyeong || typeData.typeM2);
            }
            if (!typeLabel) {
               typeLabel = areaUnit === 'm2' ? `${tx.area}m²` : `${Math.round(tx.area * 0.3025)}평`;
            }
          }

          // cancelDate가 유효한 날짜(6자리 이상 숫자)인 경우에만 취소 거래로 판정
          const isCancelled = !!(tx.cancelDate && /^\d{6,}$/.test(tx.cancelDate.trim()));

          // 가격을 깔끔한 단일 문자열로 포맷팅
          let priceText = '';
          if (tx.dealType === '월세') {
            const depEok = Math.floor((tx.deposit || 0) / 10000);
            const depRem = (tx.deposit || 0) % 10000;
            let depStr = '';
            if (depEok > 0) {
              depStr += `${depEok}억`;
              if (depRem > 0) depStr += `${depRem.toLocaleString()}`;
            } else {
              depStr += `${depRem.toLocaleString()}`;
            }
            priceText = `${depStr}/${displayMonthly.toLocaleString()}`;
          } else {
            if (eok > 0) {
              priceText += `${eok}억`;
              if (rem > 0) {
                priceText += `${rem.toLocaleString()}`;
              }
            } else {
              priceText += `${rem.toLocaleString()}만`;
            }
          }

          return (
            <div key={i} className={`flex items-center justify-between p-3 md:p-4 border-b border-body bg-surface hover:bg-body hover:-translate-y-[1px] hover:shadow-sm transition-all duration-200 cursor-default ${isCancelled ? 'opacity-40' : ''} gap-2`}>
              
              {/* 1. 날짜 */}
              <div className="flex flex-col w-[74px] md:w-[84px] shrink-0 text-left">
                <div className={`text-[14px] md:text-[15px] font-bold tracking-tight whitespace-nowrap ${isCancelled ? 'text-tertiary line-through decoration-red-500/60 dark:decoration-red-400/60' : 'text-[#6b7684] dark:text-[#9ca3af]'}`}>
                  {tx.contractYm.substring(2, 4)}.{m}.{d}
                </div>
                {isCancelled && (
                  <div className="text-[10px] font-bold text-red-500 dark:text-red-400 mt-0.5 leading-tight break-keep">
                    취소 {(tx.cancelDate || '').substring(2).replace(/(\d{2})(\d{2})(\d{2})/, '$1.$2.$3')}
                  </div>
                )}
              </div>
              
              {/* 2. 평형 (독립 칼럼 & 칩 디자인 세련되게 정돈) */}
              <div className="w-[48px] md:w-[56px] shrink-0 flex justify-center">
                <span className={`w-full text-center text-[12.5px] tracking-tight font-bold ${isCancelled ? 'text-tertiary/50 dark:text-tertiary/40' : 'text-secondary'}`} title={typeLabel}>
                  {typeLabel}
                </span>
              </div>
 
              {/* 3. 층수 (독립 칼럼 & 폰트 크기 확대) */}
              <div className="w-[36px] md:w-[48px] shrink-0 text-center">
                <span className={`text-[14px] md:text-[15px] font-bold ${isCancelled ? 'text-tertiary/50 dark:text-tertiary/40' : 'text-tertiary'}`}>
                  {tx.floor}층
                </span>
              </div>
 
              {/* 4. 거래금액 */}
              <div className="flex items-center justify-end gap-1.5 shrink-0 text-right w-[90px] md:w-[110px]">
                {tx.isOutlier && (
                  <Tooltip content={tx.dealType === '직거래' ? "특수관계인 저가/고가 거래 의심 (직거래 편차)" : "시세 대비 이례적 편차"}>
                    <div className="cursor-help flex items-center justify-center">
                      <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400 drop-shadow-sm" />
                    </div>
                  </Tooltip>
                )}
 
                {(tx.dealType === '전세' || tx.dealType === '월세' || tx.dealType === '직거래') && (
                  <span className={`w-[20px] h-[20px] md:w-[22px] md:h-[22px] flex items-center justify-center text-[11px] font-extrabold rounded-md shrink-0 ${isCancelled ? 'opacity-50' : ''} ${
                    tx.dealType === '전세' ? 'bg-[#e6f4ea] dark:bg-emerald-950/45 text-[#0d652d] dark:text-emerald-400' : 
                    tx.dealType === '월세' ? 'bg-[#fef0e6] dark:bg-orange-950/45 text-[#c2410c] dark:text-orange-400' : 
                    'bg-toss-blue-light text-[#00b386] dark:text-[#00d29d]'
                  }`}>
                    {tx.dealType.charAt(0)}
                  </span>
                )}
                
                <div className={`text-[15px] md:text-[16px] font-black tracking-tight whitespace-nowrap text-right ${tx.isOutlier || isCancelled ? 'text-tertiary line-through decoration-[#c8ced4] dark:decoration-tertiary/40 decoration-2' : 'text-primary'}`}>
                  {priceText}
                </div>
              </div>
 
            </div>
          );
        })}

        {!isMobile && displayedCount < sortedFilteredTransactions.length && (
          <div ref={loadMoreRef} className="flex justify-center py-5 shrink-0 w-full items-center">
            <div className="w-6 h-6 rounded-full border-2 border-toss-blue border-t-transparent animate-spin" />
          </div>
        )}

        {filteredTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[200px] text-tertiary gap-2">
            <AlertCircle size={24} className="text-toss-gray" />
            <span className="text-[13px] font-bold">조건에 맞는 거래 내역이 없습니다.</span>
          </div>
        )}
      </div>

      {/* 모바일 뷰 전용 수동 더보기 버튼 */}
      {mounted && isMobile && displayedCount < sortedFilteredTransactions.length && (
        <div className="flex justify-center py-4 bg-surface border-t border-body px-4 shrink-0">
          <button
            onClick={() => setDisplayedCount(prev => Math.min(prev + 10, sortedFilteredTransactions.length))}
            className="flex items-center justify-center gap-1.5 bg-[#f2f4f6] text-[#4e5968] active:bg-[#e5e8eb] py-3.5 px-6 rounded-xl text-[14px] font-extrabold w-full transition-colors shadow-sm cursor-pointer hover:bg-[#e5e8eb] border-none outline-none"
          >
            더보기 <ChevronDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
