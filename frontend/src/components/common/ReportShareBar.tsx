'use client';

import React, { useState } from 'react';
import { Copy, Check, Share2, MessageSquare } from 'lucide-react';
import { copyTextToClipboardDirect } from '@/lib/utils/kakaoShare';

export interface ReportShareBarProps {
  title: string;
  summaryLines: string[];
  canonicalPath: string;
  campaign?: string;
}

export default function ReportShareBar({
  title,
  summaryLines,
  canonicalPath,
  campaign = 'report_share',
}: ReportShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const buildSharePayload = (source: 'clipboard' | 'webshare') => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://dongtanview.com';
    const normalizedPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
    const separator = normalizedPath.includes('?') ? '&' : '?';
    const shareUrl = `${origin}${normalizedPath}${separator}utm_source=${source}&utm_medium=viral&utm_campaign=${encodeURIComponent(campaign)}`;

    const validLines = summaryLines.filter((line) => line && line.trim().length > 0);
    const bulletBlock = validLines.map((line) => `- ${line}`).join('\n');

    const fullText = [
      `[D-VIEW 핵심 리포트 요약] ${title}`,
      bulletBlock,
      `상세 데이터 및 시세 리포트 확인: ${shareUrl}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    return { shareUrl, fullText };
  };

  const handleCopySummary = async () => {
    const { fullText } = buildSharePayload('clipboard');
    const ok = await copyTextToClipboardDirect(fullText);
    if (ok) {
      setCopied(true);
      setStatusText('핵심 3줄 요약과 리포트 링크가 복사되었습니다. 단톡방이나 카페에 바로 붙여넣으세요.');
      setTimeout(() => {
        setCopied(false);
      }, 2500);
      setTimeout(() => {
        setStatusText(null);
      }, 4000);
    }
  };

  const handleNativeShare = async () => {
    const { shareUrl, fullText } = buildSharePayload('webshare');
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `[D-VIEW] ${title}`,
          text: fullText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy when user cancels or browser blocks Web Share
      }
    }
    await handleCopySummary();
  };

  return (
    <div
      data-testid="report-share-bar"
      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
    >
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
          <MessageSquare size={14} className="shrink-0" />
          <span>단톡방 · 부동산 커뮤니티 핵심 요약 공유</span>
        </div>
        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
          {statusText || '본 리포트의 핵심 실거래 수치 요약과 바로가기 링크를 한 번에 복사해 공유할 수 있습니다.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCopySummary}
          data-testid="report-share-copy-btn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-50 text-xs font-extrabold transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={14} className="shrink-0" />
              <span>요약 · 링크 복사됨</span>
            </>
          ) : (
            <>
              <Copy size={14} className="shrink-0" />
              <span>단톡방·카페 요약 복사</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleNativeShare}
          data-testid="report-share-native-btn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-slate-50 text-xs font-extrabold transition-colors cursor-pointer"
        >
          <Share2 size={14} className="shrink-0" />
          <span>리포트 공유하기</span>
        </button>
      </div>
    </div>
  );
}
