'use client';

import React, { useState } from 'react';
import { Sparkles, BookOpen, Compass, ArrowRight } from 'lucide-react';
import { MbtiApartmentProfile } from '@/types/mbti';
import { getProfileByType, MBTI_PROFILES } from '@/lib/data/mbtiData';
import { getRecommendedProfile } from '@/lib/utils/mbtiScoring';
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
      className={`w-full flex flex-col items-center gap-6 py-4 px-4 sm:px-6 ${className}`}
    >
      {/* Top Segmented Navigation Tab */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
        <button
          type="button"
          data-testid="tab-nav-quiz"
          onClick={() => setViewMode(currentProfile ? 'result' : 'intro')}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            viewMode === 'intro' || viewMode === 'quiz' || viewMode === 'result'
              ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>성향 진단 퀴즈</span>
        </button>

        <button
          type="button"
          data-testid="tab-nav-encyclopedia"
          onClick={handleViewEncyclopedia}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            viewMode === 'encyclopedia'
              ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>16개 아파트 도감</span>
        </button>
      </div>

      {/* Intro Landing View */}
      {viewMode === 'intro' && (
        <div
          data-testid="mbti-intro"
          className="w-full max-w-2xl mx-auto rounded-3xl p-6 sm:p-10 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col items-center text-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Compass className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-2 max-w-lg">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">
              D-VIEW 주거 성향 테스트
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
              나와 영혼의 궁합인<br />동탄 아파트는 어디일까요?
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
              교통 vs 자연, 슬세권 vs 숲세권, 초품아 학군 vs 미래 가치!<br />
              단 7가지 라이프스타일 질문으로 16가지 MBTI 성향에 딱 맞는 동탄 대표 랜드마크 단지를 찾아드립니다.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-md my-2">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300">
              <span className="block font-black text-xs">NT 분석가형</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">데이터·환금성</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <span className="block font-black text-xs">NF 외교관형</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">호수·자연힐링</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
              <span className="block font-black text-xs">SJ 관리자형</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">초품아·원스톱</span>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300">
              <span className="block font-black text-xs">SP 탐험가형</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">기동력·슬세권</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
            <button
              type="button"
              data-testid="start-quiz-btn"
              onClick={handleStartQuiz}
              className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-black text-sm sm:text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>1분 만에 테스트 시작하기</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              type="button"
              data-testid="browse-encyclopedia-btn"
              onClick={handleViewEncyclopedia}
              className="py-4 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer"
            >
              16개 도감 둘러보기
            </button>
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
