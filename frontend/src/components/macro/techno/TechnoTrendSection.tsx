import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { TrendingUp, HelpCircle } from 'lucide-react';

export interface BuildingOption {
  id: string;
  name: string;
  color: string;
  rentKey: string;
  totalUnits: number;
}

export interface TechnoTrendSectionProps {
  mounted: boolean;
  trendData: any[];
  metricMode: 'vacancy' | 'rent';
  setMetricMode: (mode: 'vacancy' | 'rent') => void;
  timeframe: '3Y' | '6M' | 'YTD' | '1Y' | 'ALL';
  setTimeframe: (tf: '3Y' | '6M' | 'YTD' | '1Y' | 'ALL') => void;
  visibleBuildings: string[];
  setVisibleBuildings: React.Dispatch<React.SetStateAction<string[]>>;
  availableBuildings: BuildingOption[];
  onOpenHelpModal: () => void;
  onOpenDetailModal: () => void;
}

export const TechnoTrendSection = React.memo(function TechnoTrendSection({
  mounted,
  trendData,
  metricMode,
  setMetricMode,
  timeframe,
  setTimeframe,
  visibleBuildings,
  setVisibleBuildings,
  availableBuildings,
  onOpenHelpModal,
  onOpenDetailModal,
}: TechnoTrendSectionProps) {
  const toggleBuilding = (bId: string) => {
    setVisibleBuildings((prev) =>
      prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
    );
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border/40 shadow-sm flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-black text-primary flex items-center gap-1.5">
              <TrendingUp size={18} className="text-[#ea6100]" />
              <span>지식산업센터 공실률 & 임대료 시계열 추이</span>
            </h3>
            <button
              onClick={onOpenHelpModal}
              className="text-tertiary hover:text-primary transition-colors cursor-pointer"
              title="지표 산정 기준 보기"
            >
              <HelpCircle size={15} />
            </button>
          </div>
          <p className="text-[12px] font-medium text-tertiary mt-1">
            주요 거점 랜드마크 지산의 준공 이후 공실 해소 속도와 실질 임대 시세를 대조합니다.
          </p>
        </div>

        {/* Mode & Timeframe Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Switch */}
          <div className="flex bg-body p-0.5 rounded-xl border border-border/30">
            <button
              onClick={() => setMetricMode('vacancy')}
              className={`px-3 py-1.5 rounded-[10px] text-[12px] font-extrabold transition-all cursor-pointer ${
                metricMode === 'vacancy'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              공실률 (%)
            </button>
            <button
              onClick={() => setMetricMode('rent')}
              className={`px-3 py-1.5 rounded-[10px] text-[12px] font-extrabold transition-all cursor-pointer ${
                metricMode === 'rent'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-tertiary hover:text-primary'
              }`}
            >
              임대료 (만/평)
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex bg-body p-0.5 rounded-xl border border-border/30">
            {(['6M', '1Y', '3Y', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1.5 rounded-[10px] text-[11px] font-extrabold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-tertiary hover:text-primary'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenDetailModal}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11.5px] font-extrabold hover:bg-blue-500/20 transition-all cursor-pointer"
          >
            상세 데이터표
          </button>
        </div>
      </div>

      {/* Building Filter Pills */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/20">
        {availableBuildings.map((b) => {
          const isSelected = visibleBuildings.includes(b.id);
          return (
            <button
              key={b.id}
              onClick={() => toggleBuilding(b.id)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-body text-primary border-border shadow-xs'
                  : 'bg-transparent text-tertiary/70 border-border/30 hover:text-tertiary'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: isSelected ? b.color : '#cbd5e1' }}
              />
              <span>{b.name}</span>
            </button>
          );
        })}
      </div>

      {/* Line Chart */}
      <div className="w-full h-[320px] sm:h-[360px] bg-body/30 rounded-2xl p-3 sm:p-4 border border-border/20">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.2)" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                fontWeight="bold"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                fontWeight="bold"
                tickLine={false}
                axisLine={false}
                domain={metricMode === 'vacancy' ? [0, 'auto'] : ['auto', 'auto']}
                tickFormatter={(val: number) =>
                  metricMode === 'vacancy' ? `${val}%` : `${val}만`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderRadius: '14px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                }}
              />
              {availableBuildings
                .filter((b) => visibleBuildings.includes(b.id))
                .map((b) => (
                  <Line
                    key={b.id}
                    type="monotone"
                    dataKey={metricMode === 'vacancy' ? b.id : b.rentKey}
                    name={b.name}
                    stroke={b.color}
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: b.color }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              {/* Average line */}
              <Line
                type="monotone"
                dataKey={metricMode === 'vacancy' ? '평균공실률' : '평균임대료'}
                name={metricMode === 'vacancy' ? '평균 공실률' : '평균 임대료'}
                stroke="#845ef7"
                strokeWidth={3}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});
