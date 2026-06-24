'use client';

import React from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface ApartmentModalSkeletonProps {
  onClose?: () => void;
}

export default function ApartmentModalSkeleton({ onClose }: ApartmentModalSkeletonProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      {/* Modal Container */}
      <div className="bg-surface text-primary w-full sm:max-w-[1200px] h-full sm:h-[90vh] sm:rounded-3xl shadow-2xl border-none sm:border border-border/80 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Header Skeleton */}
        <header className="h-14 sm:h-16 border-b border-border/60 px-4 md:px-8 flex items-center justify-between shrink-0 bg-surface/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="text-secondary p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors" disabled>
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col gap-1">
              <div className="h-5 w-40 rounded-lg bg-neutral-200 dark:bg-zinc-800 animate-shimmer" />
              <div className="h-3.5 w-24 rounded bg-neutral-150 dark:bg-zinc-850 animate-shimmer" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-zinc-800 animate-shimmer" />
            {onClose && (
              <button 
                onClick={onClose}
                className="text-secondary p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors active:scale-95 outline-none"
                title="닫기"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </header>

        {/* Content Body Skeleton */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-6">
          {/* 1. Hero Image Gallery Slider Area */}
          <div className="w-full h-[220px] md:h-[340px] rounded-2xl bg-neutral-150 dark:bg-zinc-900/30 border border-neutral-200/40 dark:border-zinc-800/10 animate-shimmer relative overflow-hidden flex items-center justify-center">
            {/* Emerald Diamond Center Spinner */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-emerald-500/10 dark:border-emerald-400/10 rounded-full animate-ping" />
              <div className="w-10 h-10 border-t-2 border-r-2 border-emerald-500 dark:border-emerald-400 rounded-full animate-spin" />
              <div className="absolute w-4 h-4 bg-emerald-500 dark:bg-emerald-400 rotate-45 rounded-sm animate-pulse" />
            </div>
            <span className="absolute bottom-3 right-4 text-[11px] font-bold text-tertiary px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md">아파트 임장 카드 로드 중...</span>
          </div>

          {/* 2. Specs Summary Grid (householdCount, buildYear etc.) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-neutral-50 dark:bg-zinc-900/20 border border-border/40 rounded-2xl p-4 flex flex-col gap-2 animate-shimmer">
                <div className="h-3 w-12 bg-neutral-250 dark:bg-zinc-800 rounded" />
                <div className="h-5 w-24 bg-neutral-300 dark:bg-zinc-750 rounded-md" />
              </div>
            ))}
          </div>

          {/* 3. Sticky Tab Nav mock */}
          <div className="flex gap-6 border-b border-border/60 pb-[12px] pt-2 overflow-x-auto no-scrollbar shrink-0">
            {['단지 소식', '기본 정보', '입지 분석', '학군 정보', '시세 추이'].map((tab, idx) => (
              <span key={tab} className="text-[14px] font-extrabold pb-2 relative whitespace-nowrap text-tertiary">
                {tab}
                {idx === 0 && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-sm" />}
              </span>
            ))}
          </div>

          {/* 4. Tab Contents mock (Comments/Reviews layout) */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-neutral-300 dark:bg-zinc-800 rounded-lg animate-shimmer" />
              <div className="h-4 w-16 bg-neutral-200 dark:bg-zinc-850 rounded" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 h-12 bg-neutral-100 dark:bg-zinc-900/40 rounded-xl animate-shimmer border border-border/30" />
              <div className="w-16 h-12 bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-shimmer" />
            </div>
            <div className="w-full flex flex-col gap-3.5 mt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 border border-border/40 bg-neutral-50/20 dark:bg-zinc-900/10 rounded-2xl flex gap-3 animate-shimmer">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-zinc-800 shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-16 bg-neutral-250 dark:bg-zinc-850 rounded" />
                      <div className="h-3 w-12 bg-neutral-200 dark:bg-zinc-900 rounded" />
                    </div>
                    <div className="h-4 w-full bg-neutral-150 dark:bg-zinc-850 rounded" />
                    <div className="h-4 w-3/4 bg-neutral-150 dark:bg-zinc-850 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}