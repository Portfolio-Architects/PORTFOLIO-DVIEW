'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ThumbsUp, HelpCircle, Users, Check } from 'lucide-react';
import useSWR, { mutate } from 'swr';
import { logger } from '@/lib/services/logger';

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
  const localStorageKey = `dview-vote-${aptName.replace(/\s+/g, '')}`;

  const [userVote, setUserVote] = useState<'buy' | 'wait' | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedVote = localStorage.getItem(`dview-vote-${aptName.replace(/\s+/g, '')}`);
        return (savedVote as 'buy' | 'wait') || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [hasVoted, setHasVoted] = useState<boolean>(() => userVote !== null);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; style: React.CSSProperties }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const mountedRef = useRef(true);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerConfetti = (type: 'buy' | 'wait') => {
    const emojisList = type === 'buy' 
      ? ['👍', '🚀', '🔥', '👏'] 
      : ['⏳', '🤔', '👀', '💭'];
    const newReactions = emojisList.map((emoji, index) => {
      // Float upwards and outwards
      const angle = -60 - index * 20 + Math.random() * 15;
      const rad = (angle * Math.PI) / 180;
      const distance = 50 + Math.random() * 25;
      const x = Math.cos(rad) * distance;
      const y = Math.sin(rad) * distance;
      const rotate = -25 + Math.random() * 50;
      
      return {
        id: Date.now() + index + Math.random(),
        emoji,
        style: {
          '--pop-x': `${x}px`,
          '--pop-y': `${y}px`,
          '--pop-rotate': `${rotate}deg`,
          left: `${35 + index * 10 + Math.random() * 8}%`,
          top: '20%',
        } as React.CSSProperties,
      };
    });
    setReactions((prev) => [...prev, ...newReactions]);
    
    // Auto-clean reactions after animation completes to free memory
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setReactions((prev) => prev.filter(r => !newReactions.find(nr => nr.id === r.id)));
      }
      reactionTimeoutRef.current = null;
    }, 600);
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current);
      }
    };
  }, []);

  const { data, error, isLoading, mutate: mutateVote } = useSWR(
    aptName ? `/api/apartments/vote?aptName=${encodeURIComponent(aptName)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000
    }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
      logger.warn('BuyOrWaitVote', 'localStorage is unavailable', { aptName }, e);
    }
  }, [aptName, localStorageKey]);

  const handleVote = async (e: React.MouseEvent<HTMLButtonElement>, type: 'buy' | 'wait') => {
    e.preventDefault();
    if (hasVoted || isSubmitting || isSubmittingRef.current) return;
    
    triggerConfetti(type);
    
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
          logger.warn('BuyOrWaitVote', 'Failed to save vote to localStorage', { aptName, voteType: type }, e);
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
      logger.error('BuyOrWaitVote', 'Failed to submit vote', { aptName, voteType: type }, err);
    } finally {
      cooldownTimeoutRef.current = setTimeout(() => {
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

  const [animatedBuyPercent, setAnimatedBuyPercent] = useState(50);
  const [animatedWaitPercent, setAnimatedWaitPercent] = useState(50);

  useEffect(() => {
    if (!hasVoted) return;

    let rId: number;
    const startBuy = animatedBuyPercent;
    const startWait = animatedWaitPercent;
    const targetBuy = buyPercent;
    const targetWait = waitPercent;
    const duration = 600; // 600ms transition
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressRatio = Math.min(progress / duration, 1);
      
      // Ease out quad
      const easeRatio = progressRatio * (2 - progressRatio); 

      const currentBuy = startBuy + (targetBuy - startBuy) * easeRatio;
      const currentWait = startWait + (targetWait - startWait) * easeRatio;

      setAnimatedBuyPercent(Math.round(currentBuy));
      setAnimatedWaitPercent(Math.round(currentWait));

      if (progress < duration) {
        rId = requestAnimationFrame(animate);
      }
    };

    rId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rId);
    };
  }, [hasVoted, buyPercent, waitPercent]);

  const jsonLdElements = useMemo(() => {
    if (isLoading || error || !data) return [];
    
    const elements = [
      {
        "@type": "LocationFeatureSpecification",
        "name": "총 투표 참여자 수",
        "value": `${totalVotes}명 참여`
      },
      {
        "@type": "LocationFeatureSpecification",
        "name": "매수 의견 (지금 사야 한다)",
        "value": `${buyPercent}% (${buyCount}명)`
      },
      {
        "@type": "LocationFeatureSpecification",
        "name": "관망 의견 (더 기다려야 한다)",
        "value": `${waitPercent}% (${waitCount}명)`
      }
    ];

    let aiDiagnosis = "";
    if (valuationStatus === 'undervalued') {
      aiDiagnosis = buyPercent >= 50
        ? `저평가 상태(약 ${valuationAmount} 메리트) 및 매수 우위 심리(${buyPercent}%) 일치. 안전마진을 확보한 진입 기회`
        : `저평가 상태(약 ${valuationAmount} 메리트)이나 대중 관망 우위 심리(${waitPercent}%). 역발상적 분할 매수 검토`;
    } else if (valuationStatus === 'overvalued') {
      aiDiagnosis = waitPercent >= 50
        ? `고평가 상태(약 ${valuationAmount} 격차) 및 관망 우위 심리(${waitPercent}%) 일치. 가격 조정 대기 유리`
        : `고평가 상태(약 ${valuationAmount} 격차)이나 대중 매수 우위 심리(${buyPercent}%). 상단 추격 매수 경계 필요`;
    } else {
      aiDiagnosis = `적정가 수준. 대중 의견(매수 ${buyPercent}% vs 관망 ${waitPercent}%) 및 개인 자금 계획 매칭 권장`;
    }

    elements.push({
      "@type": "LocationFeatureSpecification",
      "name": "AI 가치-심리 매칭 진단 결론",
      "value": aiDiagnosis
    });

    return elements;
  }, [buyCount, waitCount, totalVotes, buyPercent, waitPercent, valuationStatus, valuationAmount, data, isLoading, error]);

  const jsonLd = useMemo(() => {
    if (isLoading || error || !data) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Place",
      "name": `${aptName} 단지 실시간 매수 심리 및 AI 가치 분석 정보`,
      "description": `${aptName} 단지에 대한 실수요자 실시간 매수 의견(찬성/관망) 통계 및 AI의 가치-심리 매칭 분석 진단 데이터입니다.`,
      "amenityFeature": jsonLdElements
    };
  }, [aptName, jsonLdElements, data, isLoading, error]);

  return (
    <div className="bg-body rounded-2xl p-4 sm:p-5 border border-border shadow-sm mt-6">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Users size={16} className="text-emerald-500" />
          <h3 className="text-[13.5px] font-black text-primary tracking-tight">실수요자 실시간 매수 심리</h3>
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
            className="px-3.5 py-1.5 bg-[#ea6100]/10 hover:bg-[#ea6100]/20 text-[#ea6100] border border-[#ea6100]/25 text-[11.5px] font-black rounded-lg transition-all active:scale-95"
          >
            다시 시도
          </button>
        </div>
      ) : !hasVoted ? (
        <div className="flex flex-col gap-3 relative">
          <p className="text-[12px] text-secondary font-medium text-center mb-1">
            지금 이 가격에 매수하시겠습니까? (익명 투표)
          </p>
          <div className="grid grid-cols-2 gap-3 relative">
            <button
              onClick={(e) => handleVote(e, 'buy')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-extrabold text-[13px] transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-600 active:scale-[0.98] border border-emerald-100 relative"
            >
              <ThumbsUp size={14} className="fill-emerald-600/10" />
              <span>지금 사야 한다</span>
            </button>
            <button
              onClick={(e) => handleVote(e, 'wait')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-extrabold text-[13px] transition-all bg-amber-50 hover:bg-amber-100 text-amber-600 active:scale-[0.98] border border-amber-100 relative"
            >
              <HelpCircle size={14} className="fill-amber-600/10" />
              <span>더 기다려야 한다</span>
            </button>
          </div>
          {/* Confetti Emojis Container */}
          {reactions.map((r) => (
            <span
              key={r.id}
              style={r.style}
              className="absolute pointer-events-none select-none text-[20px] animate-emoji-pop z-50"
            >
              {r.emoji}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="w-full h-8 bg-black/5 dark:bg-surface/10 rounded-xl overflow-hidden flex relative">
            <div
              style={{ width: `${animatedBuyPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center pl-3"
            >
              <span className="text-[11.5px] font-black text-white whitespace-nowrap">
                매수 {animatedBuyPercent}%
              </span>
            </div>
            <div
              style={{ width: `${animatedWaitPercent}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-end pr-3"
            >
              <span className="text-[11.5px] font-black text-white whitespace-nowrap">
                관망 {animatedWaitPercent}%
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
          <div className="mt-2.5 p-4 rounded-xl border border-border bg-[#ea6100]/5 dark:bg-[#ea6100]/10 text-left">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[11px] font-black text-[#ea6100] bg-[#ea6100]/10 px-2 py-0.5 rounded">
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
