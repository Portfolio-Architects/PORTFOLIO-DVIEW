'use client';

import React from 'react';

export default function LoungeSkeleton() {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse select-none" data-testid="lounge-skeleton">
      {/* 1. Lounge Header Nav Tabs Skeleton */}
      <div className="w-full flex justify-between items-center pb-2 border-b border-border/60">
        <div className="flex gap-4">
          {['전체 피드', '단지 이야기', '부동산 Q&A', '임장 후기'].map((tab, idx) => (
            <div
              key={tab}
              className={`h-8 w-20 rounded-xl ${
                idx === 0 ? 'bg-neutral-300 dark:bg-zinc-700' : 'bg-neutral-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <div className="h-8 w-24 bg-neutral-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      {/* 2. New Post Creation Input Box Skeleton */}
      <div className="bg-surface dark:bg-zinc-900 border border-border/60 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-zinc-800 shrink-0" />
        <div className="h-11 flex-1 bg-neutral-100 dark:bg-zinc-800/60 rounded-2xl border border-border/30" />
        <div className="w-20 h-11 bg-emerald-500/20 rounded-2xl shrink-0" />
      </div>

      {/* 3. Feed Item Cards List Skeleton */}
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface dark:bg-zinc-900 border border-border/50 rounded-3xl p-6 flex flex-col gap-4 shadow-sm"
          >
            {/* Author info & timestamp */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex flex-col gap-1">
                  <div className="h-4 w-28 bg-neutral-300 dark:bg-zinc-750 rounded-md" />
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-neutral-200 dark:bg-zinc-800 rounded-full" />
            </div>

            {/* Post Title & Content lines */}
            <div className="flex flex-col gap-2.5">
              <div className="h-5 w-4/5 bg-neutral-300 dark:bg-zinc-750 rounded-lg" />
              <div className="h-4 w-full bg-neutral-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-4 w-2/3 bg-neutral-200 dark:bg-zinc-800 rounded-md" />
            </div>

            {/* Tag Chips */}
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-neutral-150 dark:bg-zinc-850 rounded-lg" />
              <div className="h-6 w-20 bg-neutral-150 dark:bg-zinc-850 rounded-lg" />
            </div>

            {/* Actions Footer (Likes, Comments, Share) */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40 text-tertiary">
              <div className="flex items-center gap-4">
                <div className="h-4 w-12 bg-neutral-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-12 bg-neutral-200 dark:bg-zinc-800 rounded" />
              </div>
              <div className="h-4 w-8 bg-neutral-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
