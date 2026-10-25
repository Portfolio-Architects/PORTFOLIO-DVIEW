import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';

export interface CombinedChartPoint {
  month: string;
  [key: string]: string | number | null;
}

export interface ComparePriceHistoryChartProps {
  mounted: boolean;
  isTxLoading: boolean;
  combinedChartData: CombinedChartPoint[];
  apt1Label: string;
  apt2Label: string;
  priceMetric: 'absolute' | 'perPyeong';
  setPriceMetric: (val: 'absolute' | 'perPyeong') => void;
  chartType: 'sale' | 'jeonse';
  setChartType: (val: 'sale' | 'jeonse') => void;
  yAxisDomain?: [number | string, number | string];
}

export const ComparePriceHistoryChart = React.memo(function ComparePriceHistoryChart({
  mounted,
  isTxLoading,
  combinedChartData,
  apt1Label,
  apt2Label,
  priceMetric,
  setPriceMetric,
  chartType,
  setChartType,
  yAxisDomain,
}: ComparePriceHistoryChartProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 flex-wrap gap-3">
        <h3 className="text-[14px] font-extrabold text-primary flex items-center gap-1.5">
          <TrendingUp size={16} className="text-toss-blue" />
          <span>실거래 시계열 가격 트렌드 (월별 평균 거래가)</span>
        </h3>

        {/* Chart Toggle Group */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Absolute / Per-Pyeong Toggle */}
          <div className={getToggleTrackClass()}>
            <button
              onClick={() => setPriceMetric('absolute')}
              className={getToggleBtnClass({ active: priceMetric === 'absolute', size: 'sm' })}
            >
              절대 가격
            </button>
            <button
              onClick={() => setPriceMetric('perPyeong')}
              className={getToggleBtnClass({ active: priceMetric === 'perPyeong', size: 'sm' })}
            >
              평당 가격
            </button>
          </div>

          {/* Sale / Rent Toggle */}
          <div className={getToggleTrackClass()}>
            <button
              onClick={() => setChartType('sale')}
              className={getToggleBtnClass({ active: chartType === 'sale', size: 'sm' })}
            >
              매매 가격
            </button>
            <button
              onClick={() => setChartType('jeonse')}
              className={getToggleBtnClass({ active: chartType === 'jeonse', size: 'sm' })}
            >
              전세 보증금
            </button>
          </div>
        </div>
      </div>

      <div className="w-full bg-surface/50 border border-border/20 rounded-2xl p-4 md:p-6 shadow-sm">
        {isTxLoading ? (
          <div className="w-full h-[320px] flex items-center justify-center">
            <span className="text-[13px] font-bold text-tertiary animate-pulse">실거래 추이 데이터를 불러오는 중...</span>
          </div>
        ) : combinedChartData.length > 0 ? (
          <div className="w-full h-[320px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.2)" />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    fontSize={11}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: string) => {
                      if (typeof value === 'string' && /^\d{2}\.\d{2}$/.test(value)) {
                        const parts = value.split('.');
                        return `${parts[0]}년 ${parts[1]}월`;
                      }
                      return value;
                    }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                    domain={yAxisDomain ?? ['auto', 'auto']}
                    tickFormatter={(val: number) => {
                      if (priceMetric === 'perPyeong') {
                        return `${val.toLocaleString()}만`;
                      }
                      const eok = val / 10000;
                      return `${eok.toFixed(1)}억`;
                    }}
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
                    formatter={(value: any) => {
                      const num = Number(value);
                      if (isNaN(num)) return '-';
                      if (priceMetric === 'perPyeong') {
                        return [`${num.toLocaleString()}만 원/평`, '평균 평당가'];
                      }
                      const eok = Math.floor(num / 10000);
                      const man = Math.round(num % 10000);
                      return [`${eok}억 ${man > 0 ? `${man.toLocaleString()}만` : ''}원`, '평균 거래가'];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', fontWeight: 800 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={apt1Label}
                    name={apt1Label}
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#2563eb', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#2563eb' }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey={apt2Label}
                    name={apt2Label}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-body/20 rounded-xl" />
            )}
          </div>
        ) : (
          <div className="w-full h-[320px] flex items-center justify-center text-center">
            <p className="text-[12.5px] font-bold text-tertiary">시계열 거래 정보가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
});
