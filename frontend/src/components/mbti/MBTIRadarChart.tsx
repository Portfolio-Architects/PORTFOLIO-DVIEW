'use client';

import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { RadarMetrics } from '@/types/mbti';

export interface MBTIRadarChartProps {
  radar: RadarMetrics;
  color?: string;
  aptName?: string;
  className?: string;
}

export const MBTIRadarChart = React.memo(function MBTIRadarChart({
  radar,
  color = '#ea580c',
  aptName = '매칭 단지',
  className = '',
}: MBTIRadarChartProps) {
  const chartData = [
    { subject: '교통·기동력', score: radar.transit, fullMark: 100 },
    { subject: '자연·힐링', score: radar.nature, fullMark: 100 },
    { subject: '교육·학군', score: radar.education, fullMark: 100 },
    { subject: '상권·슬세권', score: radar.commerce, fullMark: 100 },
    { subject: '미래가치', score: radar.futureValue, fullMark: 100 },
  ];

  return (
    <div
      data-testid="mbti-radar-chart"
      className={`w-full flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-full h-[260px] sm:h-[300px] flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="68%" data={chartData}>
            <PolarGrid stroke="#94a3b8" strokeOpacity={0.25} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name={aptName}
              dataKey="score"
              stroke={color}
              fill={color}
              fillOpacity={0.35}
              strokeWidth={2.5}
            />
            <Tooltip
              formatter={(val: any) => [`${val ?? 0}점`, aptName]}
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 5-axis metric pills */}
      <div className="grid grid-cols-5 gap-1 sm:gap-2 w-full max-w-md mt-1 px-2">
        {chartData.map((item) => (
          <div
            key={item.subject}
            className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50"
          >
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
              {item.subject.split('·')[0]}
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
              {item.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
