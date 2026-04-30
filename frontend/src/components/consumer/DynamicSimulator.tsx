'use client';

import { useState, useCallback } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { PremiumScores } from '@/lib/utils/scoring';
import { getValuationBreakdown, AREA_CONFIG } from '@/lib/utils/valuation';
import { Sliders, RotateCcw, Zap, Train, GraduationCap } from 'lucide-react';

interface Props {
  scores: PremiumScores;
  price84Man: number;
}

const FUTURE_EVENTS = [
  { id: 'gtx', label: 'GTX-A 개통', icon: Train, boost: { transport: 75 } },
  { id: 'indeokwon', label: '인덕원선 완공', icon: Train, boost: { transport: 10 } },
  { id: 'edu', label: '학군 특구 지정', icon: GraduationCap, boost: { education: 12 } },
] as const;

export default function DynamicSimulator({ scores, price84Man }: Props) {
  const defaultWeights: Record<string, number> = {};
  AREA_CONFIG.forEach(a => { defaultWeights[a.key] = a.weight; });

  const [weights, setWeights] = useState<Record<string, number>>(defaultWeights);
  const [futureToggles, setFutureToggles] = useState<Record<string, boolean>>({});

  const resetWeights = useCallback(() => {
    const dw: Record<string, number> = {};
    AREA_CONFIG.forEach(a => { dw[a.key] = a.weight; });
    setWeights(dw);
    setFutureToggles({});
  }, []);

  // Adjust weight for a specific key while keeping sum = 1
  const handleWeightChange = (key: string, newVal: number) => {
    const others = AREA_CONFIG.filter(a => a.key !== key);
    const remaining = 1 - newVal;
    const sumOthers = others.reduce((s, a) => s + (weights[a.key] ?? a.weight), 0);

    const newWeights = { ...weights, [key]: newVal };
    if (sumOthers > 0) {
      others.forEach(a => {
        newWeights[a.key] = ((weights[a.key] ?? a.weight) / sumOthers) * remaining;
      });
    }
    setWeights(newWeights);
  };

  // 미래 가치 토글 → 점수 보정
  const adjustedScores: PremiumScores = { ...scores };
  Object.entries(futureToggles).forEach(([eventId, enabled]) => {
    if (!enabled) return;
    const event = FUTURE_EVENTS.find(e => e.id === eventId);
    if (!event) return;
    Object.entries(event.boost).forEach(([key, val]) => {
      (adjustedScores as unknown as Record<string, number>)[key] = Math.min(100, ((adjustedScores as unknown as Record<string, number>)[key] ?? 0) + val);
    });
  });

  const breakdown = getValuationBreakdown(adjustedScores, price84Man, weights);

  const radarData = AREA_CONFIG.map(a => ({
    subject: a.name,
    original: (scores as unknown as Record<string, number>)[a.key] ?? 0,
    simulated: (adjustedScores as unknown as Record<string, number>)[a.key] ?? 0,
    fullMark: 100,
  }));

  function getGradeColor(score: number): string {
    if (score >= 80) return '#03c75a';
    if (score >= 60) return '#3182f6';
    if (score >= 40) return '#f59e0b';
    return '#f04452';
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
        <div>
          <h2 className="text-[18px] font-extrabold text-primary flex items-center gap-2">
            <Sliders size={20} className="text-[#8b5cf6]"/>
            동적 스코어 시뮬레이터
          </h2>
          <p className="text-[13px] text-tertiary mt-0.5">가중치를 조절하고 미래 가치를 선반영하세요</p>
        </div>
        <button onClick={resetWeights} className="flex items-center gap-1 text-[12px] font-bold text-tertiary hover:text-toss-blue transition-colors px-3 py-1.5 rounded-lg hover:bg-body">
          <RotateCcw size={13} /> 초기화
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Weight Sliders */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[13px] font-extrabold text-primary">가중치 조절</h3>
          {AREA_CONFIG.map(area => (
            <div key={area.key} className="flex items-center gap-3">
              <div className="w-[80px] flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                <span className="text-[12px] font-bold text-secondary truncate">{area.name}</span>
              </div>
              <input
                type="range"
                min={0} max={0.6} step={0.01}
                value={weights[area.key] ?? area.weight}
                onChange={e => handleWeightChange(area.key, parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-[#e5e8eb] rounded-lg appearance-none cursor-pointer accent-[#3182f6]"
              />
              <span className="w-[40px] text-right text-[12px] font-extrabold text-primary shrink-0">
                {Math.round((weights[area.key] ?? area.weight) * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* Future Events */}
        <div>
          <h3 className="text-[13px] font-extrabold text-primary mb-2 flex items-center gap-1.5">
            <Zap size={13} className="text-[#f59e0b]" /> 미래 가치 선반영
          </h3>
          <div className="flex flex-wrap gap-2">
            {FUTURE_EVENTS.map(event => {
              const active = futureToggles[event.id];
              return (
                <button
                  key={event.id}
                  onClick={() => setFutureToggles(prev => ({ ...prev, [event.id]: !prev[event.id] }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all border ${
                    active
                      ? 'bg-primary text-surface border-[#191f28]'
                      : 'bg-surface text-secondary border-toss-gray hover:border-toss-blue'
                  }`}
                >
                  <event.icon size={13} />
                  {event.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Radar Comparison */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/2 h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e5e8eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4e5968', fontSize: 11, fontWeight: 700 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="원본" dataKey="original" stroke="#d1d6db" fill="#d1d6db" fillOpacity={0.2} strokeWidth={1.5} strokeDasharray="4 4" isAnimationActive={false} />
                <Radar name="시뮬레이션" dataKey="simulated" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-3">
            {/* Score Result */}
            <div className="bg-gradient-to-r from-[#8b5cf6]/10 to-[#3182f6]/10 rounded-2xl p-4 text-center border border-[#8b5cf6]/20">
              <div className="text-[11px] font-bold text-tertiary mb-1">시뮬레이션 종합점수</div>
              <span className="text-[36px] font-extrabold leading-none" style={{ color: getGradeColor(breakdown.totalScore) }}>
                {breakdown.totalScore}
              </span>
              <span className="text-[14px] font-bold text-tertiary ml-1">점</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-body rounded-xl p-3 text-center border border-border">
                <div className="text-[10px] font-bold text-tertiary">시뮬레이션 PUR</div>
                <div className="text-[20px] font-extrabold text-primary">{breakdown.pur}</div>
              </div>
              <div className="bg-body rounded-xl p-3 text-center border border-border">
                <div className="text-[10px] font-bold text-tertiary">추정 수익률</div>
                <div className="text-[20px] font-extrabold text-primary">{breakdown.estimatedYield}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
