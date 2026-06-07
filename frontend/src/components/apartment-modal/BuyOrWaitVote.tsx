'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, HelpCircle, Users, Check } from 'lucide-react';
import useSWR, { mutate } from 'swr';

interface BuyOrWaitVoteProps {
  aptName: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BuyOrWaitVote({ aptName }: BuyOrWaitVoteProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<'buy' | 'wait' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const localStorageKey = `dview-vote-${aptName.replace(/\s+/g, '')}`;

  const { data, error, isLoading, mutate: mutateVote } = useSWR(
    aptName ? `/api/apartments/vote?aptName=${encodeURIComponent(aptName)}` : null,
    fetcher
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedVote = localStorage.getItem(localStorageKey);
        if (savedVote) {
          setHasVoted(true);
          setUserVote(savedVote as 'buy' | 'wait');
        } else {
          setHasVoted(false);
          setUserVote(null);
        }
      } catch (e) {
        console.warn('localStorage is unavailable:', e);
      }
    }
  }, [aptName, localStorageKey]);

  const handleVote = async (e: React.MouseEvent<HTMLButtonElement>, type: 'buy' | 'wait') => {
    e.preventDefault();
    if (hasVoted || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/apartments/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aptName,
          voteType: type,
        }),
      });

      const json = await res.json();
      if (json.success) {
        try {
          localStorage.setItem(localStorageKey, type);
        } catch (e) {
          console.warn('Failed to save vote to localStorage:', e);
        }
        setHasVoted(true);
        setUserVote(type);
        
        mutate(`/api/apartments/vote?aptName=${encodeURIComponent(aptName)}`, {
          buyCount: json.buyCount,
          waitCount: json.waitCount,
        }, false);
      }
    } catch (err) {
      console.error('Failed to submit vote:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buyCount = data?.buyCount || 0;
  const waitCount = data?.waitCount || 0;
  const totalVotes = buyCount + waitCount;

  const buyPercent = totalVotes > 0 ? Math.round((buyCount / totalVotes) * 100) : 50;
  const waitPercent = totalVotes > 0 ? 100 - buyPercent : 50;

  return (
    <div className="bg-body rounded-2xl p-4 sm:p-5 border border-border shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Users size={16} className="text-emerald-500" />
          <h4 className="text-[13.5px] font-black text-primary tracking-tight">실수요자 실시간 매수 심리</h4>
        </div>
        {!(isLoading && !data && !error) && !error && (
          <span className="text-[11px] font-bold text-tertiary">
            총 {totalVotes.toLocaleString()}명 참여
          </span>
        )}
      </div>

      {isLoading && !data && !error ? (
        <div className="flex flex-col gap-3.5 py-1 animate-pulse">
          <div className="h-4 bg-border/25 w-3/4 mx-auto rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-border/20 rounded-xl animate-pulse" />
            <div className="h-10 bg-border/20 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-2 text-center">
          <p className="text-[12px] font-bold text-tertiary mb-2.5">
            매수 심리 통계를 불러오지 못했습니다.
          </p>
          <button
            onClick={(e) => { e.preventDefault(); mutateVote(); }}
            className="px-3.5 py-1.5 bg-[#00d29d]/10 hover:bg-[#00d29d]/20 text-[#00d29d] border border-[#00d29d]/25 text-[11.5px] font-black rounded-lg transition-all active:scale-95"
          >
            다시 시도
          </button>
        </div>
      ) : !hasVoted ? (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-secondary font-medium text-center mb-1">
            지금 이 가격에 매수하시겠습니까? (익명 투표)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={(e) => handleVote(e, 'buy')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-extrabold text-[13px] transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-600 active:scale-[0.98] border border-emerald-100"
            >
              <ThumbsUp size={14} className="fill-emerald-600/10" />
              <span>지금 사야 한다</span>
            </button>
            <button
              onClick={(e) => handleVote(e, 'wait')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-extrabold text-[13px] transition-all bg-amber-50 hover:bg-amber-100 text-amber-600 active:scale-[0.98] border border-amber-100"
            >
              <HelpCircle size={14} className="fill-amber-600/10" />
              <span>더 기다려야 한다</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="w-full h-8 bg-black/5 dark:bg-surface/10 rounded-xl overflow-hidden flex relative">
            <div
              style={{ width: `${buyPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center pl-3 transition-all duration-500 ease-out"
            >
              <span className="text-[11.5px] font-black text-white whitespace-nowrap">
                매수 {buyPercent}%
              </span>
            </div>
            <div
              style={{ width: `${waitPercent}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-end pr-3 transition-all duration-500 ease-out"
            >
              <span className="text-[11.5px] font-black text-white whitespace-nowrap">
                관망 {waitPercent}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-tertiary px-1">
            <span className="flex items-center gap-1">
              {userVote === 'buy' && <Check size={12} className="text-emerald-500" />}
              매수 찬성 {buyCount}명
            </span>
            <span className="text-center text-[10.5px] font-medium text-emerald-600">
              {userVote === 'buy' ? '🎉 "지금 사야 한다"에 투표하셨습니다.' : '⏳ "더 기다려야 한다"에 투표하셨습니다.'}
            </span>
            <span className="flex items-center gap-1">
              {userVote === 'wait' && <Check size={12} className="text-amber-500" />}
              관망 유지 {waitCount}명
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
