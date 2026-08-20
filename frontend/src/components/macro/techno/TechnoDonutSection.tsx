import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Sparkles, Building2 } from 'lucide-react';

export interface DonutDataItem {
  name: string;
  value: number;
  color: string;
  count: number;
  companies: string[];
}

export interface TechnoDonutSectionProps {
  mounted: boolean;
  donutData: DonutDataItem[];
  activeCategory: string | null;
  setActiveCategory: (cat: string | null) => void;
  chartSize: number;
}

export const TechnoDonutSection = React.memo(function TechnoDonutSection({
  mounted,
  donutData,
  activeCategory,
  setActiveCategory,
  chartSize,
}: TechnoDonutSectionProps) {
  const activeSector = donutData.find(d => d.name === activeCategory);

  return (
    <div id="donut-chart-card" className="p-5 sm:p-6 rounded-2xl bg-surface border border-border/40 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-black text-primary flex items-center gap-2">
            <span>업종별 입주 비중 및 클러스터 구성</span>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              총 1,931개사 전수조사
            </span>
          </h3>
          <p className="text-[12px] font-medium text-tertiary mt-1">
            파이 차트 섹터를 클릭하여 업종별 대표 입주 기업 및 세부 통계를 확인하세요.
          </p>
        </div>
        {activeCategory && (
          <button
            onClick={() => setActiveCategory(null)}
            className="text-[11.5px] font-bold text-tertiary hover:text-primary self-start sm:self-auto cursor-pointer"
          >
            선택 초기화
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[220px]">
          {mounted ? (
            <div style={{ width: chartSize, height: chartSize }} className="relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(data) => {
                      if (activeCategory === data.name) {
                        setActiveCategory(null);
                      } else {
                        setActiveCategory(data.name || null);
                      }
                    }}
                    cursor="pointer"
                  >
                    {donutData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        opacity={activeCategory === null || activeCategory === entry.name ? 1 : 0.35}
                        stroke={activeCategory === entry.name ? '#fff' : 'none'}
                        strokeWidth={activeCategory === entry.name ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(1)}%`, '비중']}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-tertiary">주요 업종</span>
                <span className="text-[13px] font-black text-primary">반도체/기기</span>
                <span className="text-[10px] font-extrabold text-[#ea6100]">67.0%</span>
              </div>
            </div>
          ) : (
            <div className="w-[200px] h-[200px] rounded-full border-4 border-dashed border-border animate-pulse" />
          )}
        </div>

        {/* Right: Sector Breakdown List */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          {donutData.map((sector) => {
            const isSelected = activeCategory === sector.name;
            return (
              <div
                key={sector.name}
                onClick={() => setActiveCategory(isSelected ? null : sector.name)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-body border-primary/40 shadow-sm scale-[1.01]'
                    : 'bg-surface/60 hover:bg-body/60 border-border/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: sector.color }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-black text-primary truncate">
                      {sector.name}
                    </span>
                    <span className="text-[11px] font-bold text-tertiary">
                      {sector.count}개사 입주
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[14px] font-black text-primary">
                    {sector.value.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Sector Representative Companies */}
      {activeSector && (
        <div className="p-4 rounded-xl bg-body/80 border border-border/40 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 text-[12px] font-black text-[#ea6100] mb-2.5">
            <Sparkles size={14} />
            <span>{activeSector.name} 주요 앵커 기업 리스트</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeSector.companies.map((co, idx) => {
              const [name, addr] = co.split(' - ');
              return (
                <div key={idx} className="p-2.5 rounded-lg bg-surface border border-border/30 flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-extrabold text-primary truncate">{name}</span>
                  {addr && <span className="text-[10px] text-tertiary truncate">{addr}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
