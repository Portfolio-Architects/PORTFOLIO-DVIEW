'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Scale, Check, Share2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ResolvedBalanceMatchup } from '@/lib/data/balanceMatchups';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import { trackEvent } from '@/lib/utils/analytics';

export interface BalanceMatchupWidgetProps {
  matchups: ResolvedBalanceMatchup[];
  surface: string;
  heading?: string;
  compact?: boolean;
  className?: string;
}

interface VoteTallies {
  leftVotes: number;
  rightVotes: number;
  loaded: boolean;
}

const VOTE_STORAGE_PREFIX = 'dview_matchup_vote_v1:';

function readStoredVote(matchupId: string): 'left' | 'right' | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = window.localStorage.getItem(`${VOTE_STORAGE_PREFIX}${matchupId}`);
    return val === 'left' || val === 'right' ? val : null;
  } catch {
    return null;
  }
}

function writeStoredVote(matchupId: string, side: 'left' | 'right'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${VOTE_STORAGE_PREFIX}${matchupId}`, side);
  } catch {
    // ignore storage quota errors
  }
}

export default function BalanceMatchupWidget({
  matchups,
  surface,
  heading = '동탄 1:1 밸런스 맞대결',
  compact = false,
  className = '',
}: BalanceMatchupWidgetProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [votesByMatchup, setVotesByMatchup] = useState<Record<string, VoteTallies>>({});
  const [userChoiceByMatchup, setUserChoiceByMatchup] = useState<Record<string, 'left' | 'right' | null>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const safeMatchups = Array.isArray(matchups) ? matchups : [];
  const current = safeMatchups[activeIdx] || safeMatchups[0];

  useEffect(() => {
    if (!current) return;
    const stored = readStoredVote(current.id);
    if (stored) {
      setUserChoiceByMatchup((prev) => (prev[current.id] ? prev : { ...prev, [current.id]: stored }));
    }

    if (votesByMatchup[current.id]?.loaded) return;

    let cancelled = false;
    fetch(`/api/matchups/vote?matchupId=${encodeURIComponent(current.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const leftVotes =
          typeof json.leftVotes === 'number'
            ? json.leftVotes
            : typeof json.data?.leftVotes === 'number'
            ? json.data.leftVotes
            : 0;
        const rightVotes =
          typeof json.rightVotes === 'number'
            ? json.rightVotes
            : typeof json.data?.rightVotes === 'number'
            ? json.data.rightVotes
            : 0;
        setVotesByMatchup((prev) => ({
          ...prev,
          [current.id]: { leftVotes, rightVotes, loaded: true },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setVotesByMatchup((prev) => ({
          ...prev,
          [current.id]: prev[current.id] || { leftVotes: 0, rightVotes: 0, loaded: true },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [current, votesByMatchup]);

  const handleVote = useCallback(
    async (side: 'left' | 'right') => {
      if (!current || submittingId === current.id) return;
      const existingChoice = userChoiceByMatchup[current.id] ?? readStoredVote(current.id);
      if (existingChoice) return;

      setSubmittingId(current.id);
      setUserChoiceByMatchup((prev) => ({ ...prev, [current.id]: side }));
      writeStoredVote(current.id, side);

      setVotesByMatchup((prev) => {
        const cur = prev[current.id] || { leftVotes: 0, rightVotes: 0, loaded: true };
        return {
          ...prev,
          [current.id]: {
            leftVotes: side === 'left' ? cur.leftVotes + 1 : cur.leftVotes,
            rightVotes: side === 'right' ? cur.rightVotes + 1 : cur.rightVotes,
            loaded: true,
          },
        };
      });

      trackEvent('balance_matchup_vote', {
        surface,
        matchup_id: current.id,
        selected_side: side,
        selected_apt: side === 'left' ? current.left.canonicalSlug : current.right.canonicalSlug,
      });

      try {
        const res = await fetch('/api/matchups/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchupId: current.id, side }),
        });
        if (res.ok) {
          const json = await res.json();
          const leftVotes =
            typeof json.leftVotes === 'number'
              ? json.leftVotes
              : typeof json.data?.leftVotes === 'number'
              ? json.data.leftVotes
              : undefined;
          const rightVotes =
            typeof json.rightVotes === 'number'
              ? json.rightVotes
              : typeof json.data?.rightVotes === 'number'
              ? json.data.rightVotes
              : undefined;
          if (typeof leftVotes === 'number' && typeof rightVotes === 'number') {
            setVotesByMatchup((prev) => ({
              ...prev,
              [current.id]: { leftVotes, rightVotes, loaded: true },
            }));
          }
        }
      } catch {
        // Optimistic local state already persisted
      } finally {
        setSubmittingId(null);
      }
    },
    [current, submittingId, surface, userChoiceByMatchup]
  );

  const handleCopyShare = useCallback(async () => {
    if (!current || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const choice = userChoiceByMatchup[current.id];
    const pickedName =
      choice === 'left'
        ? current.left.shortLabel
        : choice === 'right'
        ? current.right.shortLabel
        : null;
    const shareText = [
      `[D-VIEW 동탄 1:1 밸런스 맞대결] ${current.budgetBand}`,
      `${current.left.shortLabel}(${current.left.latestPriceStr}) vs ${current.right.shortLabel}(${current.right.latestPriceStr})`,
      pickedName ? `내 선택: ${pickedName}` : current.question,
      `https://dongtanview.com/guide/${current.relatedGuideSlug}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(current.id);
      trackEvent('balance_matchup_share', {
        surface,
        matchup_id: current.id,
      });
      setTimeout(() => {
        setCopiedId((prev) => (prev === current.id ? null : prev));
      }, 2200);
    } catch {
      // ignore clipboard denial
    }
  }, [current, surface, userChoiceByMatchup]);

  if (!current) return null;

  const tallies = votesByMatchup[current.id] || { leftVotes: 0, rightVotes: 0, loaded: false };
  const totalVotes = tallies.leftVotes + tallies.rightVotes;
  const userChoice = userChoiceByMatchup[current.id] || null;
  const leftPct = totalVotes > 0 ? Math.round((tallies.leftVotes / totalVotes) * 100) : 50;
  const rightPct = totalVotes > 0 ? 100 - leftPct : 50;

  return (
    <section
      data-testid="balance-matchup-widget"
      aria-label={heading}
      className={`rounded-2xl bg-[#f7f8fa] dark:bg-[#151a23] ${compact ? 'p-4' : 'p-4 sm:p-5'} space-y-3.5 tabular-nums ${className}`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#eff1f5] dark:bg-[#1e2532] text-primary shrink-0">
            <Scale size={15} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-[15px] font-black text-primary tracking-tight truncate">
              {heading}
            </h3>
            <span className="text-[11px] font-bold text-tertiary block truncate">
              {current.budgetBand}
              {current.priceGapText ? ` · ${current.priceGapText}` : ''}
            </span>
          </div>
        </div>

        {safeMatchups.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                setActiveIdx((prev) => (prev - 1 + safeMatchups.length) % safeMatchups.length)
              }
              aria-label="이전 맞대결 보기"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg bg-body dark:bg-[#1e2532] hover:bg-[#eff1f5] dark:hover:bg-[#252c3d] text-secondary inline-flex items-center justify-center transition-colors active:scale-95 cursor-pointer touch-manipulation"
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <span className="text-[11px] font-bold text-tertiary px-1 tabular-nums">
              {activeIdx + 1}/{safeMatchups.length}
            </span>
            <button
              type="button"
              onClick={() => setActiveIdx((prev) => (prev + 1) % safeMatchups.length)}
              aria-label="다음 맞대결 보기"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg bg-body dark:bg-[#1e2532] hover:bg-[#eff1f5] dark:hover:bg-[#252c3d] text-secondary inline-flex items-center justify-center transition-colors active:scale-95 cursor-pointer touch-manipulation"
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Debate Question */}
      <p className="text-[13px] sm:text-sm font-extrabold text-primary leading-snug break-keep">
        {current.question}
      </p>

      {/* Left vs Right Choice Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {(['left', 'right'] as const).map((side) => {
          const item = side === 'left' ? current.left : current.right;
          const isPicked = userChoice === side;
          const isOtherPicked = userChoice !== null && userChoice !== side;
          const pct = side === 'left' ? leftPct : rightPct;
          const count = side === 'left' ? tallies.leftVotes : tallies.rightVotes;
          const isLeft = side === 'left';

          return (
            <button
              key={side}
              type="button"
              data-testid={`balance-choice-${side}`}
              onClick={() => handleVote(side)}
              disabled={userChoice !== null || submittingId === current.id}
              className={`group text-left rounded-2xl p-3.5 transition-colors flex flex-col justify-between gap-2.5 min-w-0 ${
                isPicked
                  ? isLeft
                    ? 'bg-brand-blue-light ring-1 ring-brand-blue/35'
                    : 'bg-brand-red-light ring-1 ring-brand-red/35'
                  : 'bg-body hover:bg-[#eff1f5] dark:bg-[#0e1117] dark:hover:bg-[#1e2532]'
              } ${userChoice === null ? 'cursor-pointer' : 'cursor-default'} ${
                isOtherPicked ? 'opacity-80' : ''
              }`}
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className={getVisualSignalPillClass('neutral')}>
                    {item.zoneBadge}
                  </span>
                  {isPicked && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-black ${isLeft ? 'text-brand-blue' : 'text-brand-red'}`}>
                      <Check size={12} aria-hidden="true" />
                      <span>내 선택</span>
                    </span>
                  )}
                </div>
                <div className="text-[14px] font-black text-primary leading-snug break-keep">
                  {item.shortLabel}
                </div>
                <p className="text-[11.5px] font-medium text-secondary leading-snug">
                  {item.keyStrength}
                </p>
              </div>

              <div className="pt-2 border-t border-[#eff1f5] dark:border-[#1e2532] space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold text-tertiary">최근 매매 실거래</span>
                  <span className="text-sm font-black text-primary tabular-nums">
                    {item.latestPriceStr}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 text-[11px] text-secondary">
                  <span>전세 · 전세가율</span>
                  <span className="font-bold tabular-nums">
                    {item.latestRentStr}
                    {item.jeonseRatio !== null ? ` (${item.jeonseRatio.toFixed(1)}%)` : ''}
                  </span>
                </div>

                {userChoice !== null ? (
                  <div className="pt-1 flex items-center justify-between text-[11.5px] font-extrabold">
                    <span className={isLeft ? 'text-brand-blue' : 'text-brand-red'}>
                      {pct}% 선택
                    </span>
                    <span className="text-tertiary font-bold tabular-nums">
                      {count.toLocaleString('ko-KR')}표
                    </span>
                  </div>
                ) : (
                  <div
                    className={`mt-1 w-full py-1.5 rounded-xl text-center text-xs font-extrabold transition-colors bg-[#eff1f5] text-primary dark:bg-[#1e2532] ${
                      isLeft
                        ? 'group-hover:bg-brand-blue group-hover:text-white'
                        : 'group-hover:bg-brand-red group-hover:text-white'
                    }`}
                  >
                    나라면 여기 선택
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Real-Vote Bar & Fact Commentary */}
      <div className="rounded-xl bg-body dark:bg-[#0e1117] p-3 space-y-2">
        {totalVotes > 0 ? (
          <div className="space-y-1.5" data-testid="balance-vote-tally">
            <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold min-w-0">
              <span className="text-brand-blue tabular-nums truncate min-w-0">
                {current.left.shortLabel} {leftPct}%
              </span>
              <span className="text-tertiary tabular-nums shrink-0 whitespace-nowrap">
                실제 참여 {totalVotes.toLocaleString('ko-KR')}표
              </span>
              <span className="text-brand-red tabular-nums truncate min-w-0 text-right">
                {current.right.shortLabel} {rightPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-brand-blue transition-all duration-300"
                style={{ width: `${leftPct}%` }}
              />
              <div
                className="h-full bg-brand-red transition-all duration-300"
                style={{ width: `${rightPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div
            data-testid="balance-zero-votes-honest"
            className="text-[11.5px] font-bold text-secondary"
          >
            아직 첫 투표 전이에요. 위 두 단지 중 끌리는 쪽을 먼저 선택해 보세요.
          </div>
        )}

        <p className="text-[12px] text-secondary leading-relaxed break-keep">
          <strong className="text-primary font-extrabold mr-1">핵심 갈림길:</strong>
          {current.whySplit}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Link
            href={`/guide/${current.relatedGuideSlug}`}
            prefetch={false}
            className="inline-flex items-center gap-1 text-[12px] font-extrabold text-primary hover:underline"
          >
            <span>{current.relatedGuideLabel}</span>
            <ArrowRight size={13} aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] text-[11px] font-bold text-secondary transition-colors cursor-pointer"
          >
            {copiedId === current.id ? (
              <>
                <Check size={12} className="text-primary" aria-hidden="true" />
                <span>복사 완료</span>
              </>
            ) : (
              <>
                <Share2 size={12} aria-hidden="true" />
                <span>맞대결 공유</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
