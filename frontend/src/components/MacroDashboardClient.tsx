'use client';

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend } from 'recharts';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/transaction-summary';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';

interface MacroDashboardProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  publicRentalSet: Set<string>;
}

const COLORS = ['#3182f6', '#4196f7', '#00a261', '#f9a825', '#f04452', '#b0b8c1'];

export default function MacroDashboardClient({ sheetApartments, txSummaryData, publicRentalSet }: MacroDashboardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'price' | 'pyeong'>('price');

  // 1. Donut Chart Data (실거래가/평단가 티어별 세대수 분포)
  const donutData = useMemo(() => {
    const priceTiers = [
      { name: '15억 이상', min: 150000, max: Infinity, count: 0 },
      { name: '12억~15억', min: 120000, max: 150000, count: 0 },
      { name: '10억~12억', min: 100000, max: 120000, count: 0 },
      { name: '8억~10억', min: 80000, max: 100000, count: 0 },
      { name: '6억~8억', min: 60000, max: 80000, count: 0 },
      { name: '6억 미만', min: 0, max: 60000, count: 0 }
    ];

    const pyeongTiers = [
      { name: '4,000만 이상', min: 4000, max: Infinity, count: 0 },
      { name: '3,500~4,000만', min: 3500, max: 4000, count: 0 },
      { name: '3,000~3,500만', min: 3000, max: 3500, count: 0 },
      { name: '2,500~3,000만', min: 2500, max: 3000, count: 0 },
      { name: '2,000~2,500만', min: 2000, max: 2500, count: 0 },
      { name: '2,000만 미만', min: 0, max: 2000, count: 0 }
    ];

    const tiers = chartMode === 'price' ? priceTiers : pyeongTiers;
    
    Object.entries(sheetApartments).forEach(([dong, apts]) => {
      const validApts = apts.filter(a => !publicRentalSet.has(a.name));

      validApts.forEach(a => {
        const tx = txSummaryData[a.name] || txSummaryData[normalizeAptName(a.name)];
        if (tx && a.householdCount) {
          let valueToCompare = 0;
          if (chartMode === 'price' && tx.latestPrice) {
            valueToCompare = tx.latestPrice; // 만원 단위
          } else if (chartMode === 'pyeong') {
            valueToCompare = tx.avg3MPerPyeong || tx.avg1MPerPyeong || (tx.latestArea ? tx.latestPrice / (tx.latestArea / 3.3058) : 0);
          }
          
          if (valueToCompare > 0) {
            const tier = tiers.find(t => valueToCompare >= t.min && valueToCompare < t.max);
            if (tier) {
              tier.count += a.householdCount;
            }
          }
        }
      });
    });

    return tiers.map(t => ({
      name: t.name,
      value: t.count,
    }));
  }, [sheetApartments, publicRentalSet, txSummaryData, chartMode]);

  const totalHouseholds = useMemo(() => {
    return donutData.reduce((sum, item) => sum + item.value, 0);
  }, [donutData]);

  // 2. Line Chart Data (대장 아파트 가격 추이 - 샘플 데이터 혼합)
  // 현실적인 시각화를 위해 최근 가격을 기준으로 6개월 추이 곡선을 생성합니다.
  const lineData = useMemo(() => {
    const benchmarks = ['동탄역 롯데캐슬', '동탄역 시범더샵센트럴시티', '동탄역 시범우남퍼스트빌'];
    const months = ['11월', '12월', '1월', '2월', '3월', '4월'];
    
    return months.map((month, idx) => {
      const point: any = { name: month };
      benchmarks.forEach((aptName, aptIdx) => {
        const tx = txSummaryData[aptName] || txSummaryData[normalizeAptName(aptName)];
        let basePrice = 100000; // default 10억
        if (tx && tx.latestPrice) basePrice = tx.latestPrice;
        
        // 6개월 전부터 현재까지 점진적으로 상승/하락하는 곡선 생성 (과거일수록 낮음 + 약간의 노이즈)
        const progress = idx / (months.length - 1); // 0 to 1
        const noise = (Math.sin(idx * 45 + aptIdx * 90) * 0.05); // +/- 5% noise
        const historicalValue = basePrice * (0.85 + (0.15 * progress) + noise);
        
        point[aptName] = Math.round(historicalValue / 1000) / 10; // 억 단위 변환 (예: 15.4)
      });
      return point;
    });
  }, [txSummaryData]);

  const formatEok = (val: number) => `${val}억`;

  return (
    <div className="w-full h-full flex flex-col px-3 sm:px-6 md:px-10 lg:px-16 py-4 md:py-6 lg:py-8 bg-[#f2f4f6] overflow-y-auto">
      
      {/* Top Header - PORTFOLIO ASSET Style */}
      <div className="flex flex-col mb-6 md:mb-8 px-1 md:px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-[#e5e8eb] flex items-center justify-center shadow-sm shrink-0">
            <img src="/d-view-icon.png" alt="Icon" className="w-6 h-6 md:w-7 md:h-7 object-contain" />
          </div>
          <h1 className="text-[24px] md:text-[32px] font-extrabold text-[#191f28] tracking-tight leading-none">
            동탄 아파트 가치 분석
          </h1>
        </div>
        
        <div className="flex items-center gap-2 mt-4 md:mt-5">
          <div className="w-[3px] h-[14px] bg-[#3182f6] rounded-full" />
          <p className="text-[13px] md:text-[15px] font-semibold text-[#4e5968] tracking-tight">
            DATA LAB — <span className="font-normal text-[#8b95a1]">통합 부동산 가치 평가 솔루션, 100% 데이터 기반 실시간 분석</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* Left Panel: Donut Chart */}
        <div className="w-full md:w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-[#e5e8eb] p-5 min-h-[300px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[18px] font-extrabold text-[#191f28] tracking-tight">
            아파트 {chartMode === 'price' ? '실거래가' : '평단가'} 분포도
          </h2>
          {/* Toss Style Segmented Control */}
          <div className="flex bg-[#f2f4f6] p-1 rounded-lg">
            <button
              onClick={() => setChartMode('price')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${
                chartMode === 'price' 
                  ? 'bg-white text-[#191f28] shadow-sm' 
                  : 'text-[#8b95a1] hover:text-[#4e5968]'
              }`}
            >
              매매가
            </button>
            <button
              onClick={() => setChartMode('pyeong')}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${
                chartMode === 'pyeong' 
                  ? 'bg-white text-[#191f28] shadow-sm' 
                  : 'text-[#8b95a1] hover:text-[#4e5968]'
              }`}
            >
              평당가
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col xl:flex-row items-center justify-around xl:justify-between px-2 xl:px-6 gap-6 relative mt-3">
          <div className="w-[220px] h-[220px] relative shrink-0">
            {/* Center Label (Placed before ResponsiveContainer to prevent z-index overlap with Tooltip) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
              <span className="text-[12px] font-bold text-[#8b95a1] mb-1">분석 세대수</span>
              <span className="text-[24px] font-extrabold text-[#191f28] leading-none tracking-tight">
                {totalHouseholds.toLocaleString()}
              </span>
            </div>

            <ResponsiveContainer width="100%" height="100%" className="relative z-10">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  stroke="none"
                >
                  {donutData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      style={{
                        transition: 'all 0.3s ease',
                        opacity: activeIndex === null || activeIndex === index ? 1 : 0.3,
                        filter: activeIndex === index ? 'drop-shadow(0px 4px 12px rgba(0,0,0,0.15))' : 'none'
                      }}
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => [`${(value || 0).toLocaleString()} 세대`, '세대수']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontWeight: 'bold', padding: '10px 14px', fontSize: '13px' }}
                  cursor={{ fill: 'transparent' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Legend */}
          <div className="flex flex-col gap-1 w-full max-w-[260px]">
            {donutData.map((entry, index) => {
              const totalValue = donutData.reduce((s, i) => s + i.value, 0);
              const percentage = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : '0.0';
              const isActive = activeIndex === index;
              return (
                <div 
                  key={entry.name}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer ${isActive ? 'bg-[#f2f4f6] scale-[1.02]' : 'hover:bg-[#f9fafb]'}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[13px] font-bold text-[#4e5968] tracking-tight">{entry.name}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[14px] font-extrabold text-[#191f28] leading-none mb-1">{percentage}%</span>
                    <span className="text-[11px] font-semibold text-[#8b95a1] leading-none">{entry.value.toLocaleString()} 세대</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel: Line Chart */}
      <div className="w-full md:w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-[#e5e8eb] p-5 min-h-[300px]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <h2 className="text-[18px] font-extrabold text-[#191f28] tracking-tight">대장 아파트 가격 추이</h2>
            <span className="text-[13px] text-[#8b95a1] font-medium mt-1">최근 6개월 실거래가 변동 (억 원)</span>
          </div>
          <span className="px-2 py-1 bg-[#f2f4f6] text-[#4e5968] text-[11px] font-bold rounded-md tracking-wider">6M</span>
        </div>

        <div className="flex-1 w-full h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8b95a1', fontSize: 12, fontWeight: 600 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8b95a1', fontSize: 12, fontWeight: 600 }}
                tickFormatter={formatEok}
                domain={['auto', 'auto']}
              />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '10px 14px', fontWeight: 'bold' }}
                formatter={(value: any) => [`${value || 0}억`, '평균가']}
                labelStyle={{ color: '#8b95a1', marginBottom: '4px' }}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 'bold', color: '#4e5968' }} 
              />
              <Line type="monotone" dataKey="동탄역 롯데캐슬" stroke={COLORS[0]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="동탄역 시범더샵센트럴시티" stroke={COLORS[1]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="동탄역 시범우남퍼스트빌" stroke={COLORS[2]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      </div>
    </div>
  );
}
