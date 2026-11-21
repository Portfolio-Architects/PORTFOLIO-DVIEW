'use client';

import React, { useMemo } from 'react';
import { Layers, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { STATS_TOPICS, type StatsTopic } from '@/types/statsTopic';
import { getIssue1DatasetMeta, formatShortContractDate } from '@/lib/stats/dongtanStationDistanceEngine';

export interface StatsTopicSelectorProps {
  currentTopicId?: string;
  onSelectTopic?: (topicId: string) => void;
  topicOverrides?: Record<string, Partial<StatsTopic>>;
  className?: string;
}

export function StatsTopicSelector({
  currentTopicId = 'dongtan-station-distance',
  onSelectTopic,
  topicOverrides,
  className = '',
}: StatsTopicSelectorProps) {
  const issue1Meta = useMemo(() => getIssue1DatasetMeta(), []);
  const latestContractShort = useMemo(
    () => formatShortContractDate(issue1Meta.latestContractDate),
    [issue1Meta.latestContractDate]
  );

  const resolvedTopics = useMemo(() => {
    return STATS_TOPICS.map((topic) => {
      const autoMeta: Partial<StatsTopic> =
        topic.id === 'dongtan-station-distance'
          ? {
              publishedAt: issue1Meta.referenceMonthLabel,
              sampleCount: issue1Meta.sampleCountLabel,
            }
          : {};
      const customOverride = topicOverrides?.[topic.id] ?? {};
      return {
        ...topic,
        ...autoMeta,
        ...customOverride,
      };
    });
  }, [issue1Meta, topicOverrides]);

  return (
    <section
      aria-label="통계 리포트 토픽 선택기"
      className={`w-full rounded-2xl bg-elevated p-3 sm:p-4 border border-border ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" aria-hidden="true" />
          <h2 className="text-xs sm:text-sm font-black text-primary tracking-tight">
            D-VIEW 부동산 통계 연구소 리포트 아카이브
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-tertiary tabular-nums">
          {latestContractShort && (
            <>
              <span className="text-primary font-extrabold">
                최신 실거래 {latestContractShort} 계약 반영
              </span>
              <span className="text-border">|</span>
            </>
          )}
          <span>총 {resolvedTopics.length}개 이슈</span>
        </div>
      </div>

      {/* Topic Cards Grid / Slider */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {resolvedTopics.map((topic) => {
          const isActive = topic.id === currentTopicId;
          const isPublished = topic.status === 'active';

          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => onSelectTopic?.(topic.id)}
              aria-pressed={isActive}
              className={`text-left p-3 rounded-xl transition-all relative flex flex-col justify-between min-h-[92px] ${
                isActive
                  ? 'bg-surface ring-2 ring-slate-900/20 dark:ring-white/25 border border-transparent shadow-xs'
                  : 'bg-surface/65 hover:bg-surface border border-transparent'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : isPublished
                        ? 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary'
                        : 'bg-[#eff1f5] dark:bg-[#1e2532] text-tertiary'
                    }`}
                  >
                    {isPublished ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3 text-tertiary" />
                    )}
                    {topic.badge}
                  </span>
                  <span className="text-[10px] font-bold text-tertiary">
                    {topic.publishedAt}
                  </span>
                </div>

                <h3
                  className={`text-[12px] sm:text-[13px] font-bold line-clamp-2 leading-snug ${
                    isActive
                      ? 'text-primary font-black'
                      : 'text-secondary group-hover:text-primary'
                  }`}
                >
                  {topic.title}
                </h3>
              </div>

              <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px] font-medium text-tertiary">
                <span className="tabular-nums truncate">{topic.sampleCount}</span>
                {isActive && (
                  <span className="inline-flex items-center gap-0.5 text-primary font-extrabold text-[10px]">
                    <Sparkles className="w-2.5 h-2.5" />
                    열람 중
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
