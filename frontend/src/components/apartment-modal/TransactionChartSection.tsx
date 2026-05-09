import React, { useState } from 'react';
import { MapPin, TrendingUp } from 'lucide-react';
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
  Customized
} from 'recharts';
import { TransactionRecord } from './TransactionTable';
import { useSettings } from '@/lib/contexts/SettingsContext';

interface TransactionChartSectionProps {
  transactions: TransactionRecord[];
  chartType: 'sale' | 'jeonse';
  setChartType: (type: 'sale' | 'jeonse') => void;
  displayAptName: string;
  dong: string;
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  normalizeAptName: (name: string) => string;
  txSummary?: any;
}

export function TransactionChartSection({
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
  type ScatterData = {
    ts: number; yearMonth: number; contractDay: number; price: number; area: number;
    rawArea: number; floor: number; priceEok: string; dealType: string; fullDate: string; isOutlier: boolean;
  };

  const [chartTimeframe, setChartTimeframe] = useState<'6M' | '1Y' | '3Y' | 'ALL'>('ALL');
  const [hoveredDot, setHoveredDot] = useState<{ x: number; y: number; data: ScatterData } | null>(null);

  const relevantTxs = transactions.filter(tx => 
    chartType === 'sale' 
      ? (tx.dealType !== '전세' && tx.dealType !== '월세') 
      : (tx.dealType === '전세' || tx.dealType === '월세')
  );

  if (relevantTxs.length === 0) {
    return (
      <div className="w-full flex flex-col">
        <div className="bg-body rounded-2xl p-8 flex flex-col items-center justify-center ring-1 ring-black/5 min-h-[300px]">
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
    };
  });

  const now = new Date();
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
    isOutlier: d.price < q1 - iqr * 2 || d.price > q3 + iqr * 2,
  })).filter(d => d.price >= q1 - iqr * 3 && d.price <= q3 + iqr * 3);
  
  const getFloorColor = (floor: number) => '#0d9488';

  const byMonthTier = new Map<number, { all: number[] }>();
  scatterData.forEach(d => {
    if (!byMonthTier.has(d.yearMonth)) byMonthTier.set(d.yearMonth, { all: [] });
    const bucket = byMonthTier.get(d.yearMonth)!;
    bucket.all.push(d.price);
  });
  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 1000) / 1000 : undefined;
  const monthlyData = Array.from(byMonthTier.entries())
    .map(([ym, buckets]) => ({
      ts: new Date(Math.floor(ym / 100), (ym % 100) - 1, 15).getTime(),
      monthAvg: avg(buckets.all)!,
      volume: buckets.all.length, ym,
      bandHigh, bandLow,
    }))
    .sort((a, b) => a.ts - b.ts);

  const prices = scatterData.map(d => d.price);
  let minP = Infinity, maxP = -Infinity;
  for (const p of prices) { if (p < minP) minP = p; if (p > maxP) maxP = p; }
  const domainMin = Math.floor(minP * 10) / 10 - 0.3;
  const domainMax = Math.ceil(maxP * 10) / 10 + 0.5;
  const maxVol = Math.max(...monthlyData.map(d => d.volume), 1);

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

  const formatAvgPriceEok = (avgPrice: number) => {
    if (!avgPrice) return '-';
    const roundedAvg = Math.round(avgPrice * 100) / 100;
    const eok = Math.floor(roundedAvg);
    const rem = Math.round((roundedAvg % 1) * 10000);
    return `${eok >= 1 ? `${eok}억` : ''}${rem > 0 ? rem.toLocaleString() : (eok > 0 ? '' : '0')}`;
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="bg-surface rounded-2xl p-4 md:p-6 ring-1 ring-black/5 flex-1 flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 w-full gap-3">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <h4 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5 shrink-0">
              <TrendingUp size={15} className="text-toss-blue" /> {chartType === 'sale' ? '매매가 추이' : '전월세 추이'}
            </h4>
            
            {/* 최고 평균가 대비 현재 평균가 게이지 바 */}
            {(() => {
              if (prices.length > 0) {
                const maxPrice = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.monthAvg).filter(Boolean)) : Math.max(...prices);
                const currentPrice = momentum.m1 || prices[0];
                if (maxPrice > 0 && currentPrice > 0) {
                  const dropRatio = ((maxPrice - currentPrice) / maxPrice) * 100;
                  const ratio = Math.max(0, Math.min(100, (currentPrice / maxPrice) * 100));
                  return (
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex justify-between text-[12px] sm:text-[13px] font-bold">
                        <span className="text-tertiary">최고 평균가 {formatAvgPriceEok(maxPrice)}</span>
                        <span className="text-toss-blue">현재 {formatAvgPriceEok(currentPrice)} ({dropRatio > 0 ? `-${dropRatio.toFixed(1)}%` : `+${Math.abs(dropRatio).toFixed(1)}%`})</span>
                      </div>
                      <div className="w-full h-1.5 bg-body rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#0d9488] to-[#0f766e] rounded-full transition-all duration-1000" 
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
          
          <div className="flex items-center gap-3 md:ml-auto">
            <div className="flex items-center gap-1 bg-body p-1 rounded-[10px] shadow-inner">
              {(['6M','1Y','3Y','ALL'] as const).map(tf => (
                <button key={tf} onClick={() => setChartTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-md text-[12px] sm:text-[13px] font-bold transition-all ${
                    chartTimeframe === tf ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:bg-[#e5e8eb]'
                  }`}>{tf}</button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex w-full gap-2 md:gap-3 mb-5 overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x pb-2">
          {[{label: '1개월', val: momentum.m1}, {label: '3개월', val: momentum.m3}, {label: '6개월', val: momentum.m6}, {label: '1년', val: momentum.y1}, {label: '3년', val: momentum.y3}].map((item, idx) => {
            const isTarget = item.label === '3개월';
            return (
              <div key={item.label} className={`flex flex-col px-3 py-2.5 sm:px-5 sm:py-4 shrink-0 min-w-[95px] sm:min-w-[120px] flex-1 snap-center relative rounded-xl sm:rounded-2xl border transition-all duration-200 ${isTarget ? 'bg-surface border-toss-blue shadow-[0_4px_16px_rgba(49,130,246,0.15)] ring-1 ring-toss-blue/20 z-10' : 'bg-body border-transparent hover:bg-[#e5e8eb]'}`}>
                <div className={`text-[11px] sm:text-[13px] font-bold mb-1 sm:mb-1.5 flex items-center justify-between w-full whitespace-nowrap gap-1.5 ${isTarget ? 'text-toss-blue' : 'text-tertiary'}`}>
                  <span>{item.label} 평균</span>
                  {isTarget && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 shrink-0 bg-toss-blue rounded-full animate-pulse shadow-[0_0_8px_rgba(49,130,246,0.5)]" />}
                </div>
                <span className={`text-[14.5px] sm:text-[18px] whitespace-nowrap ${isTarget ? 'text-toss-blue font-black tracking-tight' : 'text-primary font-extrabold'}`}>
                  {formatAvgPriceEok(item.val)}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f6" vertical={false} />
              <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
                tick={{ fill: '#8b95a1', fontSize: 10, fontWeight: 600 }} axisLine={{ stroke: '#e5e8eb' }}
                tickLine={false} tickMargin={6}
                tickFormatter={(ts: number) => { const d = new Date(ts); return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}`; }}
              />
              <YAxis yAxisId="price" orientation="left" domain={[Math.max(0, domainMin), domainMax]}
                tick={{ fill: '#8b95a1', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false}
                width={48} dx={-3}
                tickFormatter={(v: number) => v >= 1 ? `${v.toFixed(1)}억` : `${Math.round(v * 10000)}만`}
              />
              <YAxis yAxisId="volume" orientation="right" domain={[0, maxVol * 4]}
                tick={false} axisLine={false} tickLine={false} width={0}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  const vol = item?.volume;
                  return (
                    <div style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: 16, padding: '12px 16px', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', border: '1px solid rgba(229, 232, 235, 0.8)', backdropFilter: 'blur(12px)' }}>
                      <div style={{ color: '#8b95a1', fontSize: 12, marginBottom: 8, fontWeight: 700 }}>
                        {new Date(item?.ts).getFullYear()}.{String(new Date(item?.ts).getMonth()+1).padStart(2,'0')}월
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {item?.monthAvg && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                            <span style={{ color: '#8b95a1', fontSize: 13, fontWeight: 600 }}>평균가</span>
                            <span style={{ color: '#0d9488', fontSize: 15, fontWeight: 800 }}>{item.monthAvg.toFixed(2)}억</span>
                          </div>
                        )}
                        {vol != null && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                            <span style={{ color: '#8b95a1', fontSize: 13, fontWeight: 600 }}>거래량</span>
                            <span style={{ color: '#333d4b', fontSize: 14, fontWeight: 700 }}>{vol}건</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
                cursor={{ stroke: '#d1d6db', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Bar dataKey="volume" yAxisId="volume" fill="#0d9488" radius={[2, 2, 0, 0]} maxBarSize={12} opacity={0.15} isAnimationActive={false} />
              <Area type="monotone" dataKey="monthAvg" yAxisId="price" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrice)" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
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
                        const floorColor = getFloorColor(d.floor);
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
          {hoveredDot && (() => {
            const d = hoveredDot.data;
            const aptKey = normalizeAptName(displayAptName);
            const typeData = typeMap[aptKey]?.[String(d.rawArea)];
            const typeName = typeData ? (areaUnit === 'm2' ? typeData.typeM2 : (typeData.typePyeong || typeData.typeM2)) : undefined;
            return (
              <div style={{
                position: 'absolute', left: hoveredDot.x + 48, top: hoveredDot.y + 10,
                transform: 'translate(-50%, -100%) translateY(-12px)',
                background: '#ffffff', borderRadius: 10, padding: '10px 14px', border: '1px solid #f2f4f6',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
              }}>
                <div style={{ color: '#8b95a1', fontSize: 11, marginBottom: 4 }}>{d.fullDate}</div>
                <div style={{ color: '#191f28', fontSize: 16, fontWeight: 800, marginBottom: 3 }}>
                  {d.priceEok || `${d.price.toFixed(2)}억`}
                </div>
                <div style={{ color: '#8b95a1', fontSize: 11, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {typeName ? <span style={{ color: '#0d9488', fontWeight: 600 }}>{typeName}</span> : <span>{areaUnit === 'm2' ? `${d.rawArea}m²` : `${d.area}평`}</span>}
                  <span>·</span><span style={{ color: getFloorColor(d.floor) }}>{d.floor}층</span>
                  {d.dealType && <><span>·</span><span>{d.dealType}</span></>}
                </div>
              </div>
            );
          })()}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 mt-2 px-1 text-[12px] sm:text-[13px] font-bold text-tertiary">
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-5 sm:w-6 h-[1.5px] bg-toss-blue rounded"/>평균가</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3.5 h-3.5 bg-[#e5e8eb] rounded-sm"/>거래량</span>
        </div>
      </div>
    </div>
  );
}
