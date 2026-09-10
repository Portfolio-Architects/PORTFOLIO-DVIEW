'use client';

import React, { useMemo } from 'react';
import {
  Sparkles,
  Building2,
  MapPin,
  TrendingUp,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
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
      className={`w-full max-w-2xl mx-auto flex flex-col gap-6 ${className}`}
    >
      {/* Top Banner Card */}
      <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl">
        {/* Gradient Header Backdrop */}
        <div
          className={`w-full h-36 bg-gradient-to-r ${profile.bannerGradient} p-6 flex flex-col justify-between text-white relative`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-black/25 backdrop-blur-md border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Tagline */}
          <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 text-center py-2 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            "{profile.tagline}"
          </p>

          {/* Matched Apartment Core Highlight Box */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-orange-50/50 via-white to-amber-50/40 dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-800/50 border-2 border-orange-400/40 dark:border-orange-500/30 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span>영혼의 궁합 동탄 매칭 단지</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {profile.aptName}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>화성시 {profile.dong}</span>
                </div>
              </div>

              {/* Price Tag if available */}
              {txData && (
                <div className="flex flex-col sm:items-end bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    최근 실거래가
                  </span>
                  <div className="flex items-baseline gap-1 text-orange-600 dark:text-orange-400 font-black text-lg sm:text-xl">
                    <TrendingUp className="w-4 h-4" />
                    <span>{txData.latestPriceEok}</span>
                  </div>
                  {txData.latestDate && (
                    <span className="text-[10px] text-slate-400">
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
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100/70 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 5-Axis Radar Chart */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                5대 주거 인프라 지표 평가
              </h3>
            </div>
            <MBTIRadarChart
              radar={profile.radar}
              color={profile.accentColor || temperament.color}
              aptName={profile.aptName}
            />
          </div>

          {/* Rationale & Why This Fits */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>💡</span>
              <span>왜 {profile.type}에게 이 단지일까요?</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {profile.recommendationReason}
            </p>

            <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 mt-1 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                핵심 라이프스타일 핏:
              </span>
              {profile.lifestyleFit.map((fit, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{fit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deep link CTA to ApartmentModal */}
          <button
            type="button"
            data-testid="cta-open-apt-modal"
            onClick={handleOpenAptModal}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] text-white font-black text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Building2 className="w-5 h-5" />
            <span>{profile.aptName} 실거래 & 가치평가 리포트 보기</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          {/* AdSense Responsive Slot Container (CLS Guard) */}
          <div
            id="mbti-result-ad-container"
            aria-label="스폰서 영역"
            className="w-full my-2"
          >
            <AdSlot format="banner" fallbackType="minimal" className="w-full" />
          </div>

          {/* Share Toolbar */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              내 결과 공유하고 친구 주거 MBTI 확인하기
            </span>
            <MBTIShareButtons profile={profile} />
          </div>

          {/* Bottom Nav Actions: Retry & Encyclopedia */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>테스트 다시하기</span>
              </button>
            )}

            {onViewEncyclopedia && (
              <button
                type="button"
                onClick={onViewEncyclopedia}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>16개 전 유형 도감 보기</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
