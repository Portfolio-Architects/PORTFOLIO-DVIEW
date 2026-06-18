'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, HelpCircle, Users, Check } from 'lucide-react';
import useSWR, { mutate } from 'swr';

interface BuyOrWaitVoteProps {
  aptName: string;
  valuationStatus?: 'undervalued' | 'overvalued' | 'fair' | string | null;
  valuationAmount?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const BuyOrWaitVote = React.memo(function BuyOrWaitVote({ 
  aptName,
  valuationStatus = 'fair',
  valuationAmount = '0'
}: BuyOrWaitVoteProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<'buy' | 'wait' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    if (hasVoted || isSubmitting || isSubmittingRef.current) return;
    
    // 즉각적인 동기식 락 적용으로 React state batching 딜레이 동안의 중복 입력 방지
    isSubmittingRef.current = true;
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
        if (mountedRef.current) {
          setHasVoted(true);
          setUserVote(type);
        }
        
        mutate(`/api/apartments/vote?aptName=${encodeURIComponent(aptName)}`, {
          buyCount: json.buyCount,
          waitCount: json.waitCount,
        }, false);
      }
    } catch (err) {
      console.error('Failed to submit vote:', err);
    } finally {
      // 800ms 쓰로틀링 쿨다운을 두어 연속적인 연타 공격 차단 및 Firestore 비용 방어
      setTimeout(() => {
        isSubmittingRef.current = false;
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }, 800);
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

          {/* AI 가치-심리 매칭 진단 패널 */}
          <div className="mt-2.5 p-4 rounded-xl border border-border bg-[#0d9488]/5 dark:bg-[#0d9488]/10 text-left">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[11px] font-black text-[#0d9488] bg-[#0d9488]/10 px-2 py-0.5 rounded">
                AI 진단
              </span>
              <span className="text-[12.5px] font-black text-primary tracking-tight">
                가치-심리 매칭 분석
              </span>
            </div>
            <p className="text-[12px] font-medium text-secondary leading-relaxed break-keep">
              {(() => {
                if (valuationStatus === 'undervalued') {
                  return buyPercent >= 50
                    ? `💡 AI 가치 분석 결과(저평가 상태, 약 ${valuationAmount} 메리트)와 대중의 매수 우위 심리(${buyPercent}%)가 완전히 일치합니다. 안전마진을 확보한 진입 기회일 수 있습니다.`
                    : `⚠️ 시장은 저평가 국면(약 ${valuationAmount} 메리트)이지만 대중은 관망세(${waitPercent}%)를 유지하고 있습니다. 군중과 반대로 가는 역발상적 분할 매수를 검토해볼 시점입니다.`;
                } else if (valuationStatus === 'overvalued') {
                  return waitPercent >= 50
                    ? `💡 AI 가치 분석 결과(고평가 상태, 약 ${valuationAmount} 격차)와 대중의 관망 우위 심리(${waitPercent}%)가 일치합니다. 무리한 추격 매수보다는 시장 가격 조정을 차분히 대기하는 것이 유리합니다.`
                    : `🚨 시장은 고평가 상태(약 ${valuationAmount} 고평가)이나 대중의 매수 찬성 심리(${buyPercent}%)가 강하게 작동하고 있습니다. 군중 심리에 휩쓸린 상단 추격 매수를 경계하시기 바랍니다.`;
                } else {
                  return `⚖️ 현재 이 아파트의 시세는 DCF 내재가치와 균형(적정가 수준)을 이루고 있습니다. 대중들의 의견(매수 ${buyPercent}% vs 관망 ${waitPercent}%)과 개인의 자금 계획을 매칭하여 판단하시길 권장합니다.`;
                }
              })()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

BuyOrWaitVote.displayName = 'BuyOrWaitVote';
export default BuyOrWaitVote;
