import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';

export interface RadarDataPoint {
  subject: string;
  A?: number;
  B?: number;
  fullMark?: number;
  [key: string]: string | number | undefined;
}

export interface CompareRadarChartProps {
  data: RadarDataPoint[];
  apt1Name: string;
  apt2Name: string;
  className?: string;
}

export const CompareRadarChart = React.memo(function CompareRadarChart({
  data,
  apt1Name,
  apt2Name,
  className,
}: CompareRadarChartProps) {
  const key1 = data.length > 0 && apt1Name in data[0] ? apt1Name : 'A';
  const key2 = data.length > 0 && apt2Name in data[0] ? apt2Name : 'B';

  return (
    <div className={className || "w-full h-[280px] sm:h-[340px] flex items-center justify-center relative"}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" strokeOpacity={0.6} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={apt1Name}
            dataKey={key1}
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Radar
            name={apt2Name}
            dataKey={key2}
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              borderRadius: '12px',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 800 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
});
