'use client';

import React, { useState } from 'react';
import { MbtiApartmentProfile } from '@/types/mbti';
import { getProfileByType, MBTI_PROFILES } from '@/lib/data/mbtiData';
import { getRecommendedProfile } from '@/lib/utils/mbtiScoring';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';
import { MBTIQuizStepper } from './MBTIQuizStepper';
import { MBTIResultView } from './MBTIResultView';
import { MBTIEncyclopedia } from './MBTIEncyclopedia';

export type MBTIViewMode = 'intro' | 'quiz' | 'result' | 'encyclopedia';

export interface MBTIContainerProps {
  initialView?: MBTIViewMode;
  initialType?: string;
  className?: string;
}

export function MBTIContainer({
  initialView = 'intro',
  initialType,
  className = '',
}: MBTIContainerProps) {
  const initialProfile = initialType ? getProfileByType(initialType) : undefined;

  const [viewMode, setViewMode] = useState<MBTIViewMode>(
    initialProfile ? 'result' : initialView
  );
  const [currentProfile, setCurrentProfile] = useState<MbtiApartmentProfile | undefined>(
    initialProfile
  );

  const safeScrollToTop = () => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    }
  };

  const handleQuizComplete = (answers: Record<number, 'A' | 'B'>) => {
    const matchedProfile = getRecommendedProfile(answers);
    setCurrentProfile(matchedProfile);
    setViewMode('result');
    safeScrollToTop();
  };

  const handleSelectFromEncyclopedia = (profile: MbtiApartmentProfile) => {
    setCurrentProfile(profile);
    setViewMode('result');
    safeScrollToTop();
  };

  const handleStartQuiz = () => {
    setViewMode('quiz');
    safeScrollToTop();
  };

  const handleRetry = () => {
    setCurrentProfile(undefined);
    setViewMode('quiz');
    safeScrollToTop();
  };

  const handleViewEncyclopedia = () => {
    setViewMode('encyclopedia');
    safeScrollToTop();
  };

  return (
    <div
      data-testid="mbti-container"
      className={`w-full flex flex-col gap-5 ${className}`}
    >
      {/* Top Action & Sub-Navigation Control Bar (Synchronized with Main Dashboard Control Bar) */}
      <div className="w-full p-2 sm:p-2.5 rounded-2xl bg-surface border border-border/80 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className={getToggleTrackClass()}>
          <button
            type="button"
            data-testid="tab-nav-quiz"
            onClick={() => setViewMode(currentProfile ? 'result' : 'intro')}
            className={getToggleBtnClass({
              active: viewMode === 'intro' || viewMode === 'quiz' || viewMode === 'result',
              tone: 'emerald',
            })}
          >
            <span>성향 진단 퀴즈</span>
          </button>

          <button
            type="button"
            data-testid="tab-nav-encyclopedia"
            onClick={handleViewEncyclopedia}
            className={getToggleBtnClass({
              active: viewMode === 'encyclopedia',
              tone: 'emerald',
            })}
          >
            <span>16개 아파트 도감</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 px-2 text-xs font-semibold text-secondary">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
            <span>5대 입지 지표 · 16개 랜드마크 정량 매칭</span>
          </span>
        </div>
      </div>

      {/* Intro Landing View — Synchronized 2-Column Dashboard Grid */}
      {viewMode === 'intro' && (
        <div
          data-testid="mbti-intro"
          className="w-full rounded-2xl p-5 sm:p-6 lg:p-8 bg-surface border border-border/80 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch"
        >
          {/* Left Panel: Quiz Intro & Primary Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6 p-5 sm:p-6 rounded-2xl bg-body border border-border/60">
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  D-VIEW 주거 성향 테스트
                </span>
                <span className="text-xs font-semibold text-secondary">
                  교통·자연·학군·상권·미래가치 5대 축 진단
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-primary leading-tight tracking-tight">
                나와 영혼의 궁합인<br />동탄 아파트는 어디일까요?
              </h2>
              <p className="text-xs sm:text-sm text-secondary leading-relaxed font-medium">
                교통 vs 자연, 슬세권 vs 숲세권, 초품아 학군 vs 미래 가치! 단 7가지 라이프스타일 질문으로 16가지 MBTI 성향에 딱 맞는 동탄 대표 랜드마크 단지를 찾아드립니다.
              </p>

              <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                  <span className="block font-black text-xs">NT 분석가형</span>
                  <span className="text-[11px] text-secondary font-medium">데이터·환금성</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  <span className="block font-black text-xs">NF 외교관형</span>
                  <span className="text-[11px] text-secondary font-medium">호수·자연힐링</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                  <span className="block font-black text-xs">SJ 관리자형</span>
                  <span className="text-[11px] text-secondary font-medium">초품아·원스톱</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  <span className="block font-black text-xs">SP 탐험가형</span>
                  <span className="text-[11px] text-secondary font-medium">기동력·슬세권</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
              <button
                type="button"
                data-testid="start-quiz-btn"
                onClick={handleStartQuiz}
                className="flex-1 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm shadow-sm flex items-center justify-center transition-all cursor-pointer"
              >
                <span>1분 만에 테스트 시작하기</span>
              </button>

              <button
                type="button"
                data-testid="browse-encyclopedia-btn"
                onClick={handleViewEncyclopedia}
                className="py-3.5 px-4 rounded-xl bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-primary border border-border/80 font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
              >
                16개 도감 둘러보기
              </button>
            </div>
          </div>

          {/* Right Panel: SSR Semantic Matrix of 16 MBTI Profiles */}
          <div className="lg:col-span-7 flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border/60">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-primary">
                  동탄 16개 주거 성향 유형별 매칭 랜드마크 단지 요약
                </h3>
                <p className="text-[11px] sm:text-xs text-secondary mt-0.5">
                  유형 카드를 클릭하면 해당 MBTI의 5대 입지 레이더 차트와 매칭 단지를 즉시 확인할 수 있습니다.
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                16개 유형
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
              {Object.values(MBTI_PROFILES).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleSelectFromEncyclopedia(item)}
                  className="p-3 rounded-xl bg-body hover:bg-emerald-500/[0.04] border border-border/60 hover:border-emerald-500/40 text-left transition-all cursor-pointer group flex flex-col justify-between gap-1"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                      {item.type}
                    </span>
                  </div>
                  <span className="font-bold text-primary block truncate text-[12px]">
                    {item.aptName}
                  </span>
                  <span className="text-[10.5px] text-secondary block truncate">
                    화성시 {item.dong}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quiz Stepper View */}
      {viewMode === 'quiz' && (
        <MBTIQuizStepper
          onComplete={handleQuizComplete}
          onCancel={() => setViewMode('intro')}
        />
      )}

      {/* Result Card View */}
      {viewMode === 'result' && currentProfile && (
        <MBTIResultView
          profile={currentProfile}
          onRetry={handleRetry}
          onViewEncyclopedia={handleViewEncyclopedia}
        />
      )}

      {/* 16-Type Encyclopedia View */}
      {viewMode === 'encyclopedia' && (
        <MBTIEncyclopedia
          onSelectProfile={handleSelectFromEncyclopedia}
          onStartQuiz={handleStartQuiz}
        />
      )}
    </div>
  );
}
