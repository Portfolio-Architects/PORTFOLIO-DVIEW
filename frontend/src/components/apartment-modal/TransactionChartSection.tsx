import React, { useState, useRef } from 'react';
import { MapPin, TrendingUp, Camera } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Bar,
  Line,
  Area,
  Customized,
  ReferenceArea
} from 'recharts';
import { TransactionRecord } from './TransactionTable';
import { useSettings } from '@/lib/contexts/SettingsContext';
import SegmentedControl from '../ui/SegmentedControl';
import { AptTxSummary } from '@/lib/types/transaction';
import { findTypeMapEntry } from '@/lib/utils/apartmentMapping';
import { safeHtml2canvas } from '@/lib/utils/html2canvasPatch';

interface TransactionChartSectionProps {
  transactions: TransactionRecord[];
  chartType: 'sale' | 'jeonse';
  setChartType: (type: 'sale' | 'jeonse') => void;
  displayAptName: string;
  dong: string;
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  normalizeAptName: (name: string) => string;
  txSummary?: AptTxSummary;
}

export const TransactionChartSection = React.memo(function TransactionChartSection({
  transactions,
  chartType,
  setChartType,
  displayAptName,
  dong,
  typeMap,
  normalizeAptName,
  txSummary
}: TransactionChartSectionProps) {
  const { areaUnit, setAreaUnit } = useSettings();
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  type ScatterData = {
    ts: number; yearMonth: number; contractDay: number; price: number; area: number;
    rawArea: number; floor: number; priceEok: string; dealType: string; fullDate: string; isOutlier: boolean;
    areaLabelM2?: string;
    areaLabelPyeong?: string;
  };

  const [chartTimeframe, setChartTimeframe] = useState<'6M' | '1Y' | '3Y' | 'ALL'>('ALL');
  const [hoveredDot, setHoveredDot] = useState<{ x: number; y: number; data: ScatterData } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // [자기개선] 실거래 차트 드래그 줌용 상태 및 핸들러 추가
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [zoomDomain, setZoomDomain] = useState<{ left: number | 'dataMin'; right: number | 'dataMax' }>({
    left: 'dataMin',
    right: 'dataMax',
  });

  const handleTimeframeChange = (val: string) => {
    setChartTimeframe(val as '6M' | '1Y' | '3Y' | 'ALL');
    setZoomDomain({ left: 'dataMin', right: 'dataMax' });
  };

  const handleZoom = () => {
    if (refAreaLeft === null || refAreaRight === null || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    let left = refAreaLeft;
    let right = refAreaRight;
    if (left > right) {
      const temp = left;
      left = right;
      right = temp;
    }

    setZoomDomain({ left, right });
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const handleResetZoom = () => {
    setZoomDomain({ left: 'dataMin', right: 'dataMax' });
  };

  const relevantTxs = transactions.filter(tx => 
    chartType === 'sale' 
      ? (tx.dealType !== '전세' && tx.dealType !== '월세') 
      : (tx.dealType === '전세' || tx.dealType === '월세')
  );

  if (relevantTxs.length === 0) {
    return (
      <div className="w-full flex flex-col">
        <div className="bg-body rounded-2xl p-8 flex flex-col items-center justify-center ring-1 ring-black/5 dark:ring-white/10 min-h-[300px]">
          <span className="text-[40px] mb-2">🤫</span>
          <span className="text-tertiary text-[15px] font-extrabold tracking-tight">현재 숨고르기 중인 단지입니다</span>
          <span className="text-tertiary text-[12px] font-medium mt-1">해당 기간 내 실거래 기록이 없습니다</span>
        </div>
      </div>
    );
  }

  const rawData = relevantTxs.map((tx) => {
    let rawPrice = tx.price;
    if (chartType === 'jeonse') {
      rawPrice = (tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055);
    }

    let priceEokNum = rawPrice / 10000;
    if (priceEokNum > 100) priceEokNum = rawPrice / 100000000;
    const ym = tx.contractYm;
    const year = parseInt(ym.slice(0, 4));
    const month = parseInt(ym.slice(4));
    const day = parseInt(tx.contractDay) || 15;
    return {
      ts: new Date(year, month - 1, day).getTime(),
      yearMonth: parseInt(ym), contractDay: day,
      price: Math.round(priceEokNum * 1000) / 1000,
      area: tx.areaPyeong, rawArea: tx.area,
      floor: tx.floor, priceEok: tx.priceEok || `${priceEokNum >= 1 ? Math.floor(priceEokNum)+'억' : ''}${Math.round((priceEokNum%1)*10000)||''}`,
      dealType: tx.dealType,
      fullDate: `${year}.${String(month).padStart(2,'0')}.${String(day).padStart(2,'0')}`,
      areaLabelM2: tx.areaLabelM2,
      areaLabelPyeong: tx.areaLabelPyeong,
    };
  });

  const now = new Date();
  const getRecentAvgByMonths = (months: number) => {
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    const filtered = rawData.filter(d => {
      const y = Math.floor(d.yearMonth / 100);
      const m = d.yearMonth % 100;
      const day = d.contractDay || 1;
      return new Date(y, m - 1, day) >= cutoffDate;
    });
    if (filtered.length === 0) return 0;
    return filtered.reduce((acc, d) => acc + d.price, 0) / filtered.length;
  };

  const momentum = {
    m1: getRecentAvgByMonths(1),
    m3: getRecentAvgByMonths(3),
    m6: getRecentAvgByMonths(6),
    y1: getRecentAvgByMonths(12),
    y3: getRecentAvgByMonths(36)
  };
  const cutoffMap: Record<string, number> = { '6M': 6, '1Y': 12, '3Y': 36, 'ALL': 9999 };
  const monthsCut = cutoffMap[chartTimeframe];
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsCut, 1);
  const cutoffYm = cutoffDate.getFullYear() * 100 + (cutoffDate.getMonth() + 1);
  const timeFiltered = rawData.filter(d => d.yearMonth >= cutoffYm);

  const sortedPrices = [...timeFiltered].sort((a, b) => a.price - b.price);
  const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.05)]?.price || 0;
  const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.95)]?.price || 10;
  const iqr = q3 - q1;
  const bandLow = q1;
  const bandHigh = q3;
  const scatterData = timeFiltered.map(d => ({
    ...d,
    isOutlier: d.price < q1 - iqr * 2,
  })).filter(d => d.price >= q1 - iqr * 3);
  
  const getFloorColor = (dealType: string | undefined) => {
    if (dealType === '전세' || dealType === '월세') return '#f9a825'; // Orange/amber for Rent/Jeonse
    return '#00d29d'; // Emerald/green for Sale
  };

  const byMonthTier = new Map<number, { all: number[] }>();
  scatterData.forEach(d => {
    if (!byMonthTier.has(d.yearMonth)) byMonthTier.set(d.yearMonth, { all: [] });
    const bucket = byMonthTier.get(d.yearMonth)!;
    bucket.all.push(d.price);
  });
  
  // Calculate secondary line data (Jeonse if chart is Sale, Sale if chart is Jeonse)
  const secondaryTxs = transactions.filter(tx => 
    chartType === 'sale' 
      ? (tx.dealType === '전세' || tx.dealType === '월세') 
      : (tx.dealType !== '전세' && tx.dealType !== '월세')
  );
  
  const secondaryByMonth = new Map<number, number[]>();
  secondaryTxs.forEach(tx => {
    let rawPrice = tx.price;
    if (chartType === 'sale') { // secondary is jeonse
      rawPrice = (tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055);
    }
    let priceEokNum = rawPrice / 10000;
    if (priceEokNum > 100) priceEokNum = rawPrice / 100000000;
    const price = Math.round(priceEokNum * 1000) / 1000;
    
    const ym = parseInt(tx.contractYm);
    if (ym >= cutoffYm) {
      if (!secondaryByMonth.has(ym)) secondaryByMonth.set(ym, []);
      secondaryByMonth.get(ym)!.push(price);
    }
  });

  const secondaryMonthly = new Map<number, number>();
  secondaryByMonth.forEach((prices, ym) => {
    if (prices.length > 0) {
      const sorted = [...prices].sort((a,b)=>a-b);
      const q1 = sorted[Math.floor(sorted.length * 0.1)] || 0;
      const q3 = sorted[Math.floor(sorted.length * 0.9)] || 10;
      const filtered = prices.filter(p => p >= q1 * 0.8 && p <= q3 * 1.2);
      const valid = filtered.length > 0 ? filtered : prices;
      secondaryMonthly.set(ym, Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 1000) / 1000);
    }
  });

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 1000) / 1000 : undefined;
  
  const allYms = Array.from(new Set([...byMonthTier.keys(), ...secondaryMonthly.keys()]));
  
  const monthlyData = allYms
    .map(ym => {
      const buckets = byMonthTier.get(ym);

      return {
        ts: new Date(Math.floor(ym / 100), (ym % 100) - 1, 15).getTime(),
        monthAvg: buckets ? avg(buckets.all) : undefined,
        secondaryAvg: secondaryMonthly.get(ym),
        saleAvg: chartType === 'sale' ? (buckets ? avg(buckets.all) : undefined) : secondaryMonthly.get(ym),
        jeonseAvg: chartType === 'sale' ? secondaryMonthly.get(ym) : (buckets ? avg(buckets.all) : undefined),
        volume: buckets ? buckets.all.length : 0, 
        ym,
        bandHigh, bandLow,
      };
    })
    .sort((a, b) => a.ts - b.ts);

  // Compute global stable minP/maxP across BOTH sale and jeonse to keep Y-axis identical
  const getEokPrice = (tx: any, isJeonse: boolean) => {
    let rawPrice = tx.price;
    if (isJeonse) rawPrice = (tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055);
    let priceEokNum = rawPrice / 10000;
    if (priceEokNum > 100) priceEokNum = rawPrice / 100000000;
    return Math.round(priceEokNum * 1000) / 1000;
  };
  const sPrices = transactions.filter(tx => {
    if (parseInt(tx.contractYm) < cutoffYm) return false;
    if (tx.dealType === '전세' || tx.dealType === '월세') return false;
    
    const ts = new Date(parseInt(tx.contractYm.slice(0, 4)), parseInt(tx.contractYm.slice(4)) - 1, parseInt(tx.contractDay) || 15).getTime();
    if (zoomDomain.left !== 'dataMin' && ts < (zoomDomain.left as number)) return false;
    if (zoomDomain.right !== 'dataMax' && ts > (zoomDomain.right as number)) return false;
    return true;
  }).map(tx => getEokPrice(tx, false)).sort((a,b)=>a-b);

  const jPrices = transactions.filter(tx => {
    if (parseInt(tx.contractYm) < cutoffYm) return false;
    if (tx.dealType !== '전세' && tx.dealType !== '월세') return false;
    
    const ts = new Date(parseInt(tx.contractYm.slice(0, 4)), parseInt(tx.contractYm.slice(4)) - 1, parseInt(tx.contractDay) || 15).getTime();
    if (zoomDomain.left !== 'dataMin' && ts < (zoomDomain.left as number)) return false;
    if (zoomDomain.right !== 'dataMax' && ts > (zoomDomain.right as number)) return false;
    return true;
  }).map(tx => getEokPrice(tx, true)).sort((a,b)=>a-b);
  
  const getValid = (arr: number[]) => {
    if (!arr.length) return [];
    const q1 = arr[Math.floor(arr.length * 0.05)] || 0;
    const q3 = arr[Math.floor(arr.length * 0.95)] || 10;
    const iqr = q3 - q1;
    return arr.filter(p => p >= q1 - iqr * 3 && p <= q3 + iqr * 3);
  };
  
  const allValidPrices = [...getValid(sPrices), ...getValid(jPrices)];
  let minP = Infinity, maxP = -Infinity;
  for (const p of allValidPrices) { if (p < minP) minP = p; if (p > maxP) maxP = p; }
  
  const prices = scatterData.map(d => d.price);

  let domainMin = minP !== Infinity ? Math.max(0, Math.floor(minP * 10) / 10 - 0.3) : 0;
  let domainMax = maxP !== -Infinity ? Math.ceil(maxP * 10) / 10 + 0.5 : 10;
  if (minP !== Infinity && maxP !== -Infinity && (domainMax - domainMin < 1.0)) {
    domainMin = Math.max(0, domainMin - 0.5);
    domainMax = domainMax + 0.5;
  }
  const maxVol = Math.max(...monthlyData.map(d => d.volume), 1);



  const currentMarketPrice = momentum.m1 || momentum.m3 || (txSummary?.avg3MPrice ? txSummary.avg3MPrice / 10000 : 0);


  const formatAvgPriceEok = (avgPrice: number) => {
    if (!avgPrice) return '-';
    const roundedAvg = Math.round(avgPrice * 100) / 100;
    const eok = Math.floor(roundedAvg);
    const rem = Math.round((roundedAvg % 1) * 10000);
    return `${eok >= 1 ? `${eok}억` : ''}${rem > 0 ? rem.toLocaleString() : (eok > 0 ? '' : '0')}`;
  };

  const handleCaptureChart = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await safeHtml2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc: Document) => {
          // You can modify cloned DOM here if needed
          const watermark = clonedDoc.getElementById('dview-watermark');
          if (watermark) {
            watermark.style.opacity = '1';
            watermark.style.color = '#8b95a1';
          }
        }
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `DVIEW_${displayAptName}_${chartType === 'sale' ? '매매' : '전월세'}_차트.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to capture chart:", err);
      alert("차트 이미지 저장에 실패했습니다.");
    }
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div ref={chartRef} className="bg-surface rounded-2xl p-4 md:p-6 ring-1 ring-black/5 dark:ring-white/10 flex-1 flex flex-col h-full relative overflow-hidden touch-pan-y">
        {/* D-VIEW 워터마크 (평소엔 흐리게, 캡처 시 선명하게) */}
        <div id="dview-watermark" className="absolute bottom-4 right-4 opacity-0 md:opacity-20 pointer-events-none select-none flex flex-col items-end z-0 transition-opacity">
          <span className="text-[16px] md:text-[20px] font-black text-tertiary tracking-tighter">D-VIEW</span>
          <span className="text-[10px] md:text-[12px] font-bold text-tertiary">dongtanview.com</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 w-full gap-3">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <h3 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5 shrink-0">
              <TrendingUp size={15} className="text-toss-blue" /> {chartType === 'sale' ? '매매가 추이' : '전월세 추이'}
            </h3>
            
            {/* 최고 평균가 대비 현재 평균가 게이지 바 */}
            {(() => {
              if (prices.length > 0) {
                const validAvgs = monthlyData.map(d => d.monthAvg).filter(v => v != null) as number[];
                const maxPrice = validAvgs.length > 0 ? Math.max(...validAvgs) : Math.max(...prices);
                const currentPrice = momentum.m1 || prices[0];
                if (maxPrice > 0 && currentPrice > 0) {
                  const dropRatio = ((maxPrice - currentPrice) / maxPrice) * 100;
                  const ratio = Math.max(0, Math.min(100, (currentPrice / maxPrice) * 100));
                  return (
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex justify-between text-[12px] sm:text-[13px] font-bold">
                        <span className="text-tertiary">최고 평균가 {formatAvgPriceEok(maxPrice)}</span>
                        <span className={dropRatio > 0 ? "text-[#d33340] dark:text-red-300" : "text-[#008262] dark:text-[#00d29d]"}>
                          최근 1개월 {formatAvgPriceEok(currentPrice)} ({dropRatio > 0 ? `-${dropRatio.toFixed(1)}%` : `+${Math.abs(dropRatio).toFixed(1)}%`})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-body rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            dropRatio > 0 
                              ? "bg-gradient-to-r from-rose-400 to-[#f04452] dark:from-rose-500/80 dark:to-[#f26d78]" 
                              : "bg-gradient-to-r from-[#00d29d] to-[#00b386]"
                          }`} 
                          style={{ width: `${ratio}%` }} 
                        />
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 md:ml-auto">
            {zoomDomain.left !== 'dataMin' && (
              <button 
                onClick={handleResetZoom}
                className="text-[12px] font-extrabold text-toss-blue hover:text-toss-blue/80 transition-colors bg-toss-blue/10 px-2.5 py-1.5 rounded-lg border-none cursor-pointer active:scale-95"
              >
                줌 초기화
              </button>
            )}
            <button 
              onClick={handleCaptureChart}
              className="w-8 h-8 flex items-center justify-center bg-transparent hover:bg-body text-secondary hover:text-primary rounded-lg transition-colors border border-border shrink-0 cursor-pointer"
              title="차트 이미지로 저장"
            >
              <Camera size={15} strokeWidth={2} />
            </button>
            <SegmentedControl
              options={[
                { label: '6M', value: '6M' },
                { label: '1Y', value: '1Y' },
                { label: '3Y', value: '3Y' },
                { label: 'ALL', value: 'ALL' }
              ]}
              value={chartTimeframe}
              onChange={handleTimeframeChange}
            />
          </div>
        </div>
        
        <div className="flex w-full gap-2 sm:gap-3 mb-5">
          {[{label: '3개월', val: momentum.m3}, {label: '6개월', val: momentum.m6}, {label: '1년', val: momentum.y1}].map((item) => {
            const isTarget = item.label === '3개월';
            return (
              <div 
                key={item.label} 
                className={`flex flex-col px-3 py-2.5 sm:px-4 sm:py-3.5 flex-1 relative rounded-xl border transition-all duration-200 ${
                  isTarget 
                    ? 'bg-surface border-toss-blue shadow-[0_4px_12px_rgba(49,130,246,0.06)] ring-1 ring-toss-blue/10 z-10' 
                    : 'bg-surface border-border/60 hover:bg-body/30'
                }`}
              >
                <div className={`text-[11px] sm:text-[12.5px] font-bold mb-1 flex items-center justify-between w-full whitespace-nowrap gap-1.5 ${isTarget ? 'text-[#1b64da] dark:text-blue-400' : 'text-tertiary'}`}>
                  <span>{item.label} 평균</span>
                  {isTarget && <div className="w-1.5 h-1.5 shrink-0 bg-toss-blue rounded-full animate-pulse shadow-[0_0_6px_rgba(49,130,246,0.3)]" />}
                </div>
                <span className={`text-[14.5px] sm:text-[17px] whitespace-nowrap ${isTarget ? 'text-[#1b64da] dark:text-blue-400 font-black tracking-tight' : 'text-primary font-extrabold'}`}>
                  {formatAvgPriceEok(item.val)}
                </span>
              </div>
            );
          })}
        </div>
        

        
        <div className="h-[320px] md:h-[360px] w-full relative">
          {isMounted ? (
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1} debounce={100}>
              <ComposedChart 
                data={monthlyData} 
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                onMouseDown={(e) => { if (e) setRefAreaLeft(e.activeLabel ? Number(e.activeLabel) : null); }}
                onMouseMove={(e) => { if (refAreaLeft !== null && e) setRefAreaRight(e.activeLabel ? Number(e.activeLabel) : null); }}
                onMouseUp={handleZoom}
                onDoubleClick={handleResetZoom}
                className="select-none cursor-crosshair"
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d29d" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d29d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="ts" type="number" scale="time" domain={[zoomDomain.left, zoomDomain.right]}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }} axisLine={{ stroke: 'var(--border-color)' }}
                  tickLine={false} tickMargin={6}
                  tickFormatter={(ts: number) => { const d = new Date(ts); return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}`; }}
                />
                <YAxis yAxisId="price" orientation="left" domain={[Math.max(0, domainMin), domainMax]}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false}
                  width={48} dx={-3}
                  tickFormatter={(v: number) => v >= 1 ? `${v.toFixed(1)}억` : `${Math.round(v * 10000)}만`}
                />
                <YAxis yAxisId="volume" orientation="right" domain={[0, maxVol * 4]}
                  tick={false} axisLine={false} tickLine={false} width={0}
                />
                {refAreaLeft && refAreaRight && (
                  <ReferenceArea
                    yAxisId="price"
                    x1={refAreaLeft}
                    x2={refAreaRight}
                    strokeOpacity={0.3}
                    fill="#008262"
                    fillOpacity={0.15}
                  />
                )}
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload;
                    const vol = item?.volume;
                    const hasRatio = item?.saleAvg != null && item?.jeonseAvg != null && item.saleAvg > 0;
                    const ratioValue = hasRatio ? ((item.jeonseAvg / item.saleAvg) * 100).toFixed(1) : null;

                    return (
                      <div className="bg-surface/95 border border-border p-3 sm:p-4 rounded-2xl shadow-xl backdrop-blur-md min-w-[150px]">
                        <div className="text-tertiary text-[12px] font-bold mb-2">
                          {new Date(item?.ts).getFullYear()}.{String(new Date(item?.ts).getMonth()+1).padStart(2,'0')}월
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {item?.saleAvg != null && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-tertiary text-[13px] font-bold">매매 평균</span>
                              <span className="text-[#00d29d] text-[15px] font-extrabold">{item.saleAvg.toFixed(2)}억</span>
                            </div>
                          )}
                          {item?.jeonseAvg != null && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-tertiary text-[13px] font-bold">전월세 평균</span>
                              <span className="text-[#f9a825] text-[15px] font-extrabold">{item.jeonseAvg.toFixed(2)}억</span>
                            </div>
                          )}

                          {ratioValue != null && (
                            <div className="flex items-center justify-between gap-4 border-t border-border/20 pt-1.5 mt-0.5">
                              <span className="text-tertiary text-[13px] font-bold">전세가율</span>
                              <span className="text-toss-blue text-[15px] font-extrabold">{ratioValue}%</span>
                            </div>
                          )}
                          {vol != null && vol > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-tertiary text-[13px] font-bold">거래량</span>
                              <span className="text-primary text-[14px] font-extrabold">{vol}건</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  isAnimationActive={true}
                  animationDuration={150}
                />
                <Bar dataKey="volume" yAxisId="volume" fill="#00d29d" radius={[2, 2, 0, 0]} maxBarSize={12} opacity={0.15} isAnimationActive={false} />
                <Area type="linear" dataKey="saleAvg" yAxisId="price" stroke="#00d29d" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrice)" dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }} activeDot={false} connectNulls isAnimationActive={false} baseValue={Math.max(0, domainMin)} />
                <Line type="linear" dataKey="jeonseAvg" yAxisId="price" stroke="#f9a825" strokeWidth={2} dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }} activeDot={false} connectNulls isAnimationActive={false} />

                <Customized
                  component={(rechartProps: Record<string, unknown>) => {
                    const { xAxisMap, yAxisMap } = rechartProps as { xAxisMap?: Record<string, { scale?: (val: number) => number }>; yAxisMap?: Record<string, { scale?: (val: number) => number }> };
                    if (!xAxisMap || !yAxisMap) return null;
                    const xAx = Object.values(xAxisMap)[0];
                    const yAx = Object.values(yAxisMap)[0];
                    if (!xAx?.scale || !yAx?.scale) return null;
                    return (
                      <g>
                        {scatterData.map((d, i) => {
                          const cx = xAx.scale ? xAx.scale(d.ts) : 0;
                          const cy = yAx.scale ? yAx.scale(d.price) : 0;
                          if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                          const isHov = hoveredDot?.data === d;
                          const floorColor = getFloorColor(d.dealType);
                          return (
                            <circle key={i} cx={cx} cy={cy}
                              r={isHov ? 5 : 3} fill={floorColor}
                              opacity={d.isOutlier ? 0.1 : (isHov ? 1 : 0.35)}
                              stroke={isHov ? '#fbbf24' : 'none'}
                              strokeWidth={isHov ? 2 : 0}
                              style={{ cursor: 'pointer', transition: 'r 0.15s, opacity 0.15s' }}
                              onMouseEnter={() => setHoveredDot({ x: cx, y: cy, data: { ...d, dealType: d.dealType || '' } })}
                              onMouseLeave={() => setHoveredDot(null)}
                            />
                          );
                        })}
                      </g>
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-body/50 rounded-2xl animate-pulse">
              <span className="text-tertiary text-[13px] font-bold">차트 로드 중...</span>
            </div>
          )}
          {hoveredDot && (() => {
            const d = hoveredDot.data;
            const typeName = (areaUnit === 'm2' ? d.areaLabelM2 : d.areaLabelPyeong) || (() => {
              const typeData = findTypeMapEntry(typeMap, displayAptName, d.rawArea);
              return typeData ? (areaUnit === 'm2' ? typeData.typeM2 : (typeData.typePyeong || typeData.typeM2)) : undefined;
            })();
            return (
              <div 
                className="absolute bg-surface border border-border rounded-xl px-3.5 py-2.5 shadow-lg pointer-events-none z-10 whitespace-nowrap text-left"
                style={{
                  left: hoveredDot.x + 48, top: hoveredDot.y + 10,
                  transform: 'translate(-50%, -100%) translateY(-12px)',
                }}
              >
                <div className="text-tertiary text-[11px] mb-1">{d.fullDate}</div>
                <div className="text-primary text-[16px] font-extrabold mb-1">
                  {d.priceEok || `${d.price.toFixed(2)}억`}
                </div>
                <div className="text-tertiary text-[11px] flex gap-1.5 items-center">
                  {typeName ? <span className="text-[#00d29d] font-bold">{typeName}</span> : <span>{areaUnit === 'm2' ? `${d.rawArea}m²` : `${d.area}평`}</span>}
                  <span>·</span><span style={{ color: getFloorColor(d.dealType) }}>{d.floor}층</span>
                  {d.dealType && <><span>·</span><span>{d.dealType}</span></>}
                </div>
              </div>
            );
          })()}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 mt-2 px-1 text-[12px] sm:text-[13px] font-bold text-tertiary">
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-5 sm:w-6 h-[2px] bg-[#00d29d] rounded"/>매매 평균</span>

          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-5 sm:w-6 h-[2px] bg-[#f9a825] rounded"/>전월세 평균</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3.5 h-3.5 bg-[#e5e8eb] rounded-sm"/>{chartType === 'sale' ? '매매 거래량' : '전월세 거래량'}</span>
        </div>
      </div>
    </div>
  );
});
