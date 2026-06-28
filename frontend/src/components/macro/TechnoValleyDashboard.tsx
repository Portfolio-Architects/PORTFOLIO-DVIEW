'use client';

import React, { useState, useMemo } from 'react';
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
  { date: '25.01', '금강 IX': 24.5, '실리콘앨리': 20.1, 'SH타임': 14.2, '평균임대료': 3.5 },
  { date: '25.05', '금강 IX': 23.8, '실리콘앨리': 19.8, 'SH타임': 13.9, '평균임대료': 3.55 },
  { date: '25.09', '금강 IX': 22.1, '실리콘앨리': 19.2, 'SH타임': 13.5, '평균임대료': 3.6 },
  { date: '25.11', '금강 IX': 20.4, '실리콘앨리': 18.9, 'SH타임': 12.8, '평균임대료': 3.6 },
  { date: '26.01', '금강 IX': 19.2, '실리콘앨리': 18.7, 'SH타임': 12.4, '평균임대료': 3.65 },
  { date: '26.05', '금강 IX': 18.2, '실리콘앨리': 18.5, 'SH타임': 12.1, '평균임대료': 3.68 }
];

export default function TechnoValleyDashboard() {
  const [metricMode, setMetricMode] = useState<'vacancy' | 'rent'>('vacancy');
  const [timeframe, setTimeframe] = useState<'YTD' | '1Y' | '3Y' | '5Y' | 'ALL'>('ALL');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

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

  const { data: responseData, mutate } = useSWR('/api/technovalley/industry-distribution', (url: string) => fetch(url).then(res => res.json()), {
    revalidateOnFocus: false,
    dedupingInterval: 300000
  });

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      const res = await fetch('/api/technovalley/industry-distribution?refresh=true');
      const json = await res.json();
      if (json.success) {
        await mutate(json, false);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to sync Google Sheets:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const donutData = useMemo(() => {
    if (responseData?.success && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return DONUT_DATA;
  }, [responseData]);

  const techRatio = useMemo(() => {
    const itVal = donutData.find((d: any) => d.name === 'IT·소프트웨어')?.value || 0;
    const semiVal = donutData.find((d: any) => d.name === '반도체·첨단제조')?.value || 0;
    const bioVal = donutData.find((d: any) => d.name === '바이오·헬스케어')?.value || 0;
    return parseFloat((itVal + semiVal + bioVal).toFixed(1));
  }, [donutData]);
  
  // Toggles for line display
  const [activeLines, setActiveLines] = useState<Record<string, boolean>>({
    '금강 IX': true,
    '실리콘앨리': true,
    'SH타임': true,
    '평균임대료': true
  });

  const handleToggleLine = (lineName: string) => {
    setActiveLines(prev => ({
      ...prev,
      [lineName]: !prev[lineName]
    }));
  };

  const filteredTrendData = useMemo(() => {
    if (timeframe === 'YTD') return TREND_DATA.slice(-2);
    if (timeframe === '1Y') return TREND_DATA.slice(-4);
    return TREND_DATA;
  }, [timeframe]);

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
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                  syncSuccess 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                    : 'bg-hs-orange-light text-hs-orange hover:bg-hs-orange/20 border border-hs-orange/10'
                }`}
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-hs-orange" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    동기화 중...
                  </>
                ) : syncSuccess ? (
                  '동기화 완료 ✓'
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-hs-orange" />
                    구글 시트 동기화
                  </>
                )}
              </button>
              <span className="text-[10px] font-black bg-neutral-100 dark:bg-zinc-800 text-tertiary px-2.5 py-1 rounded-full uppercase tracking-wide">
                업종 대분류 기준
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 flex-1 min-h-[280px]">
            {/* Donut Chart Container */}
            <div className="w-full sm:w-1/2 h-[250px] sm:h-[280px] relative flex items-center justify-center">
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
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none mt-1">
                <span className="text-[12.5px] sm:text-[14px] text-tertiary font-bold tracking-tight">첨단·IT 비율</span>
                <span className="text-[28px] sm:text-[32px] font-black text-primary leading-tight mt-0.5">{techRatio}%</span>
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
          
          {/* Card 1: Avg Rent */}
          <div className="bg-surface border border-border/80 p-4.5 rounded-[20px] shadow-sm flex items-center justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-tertiary font-bold">평당 평균 임대료</span>
              <span className="text-[16px] font-black text-primary">3.6 만원</span>
            </div>
            <CircularProgress percent={76} color="#ea580c" /> {/* Dark Orange */}
          </div>

          {/* Card 2: Tax Benefit */}
          <div className="bg-surface border border-border/80 p-4.5 rounded-[20px] shadow-sm flex items-center justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-tertiary font-bold">청년·창업 세제 감면</span>
              <span className="text-[16px] font-black text-primary">최대 75%</span>
            </div>
            <CircularProgress percent={75} color="#dc6e2d" /> {/* BI Orange */}
          </div>

          {/* Card 3: Match Rate */}
          <div className="bg-surface border border-border/80 p-4.5 rounded-[20px] shadow-sm flex items-center justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-tertiary font-bold">공동임차 매칭 성공</span>
              <span className="text-[16px] font-black text-primary">85.4%</span>
            </div>
            <CircularProgress percent={85} color="#ffb076" /> {/* Light Orange */}
          </div>

          {/* Card 4: Activity Index */}
          <div className="bg-surface border border-border/80 p-4.5 rounded-[20px] shadow-sm flex items-center justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-tertiary font-bold">지산 집적 활성 지수</span>
              <span className="text-[16px] font-black text-primary">88.5 점</span>
            </div>
            <CircularProgress percent={88} color="#f97316" /> {/* Medium Orange */}
          </div>

        </div>

      </div>

      {/* ═══ RIGHT PANEL: Trend Line Chart (lg:col-span-6) ═══ */}
      <div className="lg:col-span-6 bg-surface border border-border/80 p-6 rounded-[24px] shadow-sm flex flex-col justify-between min-h-[570px]">
        
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hs-orange" />
              동탄 영천동 테크노밸리 공실률 및 임대료 추이
            </h3>
            <span className="text-[11px] text-tertiary font-bold">
              영천동 지식산업센터 모니터링 데이터 분석 (단위: %, 만원/평)
            </span>
          </div>

          {/* Mode toggle & Timeframe */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
            <div className="flex bg-body/80 p-0.5 border border-border/40 rounded-lg shadow-inner">
              <button
                onClick={() => setMetricMode('vacancy')}
                className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-md transition-all ${
                  metricMode === 'vacancy' 
                    ? 'bg-surface text-primary shadow-sm' 
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                공실률 (%)
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

        {/* Legend Filters */}
        <div className="flex flex-wrap gap-2.5 mb-4 border-b border-border/40 pb-3">
          {metricMode === 'vacancy' ? (
            <>
              <button
                onClick={() => handleToggleLine('금강 IX')}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeLines['금강 IX']
                    ? 'bg-hs-orange-light border-[#dc6e2d]/30 text-[#dc6e2d]'
                    : 'bg-body/30 border-transparent text-tertiary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#dc6e2d]" />
                금강 IX타워
              </button>
              <button
                onClick={() => handleToggleLine('실리콘앨리')}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeLines['실리콘앨리']
                    ? 'bg-hs-orange-light border-[#f97316]/30 text-[#f97316]'
                    : 'bg-body/30 border-transparent text-tertiary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                현대 실리콘앨리
              </button>
              <button
                onClick={() => handleToggleLine('SH타임')}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeLines['SH타임']
                    ? 'bg-hs-orange-light border-[#ffb076]/30 text-[#ffb076]'
                    : 'bg-body/30 border-transparent text-tertiary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb076]" />
                SH타임스퀘어
              </button>
            </>
          ) : (
            <button
              onClick={() => handleToggleLine('평균임대료')}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeLines['평균임대료']
                  ? 'bg-hs-orange-light border-[#dc6e2d]/30 text-[#dc6e2d]'
                  : 'bg-body/30 border-transparent text-tertiary'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#dc6e2d]" />
              전체 평당 평균임대료 (만원)
            </button>
          )}
        </div>

        {/* Line Chart Area */}
        <div className="flex-1 w-full h-[390px] relative">
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
                  {activeLines['금강 IX'] && (
                    <Line 
                      type="monotone" 
                      dataKey="금강 IX" 
                      stroke="#dc6e2d" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6 }} 
                    />
                  )}
                  {activeLines['실리콘앨리'] && (
                    <Line 
                      type="monotone" 
                      dataKey="실리콘앨리" 
                      stroke="#f97316" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6 }} 
                    />
                  )}
                  {activeLines['SH타임'] && (
                    <Line 
                      type="monotone" 
                      dataKey="SH타임" 
                      stroke="#ffb076" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6 }} 
                    />
                  )}
                </>
              ) : (
                <>
                  {activeLines['평균임대료'] && (
                    <Line 
                      type="monotone" 
                      dataKey="평균임대료" 
                      stroke="#dc6e2d" 
                      strokeWidth={3.5} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6 }} 
                    />
                  )}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

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

        <div className="flex flex-col gap-3">
          {donutData.map((sector: any) => {
            const isExpanded = !!expandedSectors[sector.name];
            const visibleCount = visibleCounts[sector.name] || 12;
            const companies = sector.companies || [];
            const visibleCompanies = companies.slice(0, visibleCount);
            const hasMore = companies.length > visibleCount;

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
                      {companies.length}개 기업
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
                          {visibleCompanies.map((co: string, idx: number) => (
                            <div
                              key={idx}
                              className="bg-surface border border-border/55 px-4 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-black text-primary hover:border-hs-orange/30 hover:text-hs-orange transition-all truncate text-left"
                              title={co}
                            >
                              {co}
                            </div>
                          ))}
                        </div>

                        {/* Pagination Buttons */}
                        {(hasMore || visibleCount > 12) && (
                          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border/30">
                            {hasMore && (
                              <button
                                onClick={() => handleShowMore(sector.name)}
                                className="text-[11px] font-black text-hs-orange bg-hs-orange-light px-4 py-2 rounded-xl border border-hs-orange/10 hover:bg-hs-orange/10 transition-all"
                              >
                                더보기 ({companies.length - visibleCount}개 남음)
                              </button>
                            )}
                            {visibleCount > 12 && (
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
      </div>

    </div>
  );
}
