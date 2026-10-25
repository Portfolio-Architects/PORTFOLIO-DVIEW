'use client';

import React, { useMemo } from 'react';
import { MbtiApartmentProfile } from '@/types/mbti';
import { TEMPERAMENTS } from '@/lib/data/mbtiData';
import { MBTIRadarChart } from './MBTIRadarChart';
import { MBTIShareButtons } from './MBTIShareButtons';
import { TX_SUMMARY } from '@/lib/transaction-summary';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { AdSlot } from '@/components/ads/AdSlot';

export interface MBTIResultViewProps {
  profile: MbtiApartmentProfile;
  onRetry?: () => void;
  onViewEncyclopedia?: () => void;
  className?: string;
}

export function MBTIResultView({
  profile,
  onRetry,
  onViewEncyclopedia,
  className = '',
}: MBTIResultViewProps) {
  const temperament = TEMPERAMENTS[profile.group];

  // Retrieve matching transaction statistics if available
  const txData = useMemo(() => {
    try {
      const key = findTxKey(
        profile.aptName,
        TX_SUMMARY,
        undefined,
        false,
        profile.dong
      );
      if (key && TX_SUMMARY[key]) {
        return TX_SUMMARY[key];
      }
    } catch {
      // Fallback gracefully
    }
    return null;
  }, [profile.aptName, profile.dong]);

  const handleOpenAptModal = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = `apt=${encodeURIComponent(profile.aptName)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <div
      data-testid="mbti-result-view"
      className={`w-full flex flex-col gap-6 ${className}`}
    >
      {/* Top Banner Card */}
      <div className="relative rounded-2xl overflow-hidden bg-surface border border-border/80 shadow-xs">
        {/* Gradient Header Backdrop */}
        <div
          className={`w-full h-36 bg-gradient-to-r ${profile.bannerGradient} p-6 flex flex-col justify-between text-white relative`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-black/25 backdrop-blur-md border border-white/20">
              나의 주거 성향 분석 리포트
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              {temperament.name}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md">
              {profile.type}
            </h1>
            <span className="text-base sm:text-lg font-bold text-white/90 drop-shadow">
              {profile.alias}
            </span>
          </div>
        </div>

        {/* Content Body — Responsive 2-Column Dashboard Grid */}
        <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6">
          {/* Tagline */}
          <p className="text-base sm:text-lg font-bold text-primary text-center py-3 px-4 rounded-xl bg-body border border-border/60">
            "{profile.tagline}"
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Matched Apartment & Rationale */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-5">
              {/* Matched Apartment Core Highlight Box */}
              <div className="rounded-2xl p-5 sm:p-6 bg-body border border-emerald-500/30 shadow-2xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <div className="flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                      <span>영혼의 궁합 동탄 매칭 단지</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                      {profile.aptName}
                    </h2>
                    <div className="flex items-center text-xs text-secondary mt-1">
                      <span>화성시 {profile.dong}</span>
                    </div>
                  </div>

                  {/* Price Tag if available */}
                  {txData && (
                    <div className="flex flex-col sm:items-end bg-surface p-3 rounded-xl border border-border/80">
                      <span className="text-[11px] text-secondary font-medium">
                        최근 실거래가
                      </span>
                      <div className="flex items-baseline text-emerald-700 dark:text-emerald-400 font-black text-lg sm:text-xl">
                        <span>{txData.latestPriceEok}</span>
                      </div>
                      {txData.latestDate && (
                        <span className="text-[10px] text-tertiary">
                          ({txData.latestDate} 기준)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1.5">
                  {profile.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rationale & Why This Fits */}
              <div className="flex-1 flex flex-col justify-between gap-3 rounded-2xl p-5 bg-body border border-border/60">
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm sm:text-base font-black text-primary">
                    <span>왜 {profile.type}에게 이 단지일까요?</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                    {profile.recommendationReason}
                  </p>
                </div>

                <div className="border-t border-border/60 pt-3 mt-1 flex flex-col gap-2">
                  <span className="text-xs font-bold text-secondary">
                    핵심 라이프스타일 핏:
                  </span>
                  {profile.lifestyleFit.map((fit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span>{fit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: 5-Axis Radar Chart & Actions */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-5 rounded-2xl p-5 bg-body border border-border/60">
              <div className="flex flex-col items-center">
                <div className="flex items-center mb-2">
                  <h3 className="text-sm font-bold text-primary">
                    5대 주거 인프라 지표 평가
                  </h3>
                </div>
                <MBTIRadarChart
                  radar={profile.radar}
                  color={profile.accentColor || temperament.color}
                  aptName={profile.aptName}
                />
              </div>

              {/* Deep link CTA to ApartmentModal */}
              <button
                type="button"
                data-testid="cta-open-apt-modal"
                onClick={handleOpenAptModal}
                className="w-full py-4 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm sm:text-base shadow-sm flex items-center justify-center transition-all cursor-pointer"
              >
                <span>{profile.aptName} 실거래 & 가치평가 리포트 보기</span>
              </button>
            </div>
          </div>

          {/* AdSense Responsive Slot Container (CLS Guard) */}
          <div
            id="mbti-result-ad-container"
            aria-label="스폰서 영역"
            className="w-full my-1"
          >
            <AdSlot format="banner" fallbackType="minimal" className="w-full" />
          </div>

          {/* Share Toolbar & Bottom Nav Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <span className="text-xs font-bold text-secondary">
                내 결과 공유하고 친구 주거 MBTI 확인하기
              </span>
              <MBTIShareButtons profile={profile} />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-body hover:bg-slate-100 dark:hover:bg-slate-800 border border-border/80 text-primary font-bold text-xs sm:text-sm flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span>테스트 다시하기</span>
                </button>
              )}

              {onViewEncyclopedia && (
                <button
                  type="button"
                  onClick={onViewEncyclopedia}
                  className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-body hover:bg-slate-100 dark:hover:bg-slate-800 border border-border/80 text-primary font-bold text-xs sm:text-sm flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span>16개 전 유형 도감 보기</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
