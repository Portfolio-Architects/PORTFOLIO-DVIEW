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
import { Building2, Percent, Coins, Users, Sparkles, ChevronRight, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
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
  {
    date: '21.01',
    '금강 IX': null, '실리콘앨리': null, 'SH타임': 18.5, '더퍼스트': 13.2, 'SK V1': 20.4, '에이팩시티': 12.1, '테라타워': 35.5, 'IT타워': 11.5, '메가비즈타워': 25.8, '비즈타워': 26.2,
    '금강IX_임대료': null, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.65, '더퍼스트_임대료': 2.50, 'SKV1_임대료': 2.70, '에이팩시티_임대료': 2.80, '테라타워_임대료': 2.45, 'IT타워_임대료': 2.60, '메가비즈타워_임대료': 2.40, '비즈타워_임대료': 2.35, '평균임대료': 2.56
  },
  {
    date: '21.05',
    '금강 IX': null, '실리콘앨리': null, 'SH타임': 18.0, '더퍼스트': 12.8, 'SK V1': 19.8, '에이팩시티': 11.5, '테라타워': 33.2, 'IT타워': 11.0, '메가비즈타워': 24.5, '비즈타워': 25.0,
    '금강IX_임대료': null, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.68, '더퍼스트_임대료': 2.55, 'SKV1_임대료': 2.72, '에이팩시티_임대료': 2.85, '테라타워_임대료': 2.48, 'IT타워_임대료': 2.62, '메가비즈타워_임대료': 2.42, '비즈타워_임대료': 2.38, '평균임대료': 2.59
  },
  {
    date: '21.09',
    '금강 IX': 58.5, '실리콘앨리': null, 'SH타임': 17.2, '더퍼스트': 12.0, 'SK V1': 18.9, '에이팩시티': 10.8, '테라타워': 29.8, 'IT타워': 10.4, '메가비즈타워': 23.0, '비즈타워': 23.8,
    '금강IX_임대료': 2.95, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.70, '더퍼스트_임대료': 2.58, 'SKV1_임대료': 2.75, '에이팩시티_임대료': 2.90, '테라타워_임대료': 2.52, 'IT타워_임대료': 2.65, '메가비즈타워_임대료': 2.45, '비즈타워_임대료': 2.40, '평균임대료': 2.66
  },
  {
    date: '21.11',
    '금강 IX': 52.0, '실리콘앨리': null, 'SH타임': 16.5, '더퍼스트': 11.5, 'SK V1': 18.0, '에이팩시티': 10.2, '테라타워': 28.0, 'IT타워': 10.0, '메가비즈타워': 22.1, '비즈타워': 22.5,
    '금강IX_임대료': 3.00, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.75, '더퍼스트_임대료': 2.60, 'SKV1_임대료': 2.78, '에이팩시티_임대료': 2.92, '테라타워_임대료': 2.55, 'IT타워_임대료': 2.68, '메가비즈타워_임대료': 2.48, '비즈타워_임대료': 2.42, '평균임대료': 2.69
  },
  {
    date: '22.01',
    '금강 IX': 46.5, '실리콘앨리': null, 'SH타임': 16.0, '더퍼스트': 11.2, 'SK V1': 17.5, '에이팩시티': 9.8, '테라타워': 26.2, 'IT타워': 9.6, '메가비즈타워': 21.0, '비즈타워': 21.8,
    '금강IX_임대료': 3.05, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.78, '더퍼스트_임대료': 2.62, 'SKV1_임대료': 2.80, '에이팩시티_임대료': 2.95, '테라타워_임대료': 2.58, 'IT타워_임대료': 2.70, '메가비즈타워_임대료': 2.50, '비즈타워_임대료': 2.45, '평균임대료': 2.72
  },
  {
    date: '22.05',
    '금강 IX': 41.2, '실리콘앨리': null, 'SH타임': 15.5, '더퍼스트': 10.8, 'SK V1': 16.8, '에이팩시티': 9.5, '테라타워': 24.5, 'IT타워': 9.3, '메가비즈타워': 20.2, '비즈타워': 20.9,
    '금강IX_임대료': 3.10, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.82, '더퍼스트_임대료': 2.65, 'SKV1_임대료': 2.85, '에이팩시티_임대료': 2.98, '테라타워_임대료': 2.60, 'IT타워_임대료': 2.72, '메가비즈타워_임대료': 2.52, '비즈타워_임대료': 2.48, '평균임대료': 2.75
  },
  {
    date: '22.09',
    '금강 IX': 36.8, '실리콘앨리': null, 'SH타임': 15.0, '더퍼스트': 10.5, 'SK V1': 16.2, '에이팩시티': 9.1, '테라타워': 22.8, 'IT타워': 9.0, '메가비즈타워': 19.5, '비즈타워': 20.1,
    '금강IX_임대료': 3.15, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.85, '더퍼스트_임대료': 2.68, 'SKV1_임대료': 2.88, '에이팩시티_임대료': 3.00, '테라타워_임대료': 2.62, 'IT타워_임대료': 2.75, '메가비즈타워_임대료': 2.55, '비즈타워_임대료': 2.50, '평균임대료': 2.78
  },
  {
    date: '22.11',
    '금강 IX': 33.5, '실리콘앨리': null, 'SH타임': 14.6, '더퍼스트': 10.2, 'SK V1': 15.8, '에이팩시티': 8.8, '테라타워': 21.5, 'IT타워': 8.8, '메가비즈타워': 18.9, '비즈타워': 19.5,
    '금강IX_임대료': 3.20, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.88, '더퍼스트_임대료': 2.70, 'SKV1_임대료': 2.90, '에이팩시티_임대료': 3.02, '테라타워_임대료': 2.65, 'IT타워_임대료': 2.78, '메가비즈타워_임대료': 2.58, '비즈타워_임대료': 2.52, '평균임대료': 2.81
  },
  {
    date: '23.01',
    '금강 IX': 31.0, '실리콘앨리': null, 'SH타임': 14.3, '더퍼스트': 10.0, 'SK V1': 15.5, '에이팩시티': 8.5, '테라타워': 20.2, 'IT타워': 8.6, '메가비즈타워': 18.5, '비즈타워': 19.0,
    '금강IX_임대료': 3.25, '실리콘앨리_임대료': null, 'SH타임_임대료': 2.90, '더퍼스트_임대료': 2.72, 'SKV1_임대료': 2.92, '에이팩시티_임대료': 3.05, '테라타워_임대료': 2.68, 'IT타워_임대료': 2.80, '메가비즈타워_임대료': 2.60, '비즈타워_임대료': 2.55, '평균임대료': 2.84
  },
  {
    date: '23.05',
    '금강 IX': 29.5, '실리콘앨리': 59.2, 'SH타임': 14.5, '더퍼스트': 10.2, 'SK V1': 15.9, '에이팩시티': 8.8, '테라타워': 20.8, 'IT타워': 8.9, '메가비즈타워': 18.9, '비즈타워': 19.5,
    '금강IX_임대료': 3.30, '실리콘앨리_임대료': 2.80, 'SH타임_임대료': 2.92, '더퍼스트_임대료': 2.75, 'SKV1_임대료': 2.95, '에이팩시티_임대료': 3.08, '테라타워_임대료': 2.70, 'IT타워_임대료': 2.82, '메가비즈타워_임대료': 2.62, '비즈타워_임대료': 2.58, '평균임대료': 2.88
  },
  {
    date: '23.09',
    '금강 IX': 28.0, '실리콘앨리': 52.5, 'SH타임': 14.2, '더퍼스트': 10.0, 'SK V1': 15.5, '에이팩시티': 8.5, '테라타워': 19.8, 'IT타워': 8.6, '메가비즈타워': 18.2, '비즈타워': 18.8,
    '금강IX_임대료': 3.35, '실리콘앨리_임대료': 2.90, 'SH타임_임대료': 2.95, '더퍼스트_임대료': 2.78, 'SKV1_임대료': 2.98, '에이팩시티_임대료': 3.10, '테라타워_임대료': 2.72, 'IT타워_임대료': 2.85, '메가비즈타워_임대료': 2.65, '비즈타워_임대료': 2.60, '평균임대료': 2.91
  },
  {
    date: '23.11',
    '금강 IX': 26.8, '실리콘앨리': 46.8, 'SH타임': 13.8, '더퍼스트': 9.7, 'SK V1': 15.0, '에이팩시티': 8.2, '테라타워': 18.9, 'IT타워': 8.3, '메가비즈타워': 17.6, '비즈타워': 18.2,
    '금강IX_임대료': 3.40, '실리콘앨리_임대료': 2.98, 'SH타임_임대료': 2.98, '더퍼스트_임대료': 2.80, 'SKV1_임대료': 3.02, '에이팩시티_임대료': 3.12, '테라타워_임대료': 2.75, 'IT타워_임대료': 2.88, '메가비즈타워_임대료': 2.68, '비즈타워_임대료': 2.62, '평균임대료': 2.94
  },
  {
    date: '24.01',
    '금강 IX': 25.5, '실리콘앨리': 41.5, 'SH타임': 13.5, '더퍼스트': 9.5, 'SK V1': 14.5, '에이팩시티': 8.0, '테라타워': 18.2, 'IT타워': 8.0, '메가비즈타워': 17.0, '비즈타워': 17.5,
    '금강IX_임대료': 3.45, '실리콘앨리_임대료': 3.05, 'SH타임_임대료': 3.02, '더퍼스트_임대료': 2.82, 'SKV1_임대료': 3.05, '에이팩시티_임대료': 3.15, '테라타워_임대료': 2.78, 'IT타워_임대료': 2.90, '메가비즈타워_임대료': 2.70, '비즈타워_임대료': 2.65, '평균임대료': 2.98
  },
  {
    date: '24.05',
    '금강 IX': 24.2, '실리콘앨리': 37.0, 'SH타임': 13.1, '더퍼스트': 9.2, 'SK V1': 14.0, '에이팩시티': 7.7, '테라타워': 17.5, 'IT타워': 7.7, '메가비즈타워': 16.4, '비즈타워': 16.9,
    '금강IX_임대료': 3.50, '실리콘앨리_임대료': 3.12, 'SH타임_임대료': 3.05, '더퍼스트_임대료': 2.85, 'SKV1_임대료': 3.08, '에이팩시티_임대료': 3.18, '테라타워_임대료': 2.80, 'IT타워_임대료': 2.92, '메가비즈타워_임대료': 2.72, '비즈타워_임대료': 2.68, '평균임대료': 3.01
  },
  {
    date: '24.09',
    '금강 IX': 23.0, '실리콘앨리': 33.2, 'SH타임': 12.8, '더퍼스트': 9.0, 'SK V1': 13.6, '에이팩시티': 7.5, '테라타워': 16.8, 'IT타워': 7.5, '메가비즈타워': 15.8, '비즈타워': 16.2,
    '금강IX_임대료': 3.55, '실리콘앨리_임대료': 3.20, 'SH타임_임대료': 3.10, '더퍼스트_임대료': 2.90, 'SKV1_임대료': 3.12, '에이팩시티_임대료': 3.22, '테라타워_임대료': 2.85, 'IT타워_임대료': 2.95, '메가비즈타워_임대료': 2.75, '비즈타워_임대료': 2.70, '평균임대료': 3.06
  },
  {
    date: '24.11',
    '금강 IX': 21.8, '실리콘앨리': 29.8, 'SH타임': 12.5, '더퍼스트': 8.7, 'SK V1': 13.2, '에이팩시티': 7.2, '테라타워': 16.2, 'IT타워': 7.2, '메가비즈타워': 15.2, '비즈타워': 15.6,
    '금강IX_임대료': 3.60, '실리콘앨리_임대료': 3.25, 'SH타임_임대료': 3.15, '더퍼스트_임대료': 2.92, 'SKV1_임대료': 3.15, '에이팩시티_임대료': 3.25, '테라타워_임대료': 2.88, 'IT타워_임대료': 2.98, '메가비즈타워_임대료': 2.78, '비즈타워_임대료': 2.72, '평균임대료': 3.09
  },
  {
    date: '25.01',
    '금강 IX': 20.5, '실리콘앨리': 26.5, 'SH타임': 12.2, '더퍼스트': 8.5, 'SK V1': 12.8, '에이팩시티': 7.0, '테라타워': 15.5, 'IT타워': 7.0, '메가비즈타워': 14.6, '비즈타워': 15.0,
    '금강IX_임대료': 3.65, '실리콘앨리_임대료': 3.32, 'SH타임_임대료': 3.20, '더퍼스트_임대료': 2.95, 'SKV1_임대료': 3.18, '에이팩시티_임대료': 3.28, '테라타워_임대료': 2.90, 'IT타워_임대료': 3.00, '메가비즈타워_임대료': 2.80, '비즈타워_임대료': 2.75, '평균임대료': 3.13
  },
  {
    date: '25.05',
    '금강 IX': 19.5, '실리콘앨리': 23.8, 'SH타임': 11.9, '더퍼스트': 8.2, 'SK V1': 12.4, '에이팩시티': 6.8, '테라타워': 14.8, 'IT타워': 6.8, '메가비즈타워': 14.0, '비즈타워': 14.4,
    '금강IX_임대료': 3.70, '실리콘앨리_임대료': 3.40, 'SH타임_임대료': 3.25, '더퍼스트_임대료': 2.98, 'SKV1_임대료': 3.22, '에이팩시티_임대료': 3.32, '테라타워_임대료': 2.92, 'IT타워_임대료': 3.02, '메가비즈타워_임대료': 2.82, '비즈타워_임대료': 2.78, '평균임대료': 3.17
  },
  {
    date: '25.09',
    '금강 IX': 18.8, '실리콘앨리': 21.2, 'SH타임': 11.6, '더퍼스트': 8.0, 'SK V1': 12.0, '에이팩시티': 6.5, '테라타워': 14.2, 'IT타워': 6.5, '메가비즈타워': 13.5, '비즈타워': 13.8,
    '금강IX_임대료': 3.75, '실리콘앨리_임대료': 3.48, 'SH타임_임대료': 3.30, '더퍼스트_임대료': 3.02, 'SKV1_임대료': 3.25, '에이팩시티_임대료': 3.35, '테라타워_임대료': 2.95, 'IT타워_임대료': 3.05, '메가비즈타워_임대료': 2.85, '비즈타워_임대료': 2.80, '평균임대료': 3.21
  },
  {
    date: '25.11',
    '금강 IX': 18.2, '실리콘앨리': 19.5, 'SH타임': 11.3, '더퍼스트': 7.7, 'SK V1': 11.6, '에이팩시티': 6.2, '테라타워': 13.6, 'IT타워': 6.2, '메가비즈타워': 13.0, '비즈타워': 13.2,
    '금강IX_임대료': 3.80, '실리콘앨리_임대료': 3.55, 'SH타임_임대료': 3.35, '더퍼스트_임대료': 3.05, 'SKV1_임대료': 3.28, '에이팩시티_임대료': 3.38, '테라타워_임대료': 2.98, 'IT타워_임대료': 3.08, '메가비즈타워_임대료': 2.88, '비즈타워_임대료': 2.82, '평균임대료': 3.25
  },
  {
    date: '26.01',
    '금강 IX': 17.8, '실리콘앨리': 18.0, 'SH타임': 11.0, '더퍼스트': 7.5, 'SK V1': 11.2, '에이팩시티': 6.0, '테라타워': 13.0, 'IT타워': 6.0, '메가비즈타워': 12.5, '비즈타워': 12.6,
    '금강IX_임대료': 3.85, '실리콘앨리_임대료': 3.62, 'SH타임_임대료': 3.40, '더퍼스트_임대료': 3.08, 'SKV1_임대료': 3.32, '에이팩시티_임대료': 3.42, '테라타워_임대료': 3.02, 'IT타워_임대료': 3.12, '메가비즈타워_임대료': 2.92, '비즈타워_임대료': 2.85, '평균임대료': 3.30
  },
  {
    date: '26.05',
    '금강 IX': 17.5, '실리콘앨리': 17.2, 'SH타임': 10.8, '더퍼스트': 7.2, 'SK V1': 10.8, '에이팩시티': 5.8, '테라타워': 12.4, 'IT타워': 5.8, '메가비즈타워': 12.0, '비즈타워': 12.0,
    '금강IX_임대료': 3.88, '실리콘앨리_임대료': 3.68, 'SH타임_임대료': 3.45, '더퍼스트_임대료': 3.12, 'SKV1_임대료': 3.35, '에이팩시티_임대료': 3.45, '테라타워_임대료': 3.05, 'IT타워_임대료': 3.15, '메가비즈타워_임대료': 2.95, '비즈타워_임대료': 2.88, '평균임대료': 3.33
  }
];

const AVERAGE_LINE_COLOR = '#845ef7'; // Soft Amethyst Purple (Pastel Cute theme)

const AVAILABLE_BUILDINGS = [
  { id: '금강 IX', name: '금강 IX타워', color: '#ea580c', rentKey: '금강IX_임대료', totalUnits: 2701 },
  { id: '실리콘앨리', name: '현대 실리콘앨리', color: '#2563eb', rentKey: '실리콘앨리_임대료', totalUnits: 2470 },
  { id: 'SH타임', name: 'SH타임스퀘어', color: '#0d9488', rentKey: 'SH타임_임대료', totalUnits: 369 },
  { id: '더퍼스트', name: '더퍼스트타워', color: '#ff85a2', rentKey: '더퍼스트_임대료', totalUnits: 460 },
  { id: 'SK V1', name: '동탄 SK V1', color: '#ff9f43', rentKey: 'SKV1_임대료', totalUnits: 776 },
  { id: '에이팩시티', name: '동탄 에이팩시티', color: '#20c997', rentKey: '에이팩시티_임대료', totalUnits: 618 },
  { id: '테라타워', name: '동탄 테라타워', color: '#0f766e', rentKey: '테라타워_임대료', totalUnits: 824 }, // Adjusted from #0d9488 to avoid duplicate with SH Times Square
  { id: 'IT타워', name: '동탄 IT타워', color: '#748ffc', rentKey: 'IT타워_임대료', totalUnits: 320 },
  { id: '메가비즈타워', name: '동탄 메가비즈타워', color: '#da77f2', rentKey: '메가비즈타워_임대료', totalUnits: 168 },
  { id: '비즈타워', name: '동탄 비즈타워', color: '#a9e34b', rentKey: '비즈타워_임대료', totalUnits: 276 }
];

interface TooltipPayloadEntry {
  dataKey?: string | number;
  name?: string;
  value: number;
  color?: string;
  stroke?: string;
  payload?: any;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  metricMode?: 'vacancy' | 'rent';
}

function ChartTooltip({ active, payload, label, metricMode }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const orderMap: Record<string, number> = {};
    AVAILABLE_BUILDINGS.forEach((b, index) => {
      orderMap[b.name] = index + 1;
      orderMap[b.id] = index + 1;
    });
    orderMap['평균 공실률'] = 100;
    orderMap['평균 임대료'] = 100;

    const sortedPayload = [...payload].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      const orderA = orderMap[nameA] || 99;
      const orderB = orderMap[nameB] || 99;
      return orderA - orderB;
    });

    return (
      <div className="bg-surface/95 dark:bg-zinc-900/90 p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-border/60 flex flex-col gap-2.5 min-w-[200px] transition-all duration-200 animate-tooltip-spring">
        <div className="text-[12.5px] font-black text-primary border-b border-border/40 pb-1.5 mb-0.5">
          {label} 기준 분석
        </div>
        <div className="flex flex-col gap-1.5">
          {sortedPayload.map((entry, index) => {
            const isAverage = entry.name?.includes('평균');
            const color = entry.color || entry.stroke || '#845ef7';
            const valueFormatted = metricMode === 'vacancy' 
              ? `${entry.value.toFixed(1)}%` 
              : `${entry.value.toFixed(2)}만`;

            return (
              <div key={index} className={`flex items-center justify-between gap-4 py-0.5 ${isAverage ? 'border-t border-border/40 pt-1.5 mt-1' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: color }} 
                  />
                  <span className={`text-[12px] truncate ${isAverage ? 'font-black text-primary' : 'font-bold text-secondary'}`}>
                    {entry.name}
                  </span>
                </div>
                <span className={`text-[13px] text-right shrink-0 ${isAverage ? 'font-black text-[#845ef7] dark:text-[#9775fa]' : 'font-extrabold text-primary'}`}>
                  {valueFormatted}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

export default function TechnoValleyDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [metricMode, setMetricMode] = useState<'vacancy' | 'rent'>('vacancy');
  const [timeframe, setTimeframe] = useState<'3Y' | '6M' | 'YTD' | '1Y' | 'ALL'>('ALL');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Prevent background scroll when any modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const isAnyModalOpen = showHelpModal || showDetailModal;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, [showHelpModal, showDetailModal]);
  
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>(['금강 IX', '실리콘앨리', '테라타워', '더퍼스트', 'SK V1']);
  const REPRESENTATIVE_BUILDINGS = ['금강 IX', '실리콘앨리', '테라타워'];

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

  const { data: trendResponse } = useSWR('/api/technovalley/trend?refresh=true', (url: string) => fetch(url).then(res => res.json()), {
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
    
    const latestVacancy = (latest['금강 IX'] + latest['실리콘앨리'] + latest['테라타워']) / 3;
    const prevVacancy = (prev['금강 IX'] + prev['실리콘앨리'] + prev['테라타워']) / 3;
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
    let sliced = trendData;
    if (timeframe === '3Y') sliced = trendData.slice(-7);
    else if (timeframe === '6M') sliced = trendData.slice(-3);
    else if (timeframe === 'YTD') sliced = trendData.slice(-2);
    else if (timeframe === '1Y') sliced = trendData.slice(-5);
    
    return sliced.map((d: any) => {
      const buildings = ['금강 IX', '실리콘앨리', '테라타워'];
      const values = buildings
        .map(b => d[b])
        .filter((v): v is number => typeof v === 'number' && v !== null);
      
      const avgVacancy = values.length > 0 
        ? parseFloat((values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1))
        : null;

      return {
        ...d,
        평균공실률: avgVacancy
      };
    });
  }, [trendData, timeframe]);

  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'vacancy' | 'rent' | 'change' | 'units'; direction: 'asc' | 'desc' }>({ key: 'vacancy', direction: 'asc' });

  const sortedBuildings = useMemo(() => {
    const list = [...AVAILABLE_BUILDINGS];
    list.sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      if (sortConfig.key === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else if (sortConfig.key === 'units') {
        aVal = a.totalUnits;
        bVal = b.totalUnits;
      } else if (sortConfig.key === 'vacancy') {
        aVal = latestTrend?.[a.id] || 0;
        bVal = latestTrend?.[b.id] || 0;
      } else if (sortConfig.key === 'rent') {
        aVal = latestTrend?.[a.rentKey] || 0;
        bVal = latestTrend?.[b.rentKey] || 0;
      } else if (sortConfig.key === 'change') {
        const aFirst = trendData[0]?.[a.id] || 0;
        const aLatest = latestTrend?.[a.id] || 0;
        aVal = Math.abs(aLatest - aFirst);

        const bFirst = trendData[0]?.[b.id] || 0;
        const bLatest = latestTrend?.[b.id] || 0;
        bVal = Math.abs(bLatest - bFirst);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [latestTrend, trendData, sortConfig]);


  const handleSort = (key: 'name' | 'vacancy' | 'rent' | 'change' | 'units') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 items-stretch">
      
      {/* ═══ LEFT PANEL: Donut Chart & KPI Cards (lg:col-span-6) ═══ */}
      <div className="lg:col-span-6 flex flex-col gap-6 lg:h-[586px]">
        
        {/* Donut Chart Card */}
        <div className="bg-surface border border-border/80 p-6 rounded-[24px] shadow-sm flex flex-col justify-between h-auto sm:h-[370px] shrink-0">
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

          <div className="grid grid-cols-1 sm:grid-cols-10 gap-6 sm:gap-0 flex-1 min-h-[240px] items-center w-full px-2 sm:px-4">
            {/* Donut Chart Container (60%) */}
            <div className="col-span-1 sm:col-span-6 flex items-center justify-center relative w-full h-full sm:border-r border-border/60 dark:border-border/30 pr-0 sm:pr-8 py-2">
              <div className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] relative shrink-0">
                {mounted ? (
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="90%"
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
                </div>
              ) : (
                  <div className="w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] rounded-full border-[24px] border-border/10 animate-pulse" />
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
            </div>

            {/* Donut Legend (40%) */}
            <div className="col-span-1 sm:col-span-4 flex flex-col gap-2.5 sm:gap-3 w-full sm:pl-8 mt-4 sm:mt-0">
              {activeCategory === null ? (
                donutData.map((item: any, index: number) => (
                  <div 
                    key={index} 
                    onClick={() => setActiveCategory(item.name)}
                    className="flex items-center justify-between text-[11.5px] sm:text-[13px] bg-slate-50/50 dark:bg-surface/30 px-3 py-2 sm:px-2.5 sm:py-2 rounded-xl border border-border/30 sm:border border-border/10 hover:bg-slate-100/50 dark:hover:bg-white/5 cursor-pointer transition-all duration-300"
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
                        className="flex items-center justify-between text-[11.5px] sm:text-[13px] bg-orange-50/20 dark:bg-orange-500/5 px-3 py-2 rounded-xl border border-hs-orange/30 ring-2 ring-hs-orange/20 cursor-pointer"
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
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-tertiary font-bold tracking-wider uppercase pl-0.5">대표 입주 기업</span>
                        <div className="flex flex-col gap-1.5">
                          {selectedItem.companies.slice(0, 4).map((co: string, cIdx: number) => {
                            const [compName, rawAddress] = co.includes(' - ') ? co.split(' - ') : [co, ''];
                            let cleanedAddress = '';
                            if (rawAddress) {
                              const match = rawAddress.match(/(동탄[가-힣0-9]*(?:로|길)\s*\d+(?:-\d+)?)/);
                              cleanedAddress = match ? match[1] : rawAddress.replace('경기도 화성시', '').split(/[,/]/)[0].trim();
                            }
                            return (
                              <div 
                                key={cIdx} 
                                className="bg-surface border border-border/60 dark:border-border/30 px-3 py-2 rounded-xl shadow-sm hover:border-hs-orange/40 transition-all text-left flex items-baseline justify-between gap-2 cursor-pointer group"
                              >
                                <span className="text-[12.5px] font-bold text-primary group-hover:text-hs-orange transition-colors truncate max-w-[55%]">
                                  {compName}
                                </span>
                                {cleanedAddress && (
                                  <span 
                                    className="text-[10px] text-tertiary font-medium truncate text-right flex-1 pl-2" 
                                    title={rawAddress}
                                  >
                                    {cleanedAddress}
                                  </span>
                                )}
                              </div>
                            );
                          })}
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
        {/* 2x2 KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          
          {/* Card 1: Total Employees (NPS) */}
          <div className="bg-surface border border-border/80 p-3 sm:p-4 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] sm:text-[11px] text-tertiary font-bold">총 상주 근로자 수</span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[14px] sm:text-[16px] font-black text-primary">25,257명</span>
                <span className="text-[9px] sm:text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 flex items-center gap-0.5 shrink-0">
                  ▲ 109
                </span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
              <span className="text-[10px] text-tertiary font-bold tracking-tight">신규 918명</span>
              <span className="text-[10px] text-tertiary font-bold tracking-tight">퇴사 809명</span>
            </div>
          </div>

          {/* Card 2: Avg Rent */}
          <div className="bg-surface border border-border/80 p-3 sm:p-4 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] sm:text-[11px] text-tertiary font-bold">평당 평균 임대료</span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[14px] sm:text-[16px] font-black text-primary">{rentKPI.value}만원</span>
                <span className={`text-[9px] sm:text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${
                  rentKPI.isUp 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                }`}>
                  {rentKPI.changeText}
                </span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
              <span className="text-[10px] text-tertiary font-bold tracking-tight">최고 3.68만</span>
              <span className="text-[10px] text-tertiary font-bold tracking-tight">최저 3.50만</span>
            </div>
          </div>

          {/* Card 3: Avg Vacancy Rate */}
          <div className="bg-surface border border-border/80 p-3 sm:p-4 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] text-tertiary font-bold">평균 공실률 (AI)</span>
                <button 
                  onClick={() => setShowHelpModal(true)}
                  className="hover:bg-neutral-100 dark:hover:bg-zinc-800 p-0.5 rounded-full text-tertiary hover:text-secondary transition-all cursor-pointer"
                  title="AI 추정 메커니즘 도움말"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[14px] sm:text-[16px] font-black text-primary">{vacancyKPI.value}%</span>
                <span className={`text-[9px] sm:text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${
                  vacancyKPI.isUp 
                    ? 'bg-red-500/10 text-red-600 dark:text-red-500' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                }`}>
                  {vacancyKPI.changeText}
                </span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
              <span className="text-[10px] text-tertiary font-bold tracking-tight">테라 {latestTrend['테라타워']}%</span>
              <span className="text-[10px] text-tertiary font-bold tracking-tight">앨리 {latestTrend['실리콘앨리']}%</span>
            </div>
          </div>

          {/* Card 4: Avg Company Size (NPS-based) */}
          <div className="bg-surface border border-border/80 p-3 sm:p-4 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] sm:text-[11px] text-tertiary font-bold">기업별 평균 고용 규모</span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[14px] sm:text-[16px] font-black text-primary">13.2명 / 사</span>
                <span className="text-[9px] sm:text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-500 flex items-center gap-0.5 shrink-0">
                  ▲ 0.1
                </span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
              <span className="text-[10px] text-tertiary font-bold tracking-tight">IT·제조 18.6명</span>
              <span className="text-[10px] text-tertiary font-bold tracking-tight">소호 3.4명</span>
            </div>
          </div>

        </div>

      </div>

      {/* ═══ RIGHT PANEL: Trend Line Chart (lg:col-span-6) ═══ */}
      <div className="lg:col-span-6 bg-surface border border-border/80 p-6 rounded-[24px] shadow-sm flex flex-col justify-between lg:h-[566px] min-h-[460px]">
        
        {/* Chart Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-5 pb-4 border-b border-border/40">
          {/* Left Panel: Title & Unit Inline */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-[14.5px] sm:text-[15px] font-black text-primary tracking-tight flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] shrink-0" />
              <span>{metricMode === 'rent' ? '테크노밸리 평당 임대료 추이' : '테크노밸리 평균 공실률 추이 (AI 추정)'}</span>
              {metricMode === 'vacancy' && (
                <button 
                  onClick={() => setShowHelpModal(true)}
                  className="hover:bg-neutral-100 dark:hover:bg-zinc-800 p-0.5 rounded-full text-tertiary hover:text-secondary transition-all cursor-pointer animate-pulse shrink-0"
                  title="AI 추정 메커니즘 도움말"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </h3>
          </div>

          {/* Right Panel: Sleek unified control bar */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch xl:self-auto justify-start xl:justify-end">
            {/* Timeframe selector */}
            <div className="flex bg-body/80 p-0.5 border border-border/40 rounded-lg shadow-inner">
              {(['6M', 'YTD', '1Y', '3Y', 'ALL'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
                    timeframe === tf 
                      ? 'bg-surface text-primary shadow-sm' 
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Metric Mode Selector */}
            <div className="flex bg-body/80 p-0.5 border border-border/40 rounded-lg shadow-inner">
              <button
                onClick={() => setMetricMode('vacancy')}
                className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
                  metricMode === 'vacancy' 
                    ? 'bg-surface text-primary shadow-sm' 
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                공실률
              </button>
              <button
                onClick={() => setMetricMode('rent')}
                className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
                  metricMode === 'rent' 
                    ? 'bg-surface text-primary shadow-sm' 
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                임대료
              </button>
            </div>

            {/* Detailed Modal Trigger Button */}
            <button
              onClick={() => setShowDetailModal(true)}
              className="h-[26px] px-2.5 rounded-lg border border-[#ea580c]/30 hover:border-[#ea580c]/50 bg-[#ea580c]/5 hover:bg-[#ea580c]/10 text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all text-[#ea580c] shadow-sm active:scale-[0.98] shrink-0"
            >
              <span>상세보기</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 border-b border-border/40 pb-3">
          {AVAILABLE_BUILDINGS.filter(b => REPRESENTATIVE_BUILDINGS.includes(b.id)).map(b => (
            <div key={b.id} className="flex items-center gap-1.5 text-[11px] font-extrabold text-secondary py-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
              <span>{b.name}</span>
            </div>
          ))}
          
          {metricMode === 'rent' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#845ef7] py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#845ef7] shrink-0" />
              <span>평균 임대료</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#845ef7] py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#845ef7] shrink-0" />
              <span>평균 공실률</span>
            </div>
          )}
        </div>

        {/* Line Chart Area */}
        <div className="flex-1 w-full relative min-h-[290px]">
          {mounted ? (
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredTrendData} margin={{ top: 15, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  interval={2}
                  tick={{ fontSize: 10.5, fontWeight: 700, fill: '#6b7280' }} 
                  padding={{ left: 16, right: 16 }}
                />
                <YAxis 
                  width={42}
                  tickLine={false} 
                  axisLine={false} 
                  domain={metricMode === 'vacancy' ? [0, 26] : [3.2, 3.9]}
                  tick={{ fontSize: 10.5, fontWeight: 700, fill: '#6b7280' }}
                  tickFormatter={(value) => {
                    const num = Number(value);
                    if (isNaN(num)) return String(value);
                    return metricMode === 'vacancy' ? Math.round(num).toString() : num.toFixed(1);
                  }}
                  unit={metricMode === 'vacancy' ? '%' : '만'}
                />
                <Tooltip content={<ChartTooltip metricMode={metricMode} />} />
                {metricMode === 'vacancy' ? (
                  <>
                    {AVAILABLE_BUILDINGS.filter(b => REPRESENTATIVE_BUILDINGS.includes(b.id)).map(b => (
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
                    <Line 
                      type="monotone" 
                      dataKey="평균공실률" 
                      name="평균 공실률"
                      stroke={AVERAGE_LINE_COLOR} 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 5 }} 
                    />
                  </>
                ) : (
                  <>
                    {AVAILABLE_BUILDINGS.filter(b => REPRESENTATIVE_BUILDINGS.includes(b.id)).map(b => (
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
                      stroke={AVERAGE_LINE_COLOR} 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ r: 3.5, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 5 }} 
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
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

      {/* AI 공실률 추정 도움말 모달 */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-surface/95 border border-border/80 rounded-[32px] shadow-2xl p-10 md:p-12 max-w-4xl w-full relative animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-[22px] font-black text-primary mb-6 flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-hs-orange" />
              AI 공실률 추정 메커니즘 (하이브리드 모델)
            </h4>
            
            <div className="flex flex-col gap-6 text-[15px] text-secondary leading-relaxed font-semibold">
              <p className="leading-relaxed font-semibold text-primary">
                D-VIEW의 공실률은 실시간 파악이 어려운 지식산업센터의 특성을 해결하기 위해 
                국토부 실거래 정보와 국민연금공단(NPS) 고용 빅데이터를 결합한 <strong>하이브리드 추정 모델</strong>을 사용합니다.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-2">
                {/* Layer 1 */}
                <div className="p-6 bg-body/80 border border-border/60 rounded-2xl flex flex-col gap-3.5 shadow-sm">
                  <span className="font-black text-[#ea580c] text-[14.5px] flex items-center gap-1.5">
                    🏢 1단계: 실거래 베이스라인
                  </span>
                  <p className="text-[13px] text-tertiary leading-relaxed font-medium">
                    국토교통부 매매/임대 거래량을 파악하고, 거래 면적에 따른 실입주 가중치(Tx Weight)를 부여해 공간의 실질 계약 점유율을 1차 산출합니다.
                  </p>
                </div>

                {/* Layer 2 */}
                <div className="p-6 bg-body/80 border border-border/60 rounded-2xl flex flex-col gap-3.5 shadow-sm">
                  <span className="font-black text-blue-600 dark:text-toss-blue text-[14.5px] flex items-center gap-1.5">
                    📊 2단계: 국민연금 고용 보정
                  </span>
                  <p className="text-[13px] text-tertiary leading-relaxed font-medium">
                    실제 동탄에 상주하는 근로자 수와 고용 증감률을 분석하여, 5인 미만 사업장 누락 및 주소지 불일치 한계를 상쇄한 거시 고용 보정치(macroBonus)를 반영합니다.
                  </p>
                </div>

                {/* Layer 3 */}
                <div className="p-6 bg-body/80 border border-border/60 rounded-2xl flex flex-col gap-3.5 shadow-sm">
                  <span className="font-black text-violet-600 text-[14.5px] flex items-center gap-1.5">
                    🔄 3단계: 자연 퇴거율 결합
                  </span>
                  <p className="text-[13px] text-tertiary leading-relaxed font-medium">
                    지식산업센터의 연면적 규모(GFA 집적 효과)와 계약 만기/기업 이전에 따른 시계열 자연 퇴거율(Dynamic Turnover) 모델을 최종 결합해 실시간 공실률을 도출합니다.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-8 w-full py-3.5 bg-primary text-surface font-extrabold text-[13.5px] rounded-xl hover:bg-primary/95 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 전체 단지 상세 비교 모달 */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-surface border border-border/80 rounded-[32px] shadow-2xl p-6 md:p-8 max-w-7xl w-full h-[92vh] md:h-[88vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-border/60 mb-5 shrink-0">
              <div className="flex flex-col gap-1">
                <h4 className="text-[17px] font-black text-primary flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-hs-orange" />
                  동탄테크노밸리 지식산업센터 전체 분석 (10개 단지)
                </h4>
                <p className="text-[11px] text-tertiary font-bold">
                  국가건물에너지사용량 API 추정 공실률 및 국토교통부 실거래 기반 임대료 비교
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="hover:bg-neutral-100 dark:hover:bg-zinc-800 p-1.5 rounded-full text-tertiary hover:text-secondary transition-all cursor-pointer"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pr-1 scrollbar-thin">
              {/* Left Column: Modal Chart (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex justify-between items-center bg-body/80 p-3 rounded-2xl border border-border/40">
                  {/* Metric Toggle */}
                  <div className="flex bg-surface p-0.5 border border-border/20 rounded-lg shadow-inner">
                    <button
                      onClick={() => setMetricMode('vacancy')}
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                        metricMode === 'vacancy' 
                          ? 'bg-primary text-surface shadow-sm' 
                          : 'text-tertiary hover:text-secondary'
                      }`}
                    >
                      공실률
                    </button>
                    <button
                      onClick={() => setMetricMode('rent')}
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                        metricMode === 'rent' 
                          ? 'bg-primary text-surface shadow-sm' 
                          : 'text-tertiary hover:text-secondary'
                      }`}
                    >
                      임대료
                    </button>
                  </div>

                  {/* Timeframe Toggle */}
                  <div className="flex bg-surface p-0.5 border border-border/20 rounded-lg shadow-inner">
                    {(['6M', 'YTD', '1Y', '3Y', 'ALL'] as const).map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                          timeframe === tf 
                            ? 'bg-primary text-surface shadow-sm' 
                            : 'text-tertiary hover:text-secondary'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Line Chart */}
                <div className="w-full h-[360px] relative flex items-end">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={filteredTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false} 
                        interval={2}
                        tick={{ fontSize: 9.5, fontWeight: 700, fill: '#6b7280' }} 
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        domain={metricMode === 'vacancy' ? [10, 48] : [2.0, 4.2]}
                        tick={{ fontSize: 9.5, fontWeight: 700, fill: '#6b7280' }}
                        unit={metricMode === 'vacancy' ? '%' : '만'}
                      />
                      <Tooltip content={<ChartTooltip metricMode={metricMode} />} />
                      {metricMode === 'vacancy' ? (
                        <>
                          {AVAILABLE_BUILDINGS.filter(b => selectedBuildings.includes(b.id)).map(b => (
                            <Line 
                              key={b.id}
                              type="monotone" 
                              dataKey={b.id} 
                              name={b.name}
                              stroke={b.color} 
                              strokeWidth={2.5} 
                              dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }}
                              activeDot={{ r: 5 }} 
                            />
                          ))}
                          <Line 
                            type="monotone" 
                            dataKey="평균공실률" 
                            name="평균 공실률"
                            stroke={AVERAGE_LINE_COLOR} 
                            strokeWidth={2} 
                            strokeDasharray="4 4"
                            dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }}
                            activeDot={{ r: 4 }} 
                          />
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
                              strokeWidth={2.5} 
                              dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }}
                              activeDot={{ r: 5 }} 
                            />
                          ))}
                          <Line 
                            type="monotone" 
                            dataKey="평균임대료" 
                            name="평균 임대료"
                            stroke={AVERAGE_LINE_COLOR} 
                            strokeWidth={2} 
                            strokeDasharray="4 4"
                            dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }}
                            activeDot={{ r: 4 }} 
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Building Checkboxes */}
                <div className="flex flex-wrap gap-2 p-3 bg-body/80 border border-border/40 rounded-2xl">
                  {AVAILABLE_BUILDINGS.map(b => {
                    const isChecked = selectedBuildings.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          if (isChecked) {
                            if (selectedBuildings.length > 1) {
                              setSelectedBuildings(selectedBuildings.filter(id => id !== b.id));
                            }
                          } else {
                            setSelectedBuildings([...selectedBuildings, b.id]);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isChecked 
                            ? 'bg-surface text-primary border-primary shadow-sm' 
                            : 'bg-transparent text-tertiary border-border/60 hover:border-border'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                        <span>{b.name} <span className="opacity-80 font-normal">({b.totalUnits.toLocaleString()}호)</span></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Building Table (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="overflow-x-auto border border-border/60 rounded-2xl bg-body/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-body border-b border-border/60 text-[10px] font-black text-tertiary select-none">
                        <th className="py-2.5 px-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                          단지명 <span className={sortConfig.key === 'name' ? "text-[#ea580c]" : "text-tertiary/60 ml-0.5"}>{sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th className="py-2.5 px-3 text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('units')}>
                          총 호수 <span className={sortConfig.key === 'units' ? "text-[#ea580c]" : "text-tertiary/60 ml-0.5"}>{sortConfig.key === 'units' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th className="py-2.5 px-3 text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('vacancy')}>
                          공실률 <span className={sortConfig.key === 'vacancy' ? "text-[#ea580c]" : "text-tertiary/60 ml-0.5"}>{sortConfig.key === 'vacancy' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th className="py-2.5 px-3 text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('rent')}>
                          임대료 <span className={sortConfig.key === 'rent' ? "text-[#ea580c]" : "text-tertiary/60 ml-0.5"}>{sortConfig.key === 'rent' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                        <th className="py-2.5 px-3 text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('change')}>
                          개선폭 <span className={sortConfig.key === 'change' ? "text-[#ea580c]" : "text-tertiary/60 ml-0.5"}>{sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-[11px] font-bold text-secondary">
                      {sortedBuildings.map((b, index) => {
                        const firstVal = trendData[0]?.[b.id] || 0;
                        const latestVal = latestTrend?.[b.id] || 0;
                        const latestRent = latestTrend?.[b.rentKey] || 0;
                        const change = latestVal - firstVal;
                        const rank = index + 1;
                        
                        let rankBadge = '';
                        if (rank === 1) rankBadge = '🥇';
                        else if (rank === 2) rankBadge = '🥈';
                        else if (rank === 3) rankBadge = '🥉';
                        else rankBadge = `${rank}`;

                        let vacancyColor = '';
                        if (latestVal < 15) vacancyColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded';
                        else if (latestVal < 20) vacancyColor = 'text-blue-600 dark:text-toss-blue bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded';
                        else vacancyColor = 'text-[#ea580c] bg-[#ea580c]/5 px-1.5 py-0.5 rounded';

                        return (
                          <tr key={b.id} className="hover:bg-body/80 transition-all">
                            <td className="py-2.5 px-3 flex items-center gap-2">
                              <span className="w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full bg-neutral-100 dark:bg-zinc-800 text-tertiary">
                                {rankBadge}
                              </span>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                              <span className="truncate max-w-[150px]" title={b.name}>
                                {b.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-secondary font-extrabold">
                              {b.totalUnits.toLocaleString()}호
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={vacancyColor}>{latestVal}%</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-primary">
                              {latestRent}만
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-extrabold">
                                개선 {Math.abs(change).toFixed(1)}%p
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-border/60 mt-5 shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full py-3 bg-primary text-surface font-black text-[12.5px] rounded-xl hover:bg-primary/95 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
