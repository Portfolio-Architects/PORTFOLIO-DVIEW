'use client';

import React, { useState } from 'react';
import {
  X,
  PenSquare,
  Building2,
  Navigation,
  BadgeCheck,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PostCreateInput } from '@/types/board';

export interface BoardPostWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTitle: string | null;
  dong?: string | null;
  isGpsVerified: boolean;
  gpsVerifiedComplex?: string | null;
  onOpenTitleSelector: () => void;
  onOpenGpsModal: () => void;
  onSubmit: (input: PostCreateInput) => Promise<boolean | void>;
}

export function BoardPostWriteModal({
  isOpen,
  onClose,
  selectedTitle,
  dong,
  isGpsVerified,
  gpsVerifiedComplex,
  onOpenTitleSelector,
  onOpenGpsModal,
  onSubmit,
}: BoardPostWriteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCurrentGpsVerified = Boolean(
    isGpsVerified && gpsVerifiedComplex === selectedTitle
  );

  const isValid =
    Boolean(selectedTitle) &&
    title.trim().length >= 2 &&
    title.trim().length <= 100 &&
    content.trim().length >= 5 &&
    content.trim().length <= 3000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !selectedTitle || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        authorTitle: selectedTitle,
        authorDong: dong || undefined,
        isGpsVerified: isCurrentGpsVerified,
      });

      setTitle('');
      setContent('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '게시글 등록 중 오류가 발생했습니다.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-surface dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-primary max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PenSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 id="write-modal-heading" className="text-base sm:text-lg font-black tracking-tight">
              새 이야기 작성
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1 rounded-lg text-tertiary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Author Title Trigger Card */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary flex items-center justify-between">
              <span>작성자 단지 타이틀</span>
              {!selectedTitle && (
                <span className="text-[11px] text-red-500 font-extrabold">필수 선택</span>
              )}
            </label>

            <button
              type="button"
              data-testid="write-modal-title-trigger"
              onClick={onOpenTitleSelector}
              className="w-full px-3.5 py-3 rounded-xl bg-elevated hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 text-left transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-sm font-extrabold truncate">
                  {selectedTitle || '단지 타이틀을 선택해주세요'}
                </span>
                {dong && (
                  <span className="text-[11px] font-bold text-secondary px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700">
                    {dong}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-tertiary shrink-0" />
            </button>
          </div>

          {/* GPS Verification Badge & Trigger */}
          {selectedTitle && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isCurrentGpsVerified ? (
                  <>
                    <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      입주민 위치 인증 완료 (300m 이내)
                    </span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 text-tertiary" />
                    <span className="text-xs font-bold text-secondary">
                      위치 미인증 (선택 사항)
                    </span>
                  </>
                )}
              </div>

              {!isCurrentGpsVerified && (
                <button
                  type="button"
                  data-testid="write-modal-gps-trigger"
                  onClick={onOpenGpsModal}
                  className="px-2.5 py-1 rounded-lg text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition-colors"
                >
                  GPS 인증하기
                </button>
              )}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary">제목</label>
            <input
              type="text"
              data-testid="write-post-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요 (2자 이상 100자 이하)"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-elevated dark:bg-slate-800 text-sm font-bold text-primary placeholder:text-tertiary outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
            />
            <div className="text-right text-[11px] text-tertiary tabular-nums">
              {title.length}/100
            </div>
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary">내용</label>
            <textarea
              data-testid="write-post-content-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="동탄 이웃과 나누고 싶은 따뜻한 이야기를 적어보세요 (5자 이상 3000자 이하)"
              rows={6}
              maxLength={3000}
              className="w-full px-3.5 py-2.5 rounded-xl bg-elevated dark:bg-slate-800 text-sm font-medium text-primary placeholder:text-tertiary outline-none focus:ring-2 focus:ring-blue-600/30 transition-all resize-none leading-relaxed"
            />
            <div className="text-right text-[11px] text-tertiary tabular-nums">
              {content.length}/3000
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              data-testid="write-post-submit-btn"
              disabled={!isValid || isSubmitting}
              className="w-full py-3 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>등록 중...</span>
                </>
              ) : (
                <span>글 등록하기</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BoardPostWriteModal;
