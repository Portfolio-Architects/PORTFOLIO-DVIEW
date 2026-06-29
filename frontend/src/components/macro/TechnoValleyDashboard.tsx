'use client';

import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { Building2, Percent, Coins, Users, Sparkles, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import RelocationTaxSimulator from '@/components/macro/RelocationTaxSimulator';

interface CircularProgressProps {
  percent: number;
  color: string;
}

function CircularProgress({ percent, color }: CircularProgressProps) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  
  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg className="w-10 h-10 transform -rotate-90" aria-hidden="true">
        <circle
          className="text-neutral-100 dark:text-zinc-800"
          strokeWidth="3.5"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="20"
          cy="20"
        />
        <circle
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx="20"
          cy="20"
        />
      </svg>
      <span className="absolute text-[9px] font-black text-primary">
        {Math.round(percent)}%
      </span>
    </div>
  );
}

// 1. Donut Chart Data
const DONUT_DATA = [
  { name: '반도체·첨단제조', value: 28.4, color: '#9a3412', count: 549, companies: ['에이에스엠코리아 - 자사빌딩', '케이씨텍 - 자사빌딩', '서플러스글로벌 - 자사빌딩', '에스앤에스텍 - 금강펜테리움 IX타워'] },
  { name: 'IT·소프트웨어', value: 35.2, color: '#ea580c', count: 681, companies: ['한국아이티에스 - 자사빌딩', '에프엠솔루션 - 금강펜테리움 IX타워', '위즈코리아 - SH타임스퀘어', '제이앤제이 테크 - SH타임스퀘어'] },
  { name: '바이오·헬스케어', value: 14.8, color: '#f59e0b', count: 286, companies: ['우정바이오 - 자사빌딩', '한미약품 연구센터 - 자사연구소', '서린바이오 - 서린바이오 글로벌센터', '녹십자웰빙 - 금강펜테리움 IX타워'] },
  { name: '지식기반 서비스', value: 12.1, color: '#fdba74', count: 234, companies: ['기술보증기금 동탄 - SH타임스퀘어', '한국디지털인증 - 금강펜테리움 IX타워', '특허법인 지산 - 금강펜테리움 IX타워', '영천동 종합건축사 - 현대실리콘앨리'] },
  { name: '정밀기기 및 기타', value: 9.5, color: '#e7e5e4', count: 183, companies: ['신도리코 R&D - 자사빌딩', '더브라이트 - 현대실리콘앨리', '레노텍 - SH타임스퀘어', '은빛무지개 - 금강펜테리움 IX타워'] }
];

// 2. Trend Line Chart Data
const TREND_DATA = [
  { date: '25.01', '금강 IX': 24.5, '실리콘앨리': 20.1, 'SH타임': 14.2, '금강IX_임대료': 3.70, '실리콘앨리_임대료': 3.50, 'SH타임_임대료': 3.30, '평균임대료': 3.50 },
  { date: '25.05', '금강 IX': 23.8, '실리콘앨리': 19.8, 'SH타임': 13.9, '금강IX_임대료': 3.72, '실리콘앨리_임대료': 3.55, 'SH타임_임대료': 3.35, '평균임대료': 3.55 },
  { date: '25.09', '금강 IX': 22.1, '실리콘앨리': 19.2, 'SH타임': 13.5, '금강IX_임대료': 3.78, '실리콘앨리_임대료': 3.60, 'SH타임_임대료': 3.42, '평균임대료': 3.60 },
  { date: '25.11', '금강 IX': 20.4, '실리콘앨리': 18.9, 'SH타임': 12.8, '금강IX_임대료': 3.80, '실리콘앨리_임대료': 3.60, 'SH타임_임대료': 3.40, '평균임대료': 3.60 },
  { date: '26.01', '금강 IX': 19.2, '실리콘앨리': 18.7, 'SH타임': 12.4, '금강IX_임대료': 3.85, '실리콘앨리_임대료': 3.65, 'SH타임_임대료': 3.45, '평균임대료': 3.65 },
  { date: '26.05', '금강 IX': 18.2, '실리콘앨리': 18.5, 'SH타임': 12.1, '금강IX_임대료': 3.88, '실리콘앨리_임대료': 3.68, 'SH타임_임대료': 3.48, '평균임대료': 3.68 }
];

const AVAILABLE_BUILDINGS = [
  { id: '금강 IX', name: '금강 IX타워', color: '#dc6e2d', rentKey: '금강IX_임대료' },
  { id: '실리콘앨리', name: '현대 실리콘앨리', color: '#f97316', rentKey: '실리콘앨리_임대료' },
  { id: 'SH타임', name: 'SH타임스퀘어', color: '#ffb076', rentKey: 'SH타임_임대료' },
  { id: '더퍼스트', name: '더퍼스트타워', color: '#a855f7', rentKey: '더퍼스트_임대료' },
  { id: 'SK V1', name: '동탄 SK V1', color: '#ec4899', rentKey: 'SKV1_임대료' },
  { id: '에이팩시티', name: '동탄 에이팩시티', color: '#10b981', rentKey: '에이팩시티_임대료' },
  { id: '테라타워', name: '동탄 테라타워', color: '#06b6d4', rentKey: '테라타워_임대료' },
  { id: 'IT타워', name: '동탄 IT타워', color: '#3b82f6', rentKey: 'IT타워_임대료' },
  { id: '메가비즈타워', name: '동탄 메가비즈타워', color: '#14b8a6', rentKey: '메가비즈타워_임대료' },
  { id: '비즈타워', name: '동탄 비즈타워', color: '#84cc16', rentKey: '비즈타워_임대료' }
];

export default function TechnoValleyDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [metricMode, setMetricMode] = useState<'vacancy' | 'rent'>('vacancy');
  const [timeframe, setTimeframe] = useState<'YTD' | '1Y' | '3Y' | '5Y' | 'ALL'>('ALL');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>(['금강 IX', '실리콘앨리', 'SH타임']);
  const [showDropdown, setShowDropdown] = useState(false);

  // Accordion portfolio states
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({
    'IT·소프트웨어': false,
    '반도체·첨단제조': true,
    '바이오·헬스케어': false,
    '지식기반 서비스': false,
    '정밀기기 및 기타': false
  });

  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    'IT·소프트웨어': 12,
    '반도체·첨단제조': 12,
    '바이오·헬스케어': 12,
    '지식기반 서비스': 12,
    '정밀기기 및 기타': 12
  });

  const handleToggleSector = (name: string) => {
    setExpandedSectors(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleExpandAll = () => {
    setExpandedSectors({
      'IT·소프트웨어': true,
      '반도체·첨단제조': true,
      '바이오·헬스케어': true,
      '지식기반 서비스': true,
      '정밀기기 및 기타': true
    });
  };

  const handleCollapseAll = () => {
    setExpandedSectors({
      'IT·소프트웨어': false,
      '반도체·첨단제조': false,
      '바이오·헬스케어': false,
      '지식기반 서비스': false,
      '정밀기기 및 기타': false
    });
  };

  const handleShowMore = (name: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [name]: prev[name] + 50
    }));
    
    // Smoothly scroll to center on the expanded accordion element
    setTimeout(() => {
      const element = document.getElementById(`sector-card-${name.replace(/\s+/g, '')}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  const handleResetLimit = (name: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [name]: 12
    }));
  };

  const { data: responseData } = useSWR('/api/technovalley/industry-distribution', (url: string) => fetch(url).then(res => res.json()), {
    revalidateOnFocus: false,
    dedupingInterval: 300000
  });

  const { data: trendResponse } = useSWR('/api/technovalley/trend', (url: string) => fetch(url).then(res => res.json()), {
    revalidateOnFocus: false,
    dedupingInterval: 300000
  });

  const donutData = useMemo(() => {
    if (responseData?.success && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return DONUT_DATA;
  }, [responseData]);

  const trendData = useMemo(() => {
    if (trendResponse?.success && Array.isArray(trendResponse.data)) {
      return trendResponse.data;
    }
    return TREND_DATA;
  }, [trendResponse]);

  const latestTrend = useMemo(() => {
    return trendData[trendData.length - 1] || TREND_DATA[TREND_DATA.length - 1];
  }, [trendData]);

  const [searchQuery, setSearchQuery] = useState('');

  const totalMatchedCount = useMemo(() => {
    return donutData.reduce((acc: number, sector: any) => {
      const companies = sector.companies || [];
      const matched = searchQuery
        ? companies.filter((co: string) => co.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : companies;
      return acc + matched.length;
    }, 0);
  }, [donutData, searchQuery]);

  const techRatio = useMemo(() => {
    const itVal = donutData.find((d: any) => d.name === 'IT·소프트웨어')?.value || 0;
    const semiVal = donutData.find((d: any) => d.name === '반도체·첨단제조')?.value || 0;
    const bioVal = donutData.find((d: any) => d.name === '바이오·헬스케어')?.value || 0;
    return parseFloat((itVal + semiVal + bioVal).toFixed(1));
  }, [donutData]);

  const totalCompanyCount = useMemo(() => {
    return donutData.reduce((acc: number, item: any) => acc + (item.count || 0), 0);
  }, [donutData]);

  const rentKPI = useMemo(() => {
    const latest = trendData[trendData.length - 1] || TREND_DATA[TREND_DATA.length - 1];
    const prev = trendData[trendData.length - 2] || TREND_DATA[TREND_DATA.length - 2];
    
    const latestRent = latest.평균임대료;
    const prevRent = prev.평균임대료;
    const changePercent = ((latestRent - prevRent) / prevRent * 100).toFixed(1);
    const isUp = latestRent >= prevRent;
    
    return {
      value: latestRent,
      changeText: `${isUp ? '▲' : '▼'} ${Math.abs(parseFloat(changePercent))}%`,
      isUp
    };
  }, [trendData]);

  const vacancyKPI = useMemo(() => {
    const latest = trendData[trendData.length - 1] || TREND_DATA[TREND_DATA.length - 1];
    const prev = trendData[trendData.length - 2] || TREND_DATA[TREND_DATA.length - 2];
    
    const latestVacancy = (latest['금강 IX'] + latest['실리콘앨리'] + latest['SH타임']) / 3;
    const prevVacancy = (prev['금강 IX'] + prev['실리콘앨리'] + prev['SH타임']) / 3;
    const change = latestVacancy - prevVacancy;
    const isUp = change >= 0;
    
    return {
      value: parseFloat(latestVacancy.toFixed(1)),
      changeText: `${isUp ? '▲' : '▼'} ${Math.abs(parseFloat(change.toFixed(2)))}%`,
      isUp
    };
  }, [trendData]);

  const activeItem = useMemo(() => {
    if (!activeCategory) return null;
    return donutData.find((d: any) => d.name === activeCategory) || null;
  }, [donutData, activeCategory]);
  
  // Lines are automatically displayed based on selectedBuildings dropdown comparison list.

  const filteredTrendData = useMemo(() => {
    if (timeframe === 'YTD') return trendData.slice(-2);
    if (timeframe === '1Y') return trendData.slice(-4);
    return trendData;
  }, [trendData, timeframe]);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 items-stretch">
      
      {/* ═══ LEFT PANEL: Donut Chart & KPI Cards (lg:col-span-6) ═══ */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        
        {/* Donut Chart Card */}
        <div className="bg-surface border border-border/80 p-6 rounded-[24px] shadow-sm flex flex-col justify-between h-[390px] shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hs-orange" />
              테크노밸리 입주 기업 업종 분포
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-neutral-100 dark:bg-zinc-800 text-tertiary px-2.5 py-1 rounded-full uppercase tracking-wide">
                업종 대분류 기준
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 flex-1 min-h-[280px]">
            {/* Donut Chart Container */}
            <div className="w-full sm:w-1/2 h-[250px] sm:h-[280px] relative flex items-center justify-center">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={84}
                      outerRadius={114}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry: any, index: number) => {
                        const isSelected = activeCategory === entry.name;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke={isSelected ? '#ffffff' : 'none'}
                            strokeWidth={isSelected ? 3 : 0}
                            opacity={activeCategory === null || isSelected ? 1 : 0.6}
                            style={{ outline: 'none', cursor: 'pointer' }}
                            onClick={() => setActiveCategory(isSelected ? null : entry.name)}
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-[168px] h-[168px] sm:w-[228px] sm:h-[228px] rounded-full border-[30px] border-border/10 animate-pulse" />
              )}
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none mt-1 select-none">
                {activeItem ? (
                  <>
                    <span className="text-[12px] sm:text-[13.5px] text-tertiary font-bold tracking-tight px-3 truncate max-w-[150px]">
                      {activeItem.name}
                    </span>
                    <span className="text-[14px] sm:text-[16px] font-black text-primary leading-tight mt-0.5">
                      {activeItem.value}%
                    </span>
                    <span className="text-[11.5px] sm:text-[13px] text-secondary font-extrabold mt-0.5 bg-neutral-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full">
                      {activeItem.count ? `${activeItem.count.toLocaleString()}개` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[12.5px] sm:text-[14px] text-tertiary font-bold tracking-tight">
                      총 기업 수
                    </span>
                    <span className="text-[14px] sm:text-[16px] font-black text-primary leading-tight mt-0.5">
                      {totalCompanyCount.toLocaleString()}개
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Responsive Divider Line */}
            <div className="w-11/12 sm:w-[1px] h-[1px] sm:h-36 bg-border/50 dark:bg-border/30 my-4 sm:my-0 shrink-0 self-center" />

            {/* Donut Legend */}
            <div className="w-full sm:w-1/2 flex flex-col gap-4 sm:gap-5 mt-4 sm:mt-0 max-w-[280px] mx-auto sm:mx-0">
              {activeCategory === null ? (
                donutData.map((item: any, index: number) => (
                  <div 
                    key={index} 
                    onClick={() => setActiveCategory(item.name)}
                    className="flex items-center justify-between text-[13px] sm:text-[14.5px] bg-slate-50/50 dark:bg-surface/30 px-3.5 py-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-border/30 sm:border border-border/10 hover:bg-slate-100/50 dark:hover:bg-white/5 cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-secondary font-bold truncate" title={item.name}>
                        {item.name}
                      </span>
                      <ChevronRight size={12} className="text-tertiary" />
                    </div>
                    <span className="font-extrabold text-primary shrink-0">{item.value}%</span>
                  </div>
                ))
              ) : (
                (() => {
                  const selectedItem = donutData.find((d: any) => d.name === activeCategory);
                  if (!selectedItem) return null;
                  return (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                      {/* Selected Legend Row */}
                      <div 
                        onClick={() => setActiveCategory(null)}
                        className="flex items-center justify-between text-[13px] sm:text-[14.5px] bg-orange-50/20 dark:bg-orange-500/5 px-3.5 py-2.5 rounded-xl border border-hs-orange/30 ring-2 ring-hs-orange/20 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: selectedItem.color }} 
                          />
                          <span className="text-secondary font-bold truncate">
                            {selectedItem.name}
                          </span>
                          <ChevronRight size={12} className="text-[#dc6e2d] rotate-90" />
                        </div>
                        <span className="font-extrabold text-[#dc6e2d] shrink-0">{selectedItem.value}%</span>
                      </div>

                      {/* Representative Companies List with premium styled cards */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] text-tertiary font-bold tracking-wider uppercase pl-1">대표 입주 기업</span>
                        <div className="flex flex-col gap-2">
                          {selectedItem.companies.slice(0, 4).map((co: string, cIdx: number) => (
                            <div 
                              key={cIdx} 
                              className="bg-surface border border-border/60 dark:border-border/30 px-4 py-2.5 rounded-2xl shadow-sm text-[12px] sm:text-[13px] font-black text-primary hover:border-hs-orange/40 hover:text-hs-orange transition-all text-left truncate"
                            >
                              {co}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>

        {/* 2x2 KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Card 1: Total Companies */}
          <div className="bg-surface border border-border/80 p-4 sm:p-4.5 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-tertiary font-bold">총 입주기업 수</span>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[16px] font-black text-primary">{totalCompanyCount.toLocaleString()}개사</span>
                <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#ea580c]/10 text-[#ea580c] dark:text-[#ea580c] flex items-center gap-0.5 shrink-0">
                  ▲ 24
                </span>
              </div>
            </div>
            <div className="flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
              <span className="text-[10px] text-tertiary font-bold tracking-tight">앵커 기업 15개사</span>
              <span className="text-[10px] text-tertiary font-bold tracking-tight">첨단 비중 {techRatio}%</span>
            </div>
          </div>

          {/* Card 2: Avg Rent */}
          <div className="bg-surface border border-border/80 p-4 sm:p-4.5 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-tertiary font-bold">평당 평균 임대료</span>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[16px] font-black text-primary">{rentKPI.value} 만원</span>
                <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${
                  rentKPI.isUp 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                }`}>
                  {rentKPI.changeText}
                </span>
              </div>
            </div>
            <div className="flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
              <span className="text-[10px] text-tertiary font-bold tracking-tight">최고 시세 3.68만</span>
              <span className="text-[10px] text-tertiary font-bold tracking-tight">최저 시세 3.50만</span>
            </div>
          </div>

          {/* Card 3: Avg Vacancy Rate */}
          <div className="bg-surface border border-border/80 p-4 sm:p-4.5 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-tertiary font-bold">평균 공실률 (AI 추정)</span>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[16px] font-black text-primary">{vacancyKPI.value}%</span>
                <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${
                  vacancyKPI.isUp 
                    ? 'bg-red-500/10 text-red-600 dark:text-red-500' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                }`}>
                  {vacancyKPI.changeText}
                </span>
              </div>
            </div>
            <div className="flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
              <span className="text-[10px] text-tertiary font-bold tracking-tight">SH타임 {latestTrend['SH타임']}%</span>
              <span className="text-[10px] text-tertiary font-bold tracking-tight">실리콘앨리 {latestTrend['실리콘앨리']}%</span>
            </div>
          </div>

          {/* Card 4: Activity Index */}
          <div className="bg-surface border border-border/80 p-4 sm:p-4.5 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-tertiary font-bold">지산 집적 활성 지수</span>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[16px] font-black text-primary">88.5 점</span>
                <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-500 flex items-center gap-0.5 shrink-0">
                  ▲ 3.2
                </span>
              </div>
            </div>
            <div className="flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
              <span className="text-[10px] text-tertiary font-bold tracking-tight">종합 S등급 (우수)</span>
              <span className="text-[10px] text-tertiary font-bold tracking-tight">집적도 92% (상)</span>
            </div>
          </div>

        </div>

      </div>

      {/* ═══ RIGHT PANEL: Trend Line Chart (lg:col-span-6) ═══ */}
      <div className="lg:col-span-6 bg-surface border border-border/80 p-6 rounded-[24px] shadow-sm flex flex-col justify-between min-h-[570px]">
        
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-hs-orange" />
              {metricMode === 'rent' ? '테크노밸리 평당 임대료 추이' : '테크노밸리 평균 공실률 추이 (AI 추정)'}
            </h3>
            <span className="text-[11px] text-tertiary font-bold">
              {metricMode === 'rent' ? '(단위: 만원/평)' : '(단위: %)'}
            </span>
          </div>

          {/* Mode toggle & Timeframe & Dropdown */}
          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            {/* Custom Building Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="px-2.5 py-1.5 rounded-lg border border-border/80 bg-body/80 text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer transition-all hover:bg-neutral-100 dark:hover:bg-zinc-800 text-secondary"
              >
                <span>단지 비교 ({selectedBuildings.length}개)</span>
                <ChevronDown className="w-3 h-3 text-tertiary" />
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-surface border border-border/80 rounded-2xl shadow-xl p-3 z-30 min-w-[200px] flex flex-col gap-1.5">
                  <div className="text-[10px] text-tertiary font-bold px-1 border-b border-border/40 pb-1.5 mb-1 flex justify-between items-center">
                    <span>비교 대상 지식산업센터</span>
                    <button 
                      onClick={() => setSelectedBuildings(['금강 IX', '실리콘앨리', 'SH타임'])}
                      className="text-[9px] text-[#ea580c] hover:underline cursor-pointer"
                    >
                      초기화
                    </button>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-thin">
                    {AVAILABLE_BUILDINGS.map(b => {
                      const isChecked = selectedBuildings.includes(b.id);
                      return (
                        <label 
                          key={b.id} 
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-body cursor-pointer transition-all select-none text-[11px] font-bold text-secondary"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (selectedBuildings.length > 1) {
                                  setSelectedBuildings(selectedBuildings.filter(id => id !== b.id));
                                }
                              } else {
                                setSelectedBuildings([...selectedBuildings, b.id]);
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-hs-orange focus:ring-hs-orange border-border/80"
                          />
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                          <span>{b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex bg-body/80 p-0.5 border border-border/40 rounded-lg shadow-inner">
              <button
                onClick={() => setMetricMode('vacancy')}
                className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-md transition-all ${
                  metricMode === 'vacancy' 
                    ? 'bg-surface text-primary shadow-sm' 
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                공실률 (개발 중)
              </button>
              <button
                onClick={() => setMetricMode('rent')}
                className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-md transition-all ${
                  metricMode === 'rent' 
                    ? 'bg-surface text-primary shadow-sm' 
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                임대료 (평당)
              </button>
            </div>

            <div className="flex bg-body/80 p-0.5 border border-border/40 rounded-lg shadow-inner">
              {(['YTD', '1Y', 'ALL'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 text-[10.5px] font-extrabold rounded-md transition-all ${
                    timeframe === tf 
                      ? 'bg-surface text-primary shadow-sm' 
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 border-b border-border/40 pb-3">
          {AVAILABLE_BUILDINGS.filter(b => selectedBuildings.includes(b.id)).map(b => (
            <div key={b.id} className="flex items-center gap-1.5 text-[11px] font-extrabold text-secondary py-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
              <span>{b.name}</span>
            </div>
          ))}
          
          {metricMode === 'rent' && (
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#737373] py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#737373] shrink-0" />
              <span>평균 임대료</span>
            </div>
          )}
        </div>

        {/* Line Chart Area */}
        <div className="flex-1 w-full h-[320px] relative flex items-end">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <LineChart data={filteredTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10.5, fontWeight: 700, fill: '#6b7280' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  domain={metricMode === 'vacancy' ? [10, 26] : [3.0, 4.0]}
                  tick={{ fontSize: 10.5, fontWeight: 700, fill: '#6b7280' }}
                  unit={metricMode === 'vacancy' ? '%' : '만'}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: '#e5e8eb', 
                    borderRadius: '16px', 
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                  }}
                />
                {metricMode === 'vacancy' ? (
                  <>
                    {AVAILABLE_BUILDINGS.filter(b => selectedBuildings.includes(b.id)).map(b => (
                      <Line 
                        key={b.id}
                        type="monotone" 
                        dataKey={b.id} 
                        name={b.name}
                        stroke={b.color} 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                        activeDot={{ r: 6 }} 
                      />
                    ))}
                  </>
                ) : (
                  <>
                    {AVAILABLE_BUILDINGS.filter(b => selectedBuildings.includes(b.id)).map(b => (
                      <Line 
                        key={b.id}
                        type="monotone" 
                        dataKey={b.rentKey} 
                        name={b.name}
                        stroke={b.color} 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                        activeDot={{ r: 6 }} 
                      />
                    ))}
                    <Line 
                      type="monotone" 
                      dataKey="평균임대료" 
                      name="평균 임대료"
                      stroke="#737373" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 5 }} 
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-[350px] border border-border/20 rounded-xl flex items-end justify-between p-4 gap-2 animate-pulse">
              {[30, 45, 60, 40, 75, 50, 90, 65, 80, 55, 70, 85].map((h, i) => (
                <div 
                  key={i} 
                  style={{ height: `${h}%` }} 
                  className="flex-1 rounded-t bg-border/20" 
                />
              ))}
            </div>
          )}
        </div>

        {metricMode === 'vacancy' && (
          <div className="mt-4 p-3 bg-hs-orange/5 border border-hs-orange/10 rounded-2xl flex items-start gap-2.5">
            <span className="inline-block p-1 bg-hs-orange/10 text-hs-orange rounded-lg shrink-0 mt-0.5">
              <Sparkles size={14} className="animate-pulse" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-black text-primary">AI 프록시(Proxy) 기반 공실률 추정 모델</span>
              <span className="text-[10px] text-tertiary font-bold leading-normal">
                국가건물에너지 통합정보서비스(전기 사용 패턴 70%) 및 국토교통부 전월세 실거래 신고 빈도/회전율(30%)을 융합해 실시간 예측한 건물별 공실률 추정치입니다. (비율이 낮을수록 활성화 상태)
              </span>
            </div>
          </div>
        )}

      </div>

      {/* 업종 구분별 기업 리스트 아코디언 (Full Width) */}
      <div className="lg:col-span-12 bg-surface border border-border/80 p-6 rounded-[24px] shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border/40">
          <div>
            <h3 className="text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hs-orange" />
              업종 구분별 기업 리스트
            </h3>
            <p className="text-[11px] text-tertiary font-bold mt-0.5">
              각 업종 카테고리를 클릭하여 입주 기업 전체 목록을 확인하실 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleExpandAll}
              className="text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-border bg-body hover:bg-neutral-100 dark:hover:bg-zinc-800 text-secondary transition-all"
            >
              전체 펼치기
            </button>
            <button
              onClick={handleCollapseAll}
              className="text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-border bg-body hover:bg-neutral-100 dark:hover:bg-zinc-800 text-secondary transition-all"
            >
              전체 접기
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-md my-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="기업명 또는 건물명/도로명 검색..."
            className="w-full bg-body border border-border/80 rounded-xl py-2 pl-9 pr-9 text-[12px] sm:text-[13px] text-primary focus:outline-none focus:border-hs-orange/40 focus:ring-1 focus:ring-hs-orange/30 transition-all font-bold"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-3.5 h-3.5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {searchQuery && totalMatchedCount === 0 ? (
          <div className="text-center py-12 bg-body/20 rounded-2xl border border-border/40">
            <p className="text-[12px] sm:text-[13px] font-bold text-tertiary">
              검색 조건에 맞는 기업이 없습니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {donutData.map((sector: any) => {
              const companies = sector.companies || [];
              const filteredCompanies = searchQuery
                ? companies.filter((co: string) => co.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                : companies;

              if (searchQuery && filteredCompanies.length === 0) {
                return null;
              }

              const isExpanded = searchQuery ? true : !!expandedSectors[sector.name];
              const visibleCount = visibleCounts[sector.name] || 12;
              const visibleCompanies = searchQuery ? filteredCompanies : filteredCompanies.slice(0, visibleCount);
              const hasMore = !searchQuery && filteredCompanies.length > visibleCount;

              return (
                <div 
                  key={sector.name} 
                  id={`sector-card-${sector.name.replace(/\s+/g, '')}`}
                  className="border border-border/60 rounded-2xl overflow-hidden bg-body/20 dark:bg-zinc-900/10 transition-all"
                >
                {/* Accordion Header */}
                <button
                  onClick={() => handleToggleSector(sector.name)}
                  className="w-full flex items-center justify-between p-4 bg-surface hover:bg-body/30 dark:hover:bg-zinc-800/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: sector.color }} 
                    />
                    <span className="text-[13.5px] font-black text-primary">{sector.name}</span>
                    <span className="text-[11px] font-extrabold text-secondary bg-body dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                      {searchQuery ? `${filteredCompanies.length}개 매칭` : `${companies.length}개 기업`}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-secondary" />
                  ) : (
                    <ChevronDown size={16} className="text-secondary" />
                  )}
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="p-4 bg-surface/50 border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                    {companies.length === 0 ? (
                      <p className="text-[12px] text-tertiary text-center py-6">
                        등록된 기업 정보가 없습니다.
                      </p>
                    ) : (
                      <>
                        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pr-1.5 overscroll-y-contain ${
                          visibleCount > 12 ? 'max-h-[380px] overflow-y-auto custom-scrollbar' : ''
                        }`}>
                          {visibleCompanies.map((co: string, idx: number) => {
                            const [companyName, companyAddr] = co.split(' - ');
                            const firstLetter = companyName ? companyName.charAt(0) : '';

                            return (
                              <div
                                key={idx}
                                className="bg-surface border border-border/55 p-3 rounded-[16px] hover:border-hs-orange/30 hover:shadow-sm hover:scale-[1.01] transition-all flex items-center gap-3 min-w-0"
                              >
                                {/* Company Icon (Dynamic Letter Avatar with Gradient) */}
                                <div 
                                  className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[12.5px] font-black text-white select-none shadow-sm"
                                  style={{ 
                                    background: `linear-gradient(135deg, ${sector.color}dd, ${sector.color})`
                                  }}
                                >
                                  {firstLetter}
                                </div>
                                
                                {/* Company Info */}
                                <div className="flex flex-col min-w-0 flex-1 justify-center">
                                  <span className="text-[12.5px] font-black text-primary truncate leading-tight" title={companyName}>
                                    {companyName}
                                  </span>
                                  {companyAddr && (
                                    <span className="text-[10px] text-tertiary font-bold truncate mt-1 leading-none" title={companyAddr}>
                                      {companyAddr}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pagination Buttons */}
                        {(hasMore || (!searchQuery && visibleCount > 12)) && (
                          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border/30">
                            {hasMore && (
                              <button
                                onClick={() => handleShowMore(sector.name)}
                                className="text-[11px] font-black text-hs-orange bg-hs-orange-light px-4 py-2 rounded-xl border border-hs-orange/10 hover:bg-hs-orange/10 transition-all"
                              >
                                더보기 ({companies.length - visibleCount}개 남음)
                              </button>
                            )}
                            {!searchQuery && visibleCount > 12 && (
                              <button
                                onClick={() => handleResetLimit(sector.name)}
                                className="text-[11px] font-black text-secondary bg-body px-4 py-2 rounded-xl border border-border hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all"
                              >
                                목록 접기
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* 과밀억제권역 기업 동탄 이전 세제 시뮬레이터 (Full Width) */}
      <div className="lg:col-span-12 mt-6">
        <RelocationTaxSimulator />
      </div>

    </div>
  );
}
