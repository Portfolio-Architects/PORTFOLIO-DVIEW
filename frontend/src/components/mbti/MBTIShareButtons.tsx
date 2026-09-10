'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react';
import { MbtiApartmentProfile } from '@/types/mbti';
import { copyMbtiResultToClipboard, shareMbtiResultToKakao } from '@/lib/utils/kakaoShare';

export interface MBTIShareButtonsProps {
  profile: MbtiApartmentProfile;
  className?: string;
}

export function MBTIShareButtons({ profile, className = '' }: MBTIShareButtonsProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSharingKakao, setIsSharingKakao] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  const handleCopy = async () => {
    const success = await copyMbtiResultToClipboard(
      {
        mbtiType: profile.type,
        alias: profile.alias,
        aptName: profile.aptName,
        dong: profile.dong,
        tags: profile.tags,
        recommendationReason: profile.recommendationReason,
      },
      showToast
    );

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKakao = async () => {
    setIsSharingKakao(true);
    try {
      await shareMbtiResultToKakao(
        {
          mbtiType: profile.type,
          alias: profile.alias,
          aptName: profile.aptName,
          dong: profile.dong,
          tags: profile.tags,
          recommendationReason: profile.recommendationReason,
        },
        showToast
      );
    } finally {
      setIsSharingKakao(false);
    }
  };

  const handleTwitter = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dongtanview.com';
    const shareUrl = `${origin}/mbti/${profile.type}?utm_source=twitter&utm_medium=viral&utm_campaign=mbti_quiz`;
    const text = `🏢 나의 동탄 주거 MBTI는 [${profile.type}] ${profile.alias}!\n나의 영혼의 맞춤 아파트: ${profile.aptName} (${profile.dong})\n\n👉 지금 D-VIEW에서 테스트해보세요:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dongtanview.com';
        const shareUrl = `${origin}/mbti/${profile.type}?utm_source=webshare&utm_medium=viral&utm_campaign=mbti_quiz`;
        await navigator.share({
          title: `[D-VIEW] 나의 주거 MBTI: [${profile.type}] ${profile.alias}`,
          text: `나와 어울리는 동탄 아파트는 '${profile.aptName}'!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or error, fallback to copy
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className={`w-full flex flex-col items-center relative ${className}`}>
      {/* Button Row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 w-full max-w-lg">
        {/* KakaoTalk Share Button */}
        <button
          type="button"
          onClick={handleKakao}
          disabled={isSharingKakao}
          className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#FEE500] hover:bg-[#FDD800] active:scale-95 text-[#191919] font-bold text-sm shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-60"
          aria-label="카카오톡으로 공유하기"
        >
          <MessageCircle className="w-4 h-4 fill-current shrink-0" />
          <span className="truncate">카카오톡 공유</span>
        </button>

        {/* Link / Result Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-sm shadow-sm transition-all duration-200 cursor-pointer"
          aria-label="결과 링크 복사"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate text-emerald-400">복사됨!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 shrink-0" />
              <span className="truncate">링크 복사</span>
            </>
          )}
        </button>

        {/* X (Twitter) or System Share */}
        <button
          type="button"
          onClick={handleTwitter}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 font-bold text-sm border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200 cursor-pointer"
          aria-label="X(트위터)로 공유하기"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          <span className="truncate">X 공유</span>
        </button>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/95 text-white text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md border border-slate-700/60 flex items-center gap-2 animate-bounce"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
