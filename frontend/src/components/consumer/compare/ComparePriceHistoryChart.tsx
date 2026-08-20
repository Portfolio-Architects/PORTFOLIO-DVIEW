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
          <div className="flex bg-[#f2f4f6] dark:bg-zinc-800 p-0.5 rounded-xl border border-border/10">
            <button
              onClick={() => setPriceMetric('absolute')}
              className={`px-3 py-1 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer ${priceMetric === 'absolute' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
            >
              절대 가격
            </button>
            <button
              onClick={() => setPriceMetric('perPyeong')}
              className={`px-3 py-1 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer ${priceMetric === 'perPyeong' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
            >
              평당 가격
            </button>
          </div>

          {/* Sale / Rent Toggle */}
          <div className="flex bg-[#f2f4f6] dark:bg-zinc-800 p-0.5 rounded-xl border border-border/10">
            <button
              onClick={() => setChartType('sale')}
              className={`px-3 py-1 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer ${chartType === 'sale' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
            >
              매매 가격
            </button>
            <button
              onClick={() => setChartType('jeonse')}
              className={`px-3 py-1 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer ${chartType === 'jeonse' ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
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
                    domain={['auto', 'auto']}
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
                    stroke="#ea6100"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#ea6100', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#ea6100' }}
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
          <div className="w-full h-[320px] flex items-center justify-center text-tertiary font-bold text-[13px]">
            비교 가능한 최근 실거래 이력이 부족합니다.
          </div>
        )}
      </div>
    </div>
  );
});
