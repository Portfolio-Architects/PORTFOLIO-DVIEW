'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Lock,
  Building2,
  BadgeCheck,
  X,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  getAllSelectableTitles,
  getComplexData,
  isGeocodedComplex,
  isUnmappedComplex,
  VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
} from '@/lib/board/boardEngine';

export interface ApartmentTitleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string | null;
  isLocked: boolean;
  daysRemaining: number;
  onSelectTitle: (title: string) => Promise<boolean | void> | boolean | void;
}

export function ApartmentTitleSelectorModal({
  isOpen,
  onClose,
  currentTitle,
  isLocked,
  daysRemaining,
  onSelectTitle,
}: ApartmentTitleSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allTitles = useMemo(() => getAllSelectableTitles(), []);

  const filteredTitles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return allTitles;
    return allTitles.filter((t) =>
      t.toLowerCase().replace(/\s+/g, '').includes(q)
    );
  }, [allTitles, searchQuery]);

  if (!isOpen) return null;

  const handleTitleClick = (title: string) => {
    if (isLocked) {
      return;
    }
    setPendingTitle(title);
    setErrorMessage(null);
  };

  const handleConfirmLock = async () => {
    if (!pendingTitle) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onSelectTitle(pendingTitle);
      setPendingTitle(null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '타이틀 확정에 실패했습니다.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPending = () => {
    setPendingTitle(null);
    setErrorMessage(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-selector-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg max-h-[85vh] bg-surface dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2
              id="title-selector-modal-heading"
              className="text-base sm:text-lg font-black tracking-tight"
            >
              단지 타이틀 선택
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

        {/* 30-Day Active Lock Notice Banner */}
        {isLocked && (
          <div
            data-testid="title-locked-banner"
            className="px-5 py-3 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200/60 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 flex items-start gap-2 text-xs sm:text-sm font-semibold"
          >
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-1.5 font-bold">
                <span>단지 타이틀 30일 고정 기간</span>
                <span className="px-1.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 tabular-nums">
                  D-{daysRemaining}
                </span>
              </div>
              <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5">
                입주민 사칭 방지 규정에 따라 현재 설정된 [{currentTitle}] 타이틀은 30일간 변경할 수 없습니다.
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="단지명 검색 (예: 롯데캐슬, 퍼스트빌, 예비입주민)"
              disabled={isLocked}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-elevated dark:bg-slate-800 text-sm font-bold text-primary placeholder:text-tertiary outline-none focus:ring-2 focus:ring-blue-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-tertiary font-semibold">
            <span>동탄 183개 단지 + 예비입주민 (총 184개)</span>
            <span className="tabular-nums">검색 결과: {filteredTitles.length}개</span>
          </div>
        </div>

        {/* Titles Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 sm:p-3">
          {filteredTitles.length === 0 ? (
            <div className="py-12 text-center text-tertiary text-xs sm:text-sm font-semibold">
              검색된 단지가 없습니다. 단지명을 다시 확인해주세요.
            </div>
          ) : (
            filteredTitles.map((title) => {
              const isSelected = currentTitle === title;
              const isVirtual = title === VIRTUAL_PROSPECTIVE_RESIDENT_TITLE;
              const hasCoords = isGeocodedComplex(title);
              const unmapped = isUnmappedComplex(title);
              const meta = getComplexData(title);

              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleTitleClick(title)}
                  disabled={isLocked}
                  className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/80'
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  } ${isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-primary truncate">
                        {title}
                      </span>
                      {meta?.dong && (
                        <span className="text-[11px] font-bold text-secondary px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800">
                          {meta.dong}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {isVirtual ? (
                        <span className="text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                          예비입주민
                        </span>
                      ) : hasCoords ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          <BadgeCheck className="w-3 h-3" /> GPS 인증 가능
                        </span>
                      ) : unmapped ? (
                        <span className="text-[10.5px] font-extrabold text-tertiary bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          좌표 미등록
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 shrink-0 text-xs font-bold">
                      <Check className="w-4 h-4" />
                      <span>선택됨</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* 30-Day Lock Confirmation Dialog Sub-Modal */}
        {pendingTitle && (
          <div
            data-testid="lock-warning-modal"
            className="absolute inset-0 z-20 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          >
            <div className="w-full max-w-sm bg-surface dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl text-primary space-y-4">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-black">단지 타이틀 30일 고정 확정</h3>
                <p className="text-xs sm:text-sm text-secondary font-medium leading-relaxed">
                  선택하신 <span className="font-extrabold text-blue-600 dark:text-blue-400">[{pendingTitle}]</span>(으)로 단지 타이틀을 설정하시겠습니까?
                </p>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold leading-normal border border-slate-200/80 dark:border-slate-700/80">
                  단지 타이틀은 설정 후 30일간 변경할 수 없습니다. 확정하시겠습니까?
                </div>
              </div>

              {errorMessage && (
                <div className="text-xs text-red-500 font-bold text-center">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelPending}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-secondary transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLock}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '확정 중...' : '확정'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-200/80 dark:bg-slate-800 text-primary hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApartmentTitleSelectorModal;
