'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  BarChart3, Globe, ShieldCheck, Eye, MousePointerClick, TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function AnalyticsDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Local fallback mock data generator for GA4 to prevent infinite loading on fetch failure
  const generateLocalMockData = () => {
    const daily = [];
    const monthly = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const seed = Math.abs(dateStr.split('-').reduce((acc, val) => acc + parseInt(val, 10), 0));
      const activeUsers = 30 + (seed % 50);
      const pageViews = activeUsers * 3 + (seed % 100);
      daily.push({ date: dateStr, activeUsers, pageViews });
    }
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const seed = Math.abs(monthStr.split('-').reduce((acc, val) => acc + parseInt(val, 10), 0));
      const mau = 500 + (seed % 700);
      const avgDau = Math.round(40 + (seed % 50));
      monthly.push({ month: monthStr, mau, avgDau });
    }
    return { daily, monthly, totalViews: 12450, avgSessionDuration: '2m 15s', isMock: true };
  };

  // GA4 Traffic Metrics SWR fetch
  const { data: gaData } = useSWR('/api/admin/analytics', async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[GA4 API] Fetch failed, falling back to client mock:', res.status);
        return generateLocalMockData();
      }
      const json = await res.json();
      return json.data || generateLocalMockData();
    } catch (err) {
      console.error('[GA4 API] Fetch error, falling back to client mock:', err);
      return generateLocalMockData();
    }
  }, { revalidateOnFocus: false, dedupingInterval: 30000 });

  const generateLocalMockSearchConsoleData = () => {
    return {
      indexStatus: {
        totalIndexed: 145,
        notIndexed: 34,
      },
      searchMetrics: {
        clicks: 842,
        impressions: 12450,
        ctr: 6.8,
        averagePosition: 4.2,
      },
      isMock: true,
    };
  };

  // Google Search Console API data SWR fetch
  const { data: scData } = useSWR('/api/admin/search-console', async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[Search Console API] Fetch failed, falling back to client mock:', res.status);
        return generateLocalMockSearchConsoleData();
      }
      const json = await res.json();
      return json && json.success === false ? generateLocalMockSearchConsoleData() : (json || generateLocalMockSearchConsoleData());
    } catch (err) {
      console.error('[Search Console API] Fetch error, falling back to client mock:', err);
      return generateLocalMockSearchConsoleData();
    }
  }, { revalidateOnFocus: false, dedupingInterval: 30000 });

  if (!mounted) {
    return <div className="animate-pulse h-[600px] bg-surface rounded-2xl border border-border shadow-sm" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* GA4 Real-time Traffic Metrics Dashboard */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#f2f4f6] dark:border-zinc-800">
          <h2 className="text-[17px] font-black text-primary flex items-center gap-2">
            <BarChart3 className="text-[#008262]" size={20} />
            실시간 서비스 트래픽 (GA4)
          </h2>
          {gaData && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              gaData.isMock ? 'bg-[#fff4e6] text-[#ff8a3d]' : 'bg-[#f0fdf4] text-toss-green dark:bg-emerald-950/20 dark:text-emerald-400'
            }`}>
              <ShieldCheck size={12} />
              {gaData.isMock ? '자가 진단 모드 (Mock)' : 'Google Analytics 4 실시간 연동'}
            </span>
          )}
        </div>

        {!gaData ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-tertiary font-bold ml-2">GA4 트래픽 정보 로드 중...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1. MAU */}
              <div className="bg-body p-3.5 rounded-xl border border-transparent hover:border-border transition-all">
                <div className="text-[11.5px] font-bold text-tertiary mb-1">MAU</div>
                <div className="text-[22px] font-extrabold text-primary font-mono">
                  {gaData.monthly && gaData.monthly.length > 0 
                    ? gaData.monthly[gaData.monthly.length - 1].mau.toLocaleString() 
                    : '0'}명
                </div>
                <div className="text-[10.5px] text-secondary font-medium mt-1">
                  최근 30일 활성 사용자 수
                </div>
              </div>

              {/* 2. DAU */}
              <div className="bg-body p-3.5 rounded-xl border border-transparent hover:border-border transition-all">
                <div className="text-[11.5px] font-bold text-emerald-600 mb-1">DAU</div>
                <div className="text-[22px] font-extrabold text-[#008262] dark:text-emerald-400 font-mono">
                  {gaData.daily && gaData.daily.length > 0 
                    ? gaData.daily[gaData.daily.length - 1].activeUsers.toLocaleString() 
                    : '0'}명
                </div>
                <div className="text-[10.5px] text-secondary font-medium mt-1">
                  오늘 하루 활성 사용자 수
                </div>
              </div>

              {/* 3. Views */}
              <div className="bg-body p-3.5 rounded-xl border border-transparent hover:border-border transition-all">
                <div className="text-[11.5px] font-bold text-tertiary mb-1">VIEW (30D)</div>
                <div className="text-[22px] font-extrabold text-primary font-mono">
                  {gaData.totalViews ? gaData.totalViews.toLocaleString() : '0'}회
                </div>
                <div className="text-[10.5px] text-secondary font-medium mt-1">
                  최근 30일 누적 페이지 뷰
                </div>
              </div>

              {/* 4. Avg Time */}
              <div className="bg-body p-3.5 rounded-xl border border-transparent hover:border-border transition-all">
                <div className="text-[11.5px] font-bold text-tertiary mb-1">AVG. TIME</div>
                <div className="text-[22px] font-extrabold text-primary font-mono">
                  {gaData.avgSessionDuration || '0m 0s'}
                </div>
                <div className="text-[10.5px] text-secondary font-medium mt-1">
                  방문자 1인당 평균 체류 시간
                </div>
              </div>
            </div>

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Graph 1: Daily Active Users & Pageviews */}
              <div className="bg-body p-5 rounded-2xl border border-border/60 flex flex-col gap-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-primary">일별 서비스 활성도 (최근 30일)</h3>
                  <p className="text-[11.5px] text-secondary mt-0.5">매일 유입된 활성 유저(DAU)와 페이지뷰 트렌드</p>
                </div>
                <div className="h-64 w-full text-[11px] font-mono">
                  <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                    <AreaChart data={gaData.daily} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d29d" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#00d29d" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(val) => val.substring(5)} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                      <Legend iconSize={8} iconType="circle" />
                      <Area type="monotone" name="활성 사용자 (DAU)" dataKey="activeUsers" stroke="#00d29d" strokeWidth={2} fillOpacity={1} fill="url(#colorDau)" />
                      <Area type="monotone" name="페이지 뷰" dataKey="pageViews" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Graph 2: Monthly MAU & Average DAU */}
              <div className="bg-body p-5 rounded-2xl border border-border/60 flex flex-col gap-4">
                <div>
                  <h3 className="text-[14px] font-extrabold text-primary">월별 활성 유저 & 일별 평균 (최근 6개월)</h3>
                  <p className="text-[11.5px] text-secondary mt-0.5">월간 순 활성 사용자(MAU) 및 일별 평균(DAU) 추이</p>
                </div>
                <div className="h-64 w-full text-[11px] font-mono">
                  <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                    <ComposedChart data={gaData.monthly} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00d29d" stopOpacity={0.4}/>
                          <stop offset="100%" stopColor="#00b386" stopOpacity={0.15}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                      <Legend iconSize={8} iconType="circle" />
                      <Bar name="월간 사용자 (MAU)" dataKey="mau" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                      <Line type="monotone" name="일간 평균 (Avg DAU)" dataKey="avgDau" stroke="#ff8a3d" strokeWidth={2.5} dot={{ r: 4, stroke: '#ff8a3d', strokeWidth: 2, fill: '#fff' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Google Search Console Index Status & Performance Dashboard */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#f2f4f6] dark:border-zinc-800">
          <h2 className="text-[17px] font-black text-primary flex items-center gap-2">
            <Globe className="text-[#03c75a]" size={20} />
            Google Search Console 검색 노출 & 색인 모니터링
          </h2>
          {scData && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              scData.isMock 
                ? 'bg-[#fff4e6] text-[#ff8a3d]' 
                : 'bg-[#f0fdf4] text-toss-green dark:bg-emerald-950/20 dark:text-emerald-400'
            }`}>
              <ShieldCheck size={12} />
              {scData.isMock ? '자가 진단 모드 (Mock)' : 'API 실시간 수집 중'}
            </span>
          )}
        </div>

        {!scData ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-[#008262] border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-tertiary font-bold ml-2">서치콘솔 정보 로드 중...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Indexing Rate */}
            <div className="bg-body p-3.5 rounded-xl border border-transparent hover:border-border transition-all">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BarChart3 className="text-secondary" size={14} />
                <span className="text-[11.5px] font-bold text-tertiary">색인 성공률</span>
              </div>
              <div className="text-[20px] font-extrabold text-primary font-mono">
                {Math.round((scData.indexStatus.totalIndexed / (scData.indexStatus.totalIndexed + scData.indexStatus.notIndexed)) * 100)}%
              </div>
              <div className="text-[10.5px] text-secondary font-medium mt-1">
                색인 {scData.indexStatus.totalIndexed}개 / 미색인 {scData.indexStatus.notIndexed}개
              </div>
            </div>

            {/* 2. Clicks */}
            <div className="bg-body p-3.5 rounded-xl border border-transparent hover:border-border transition-all">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MousePointerClick className="text-[#008262] dark:text-emerald-400" size={14} />
                <span className="text-[11.5px] font-bold text-tertiary">클릭 수 (최근 30일)</span>
              </div>
              <div className="text-[20px] font-extrabold text-[#008262] dark:text-emerald-400 font-mono">
                {scData.searchMetrics.clicks.toLocaleString()}건
              </div>
              <div className="text-[10.5px] text-secondary font-medium mt-1">
                사이트 유입 클릭 수
              </div>
            </div>

            {/* 3. Impressions */}
            <div className="bg-body p-3.5 rounded-xl border border-transparent hover:border-border transition-all">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Eye className="text-[#ff8a3d]" size={14} />
                <span className="text-[11.5px] font-bold text-tertiary">노출 수 (최근 30일)</span>
              </div>
              <div className="text-[20px] font-extrabold text-[#ff8a3d] font-mono">
                {scData.searchMetrics.impressions.toLocaleString()}회
              </div>
              <div className="text-[10.5px] text-secondary font-medium mt-1">
                구글 검색결과 노출 수
              </div>
            </div>

            {/* 4. CTR & Position */}
            <div className="bg-body p-3.5 rounded-xl border border-transparent hover:border-border transition-all">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="text-toss-green" size={14} />
                <span className="text-[11.5px] font-bold text-tertiary">CTR / 평균 순위</span>
              </div>
              <div className="text-[20px] font-extrabold text-toss-green font-mono">
                {scData.searchMetrics.ctr}% / {scData.searchMetrics.averagePosition}위
              </div>
              <div className="text-[10.5px] text-secondary font-medium mt-1">
                평균 게재순위 및 클릭률
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
