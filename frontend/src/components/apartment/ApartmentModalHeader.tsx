import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, MapPin, Share, Check, MessageSquare, Camera, Bell,
  Calculator, ChevronDown, Radar, Shield, GraduationCap, ShieldAlert, Star
} from 'lucide-react';
import type { FieldReportData } from '@/types/report';
import { useFavorites } from '@/hooks/useFavorites';
import { usePWA } from '@/components/pwa/PWAProvider';
import { isApartmentInFavorites } from '@/lib/utils/apartmentMapping';
import { trackEvent } from '@/lib/utils/analytics';

export interface ApartmentModalHeaderProps {
  report: FieldReportData;
  displayAptName: string;
  inline?: boolean;
  onBack?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (aptName: string) => void;
  handleNativeShare: () => void;
  handleCopySummary: () => void;
  handleDownloadShareCard: () => void;
  setIsPushModalOpen: (open: boolean) => void;
  copiedStatus: 'all-link' | 'summary' | null;
  isToolDropdownOpen: boolean;
  setIsToolDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toolDropdownRef: React.RefObject<HTMLDivElement | null>;
  preloadCalculators: () => void;
  verifiedSalePriceManwon?: number;
  onOpenCompare?: (aptName: string, targetAptName?: string, trigger?: string) => void;
  onOpenJeonseSafety?: (aptName: string, trigger?: string) => void;
  onOpenMortgage?: (aptName: string, priceWon?: number, trigger?: string) => void;
  onOpenTaxCalculator?: (aptName: string, trigger?: string) => void;
  onOpenSellTimingCalculator?: (aptName: string, trigger?: string) => void;
}

export const ApartmentModalHeader = React.memo(function ApartmentModalHeader({
  report,
  displayAptName,
  inline,
  onBack,
  isFavorite: propIsFavorite,
  onToggleFavorite: propToggleFavorite,
  handleNativeShare,
  handleCopySummary,
  handleDownloadShareCard,
  setIsPushModalOpen,
  copiedStatus,
  isToolDropdownOpen,
  setIsToolDropdownOpen,
  toolDropdownRef,
  preloadCalculators,
  verifiedSalePriceManwon,
  onOpenCompare,
  onOpenJeonseSafety,
  onOpenMortgage,
  onOpenTaxCalculator,
  onOpenSellTimingCalculator,
}: ApartmentModalHeaderProps) {
  const { userFavorites, handleToggleFavorite } = useFavorites();
  const pwa = usePWA();
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [shareAlignLeft, setShareAlignLeft] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  const resolvedDisplayAptName = displayAptName || report.apartmentName || '';
  const targetAptName = report.apartmentName || resolvedDisplayAptName;
  const hasAnyToolAction = Boolean(
    onOpenCompare ||
      onOpenJeonseSafety ||
      onOpenMortgage ||
      onOpenTaxCalculator ||
      onOpenSellTimingCalculator
  );
  const verifiedSalePriceWon =
    typeof verifiedSalePriceManwon === 'number' &&
    Number.isFinite(verifiedSalePriceManwon) &&
    verifiedSalePriceManwon > 0
      ? Math.round(verifiedSalePriceManwon) * 10_000
      : undefined;

  useEffect(() => {
    if (isToolDropdownOpen && isShareMenuOpen) {
      setIsShareMenuOpen(false);
    }
  }, [isToolDropdownOpen, isShareMenuOpen]);

  useEffect(() => {
    if (!isShareMenuOpen || typeof document === 'undefined' || typeof window === 'undefined') return;
    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer, { passive: true });
    window.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [isShareMenuOpen]);

  useEffect(() => {
    if (!isToolDropdownOpen || typeof window === 'undefined') return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsToolDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => {
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [isToolDropdownOpen, setIsToolDropdownOpen]);

  const effectiveIsFavorite =
    propIsFavorite !== undefined
      ? propIsFavorite
      : isApartmentInFavorites(userFavorites, targetAptName) ||
        isApartmentInFavorites(userFavorites, resolvedDisplayAptName);
  const effectiveToggleFavorite = propToggleFavorite || handleToggleFavorite;
  const HeadingTag = inline ? 'h2' : 'h1';

  const handleToggleFavoriteClick = () => {
    const nextIsFav = !effectiveIsFavorite;
    trackEvent('watchlist_toggle_favorite', {
      apt_name: targetAptName,
      is_favorite: nextIsFav,
      surface: 'apartment_detail',
    });
    effectiveToggleFavorite(targetAptName);
    if (nextIsFav) {
      pwa?.showToast?.(
        `${resolvedDisplayAptName} 관심단지에 저장됨 · 매일 오전 7시대 실거래 알림도 켜보세요`
      );
    }
  };

  const handleOpenPushClick = (triggerPrefix: string) => {
    trackEvent('push_modal_open', {
      surface: 'apartment_detail',
      trigger: effectiveIsFavorite ? `${triggerPrefix}_post_fav_7am` : `${triggerPrefix}_7am_cta`,
      apt_name: targetAptName,
      apartment_name: targetAptName,
      ...(report.dong ? { dong: report.dong } : {}),
    });
    setIsPushModalOpen(true);
  };

  const toolDropdownMenu = isToolDropdownOpen && (
    <div
      data-testid="apt-header-tool-menu"
      data-scroll-interactive="true"
      className="absolute right-0 mt-2 w-[216px] max-w-[calc(100vw-32px)] bg-surface border border-border rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.1)] py-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="px-3.5 py-1.5 text-[11px] font-bold text-tertiary border-b border-border select-none">
        금융 계산 · 비교
      </div>

      {onOpenMortgage && (
        <button
          type="button"
          onClick={() => {
            onOpenMortgage(report.apartmentName, verifiedSalePriceWon);
            setIsToolDropdownOpen(false);
          }}
          onMouseEnter={preloadCalculators}
          onFocus={preloadCalculators}
          className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2.5 border-none bg-transparent cursor-pointer"
        >
          <Calculator size={15} className="text-secondary shrink-0" />
          <span>대출 계산기</span>
        </button>
      )}

      {onOpenTaxCalculator && (
        <button
          type="button"
          onClick={() => {
            onOpenTaxCalculator(report.apartmentName);
            setIsToolDropdownOpen(false);
          }}
          onMouseEnter={preloadCalculators}
          onFocus={preloadCalculators}
          className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2.5 border-none bg-transparent cursor-pointer"
        >
          <GraduationCap size={15} className="text-secondary shrink-0" />
          <span>취득세 계산기</span>
        </button>
      )}

      {onOpenJeonseSafety && (
        <button
          type="button"
          onClick={() => {
            onOpenJeonseSafety(report.apartmentName);
            setIsToolDropdownOpen(false);
          }}
          onMouseEnter={preloadCalculators}
          onFocus={preloadCalculators}
          className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2.5 border-none bg-transparent cursor-pointer"
        >
          <Shield size={15} className="text-secondary shrink-0" />
          <span>전세 안전진단</span>
        </button>
      )}

      {onOpenCompare && (
        <button
          type="button"
          onClick={() => {
            onOpenCompare(report.apartmentName);
            setIsToolDropdownOpen(false);
          }}
          onMouseEnter={preloadCalculators}
          onFocus={preloadCalculators}
          className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2.5 border-none bg-transparent cursor-pointer"
        >
          <Radar size={15} className="text-secondary shrink-0" />
          <span>단지 1:1 비교</span>
        </button>
      )}

      {onOpenSellTimingCalculator && (
        <button
          type="button"
          onClick={() => {
            onOpenSellTimingCalculator(report.apartmentName);
            setIsToolDropdownOpen(false);
          }}
          onMouseEnter={preloadCalculators}
          onFocus={preloadCalculators}
          className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2.5 border-none bg-transparent cursor-pointer"
        >
          <ShieldAlert size={15} className="text-secondary shrink-0" />
          <span>매도 타이밍 진단</span>
        </button>
      )}
    </div>
  );

  if (!inline) {
    return (
      <div
        data-testid="apt-modal-slim-header"
        data-scroll-interactive="true"
        className="w-full bg-surface pt-3.5 md:pt-4 pb-2.5 px-4 md:px-6 rounded-t-none md:rounded-tl-3xl relative z-[65]"
      >
        <div className="w-full flex flex-col gap-2.5">
          {/* Line 1: Complex name + subtle dong label (pr-11 reserves space for close button) */}
          <div className="flex items-baseline gap-2 min-w-0 pr-11 min-h-[30px] md:min-h-[34px]">
            <HeadingTag
              title={resolvedDisplayAptName}
              className="text-[18px] sm:text-[20px] md:text-[22px] font-extrabold leading-[1.25] tracking-tight text-primary min-w-0 truncate"
            >
              {resolvedDisplayAptName}
            </HeadingTag>
            <span className="text-[12px] font-semibold text-tertiary whitespace-nowrap shrink-0 tabular-nums">
              {report.dong || '동탄'}
            </span>
          </div>

          {/* Line 2: Single-row quiet monochrome utility actions + SINGLE primary accent CTA */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full select-none flex-nowrap">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-nowrap">
              <button
                type="button"
                data-testid="apt-detail-favorite-btn"
                aria-pressed={effectiveIsFavorite}
                aria-label={`${resolvedDisplayAptName} ${effectiveIsFavorite ? '관심단지 해제' : '관심단지 저장'}`}
                onClick={handleToggleFavoriteClick}
                className={`h-8 px-2 sm:px-2.5 rounded-[10px] inline-flex items-center gap-1 sm:gap-1.5 font-semibold text-[12px] border-none cursor-pointer transition-colors active:scale-[0.97] whitespace-nowrap shrink-0 ${
                  effectiveIsFavorite
                    ? 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary ring-1 ring-inset ring-slate-900/15 dark:ring-white/20'
                    : 'bg-[#eff1f5] hover:bg-[#e4e8ef] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-secondary hover:text-primary'
                }`}
                title={effectiveIsFavorite ? '관심단지에서 해제' : '로그인 없이 관심단지 저장'}
              >
                <Star
                  size={13}
                  strokeWidth={2.2}
                  className={effectiveIsFavorite ? 'fill-current shrink-0' : 'shrink-0'}
                />
                <span>
                  <span className="hidden sm:inline">관심단지 </span>
                  {effectiveIsFavorite ? '저장됨' : '저장'}
                </span>
              </button>

              <button
                type="button"
                data-testid="apt-header-morning-7am-btn"
                aria-label="매일 오전 7시대 실거래 알림 받기"
                onClick={() => handleOpenPushClick('header')}
                className="h-8 px-2 sm:px-2.5 bg-[#eff1f5] hover:bg-[#e4e8ef] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-secondary hover:text-primary rounded-[10px] inline-flex items-center gap-1 sm:gap-1.5 font-semibold text-[12px] border-none cursor-pointer transition-colors active:scale-[0.97] whitespace-nowrap shrink-0 tabular-nums"
                title="매일 오전 7시대 실거래 요약 알림 받기"
              >
                <Bell size={13} strokeWidth={2.2} className="shrink-0" />
                <span>07시 알림</span>
              </button>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolvedDisplayAptName + (resolvedDisplayAptName.includes('아파트') ? '' : ' 아파트'))}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="구글 지도에서 위치 보기"
                className="h-8 w-8 sm:w-auto px-0 sm:px-2.5 justify-center rounded-[10px] text-[12px] font-semibold text-secondary hover:text-primary hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                title="구글 지도에서 아파트 위치 보기"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">지도보기</span>
              </a>

              <div className="relative shrink-0" ref={shareMenuRef}>
                <button
                  type="button"
                  data-testid="apt-header-share-menu-btn"
                  aria-label="공유 및 저장 옵션"
                  aria-expanded={isShareMenuOpen}
                  onClick={() => {
                    setIsToolDropdownOpen(false);
                    setIsShareMenuOpen((prev) => !prev);
                  }}
                  className="h-8 w-8 sm:w-auto px-0 sm:px-2.5 justify-center rounded-[10px] text-[12px] font-semibold text-secondary hover:text-primary hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] inline-flex items-center gap-1 border-none bg-transparent cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  title="공유 · 요약 복사 · 이미지 저장"
                >
                  {copiedStatus ? (
                    <Check size={13} strokeWidth={2.4} className="text-primary shrink-0" />
                  ) : (
                    <Share size={13} strokeWidth={2.2} className="shrink-0" />
                  )}
                  <span className="hidden sm:inline">{copiedStatus ? '복사됨' : '공유'}</span>
                </button>

                {isShareMenuOpen && (
                  <div
                    data-testid="apt-header-share-menu"
                    data-scroll-interactive="true"
                    className="absolute right-0 mt-1.5 w-[184px] bg-surface border border-border rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.1)] py-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleNativeShare();
                        setIsShareMenuOpen(false);
                      }}
                      title="아파트 분석 리포트 공유하기"
                      className="w-full text-left px-3.5 py-2.5 text-[12.5px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                    >
                      <Share size={14} className="text-secondary shrink-0" />
                      <span>{copiedStatus === 'all-link' ? '링크 복사 완료' : '링크 공유'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopySummary();
                        setIsShareMenuOpen(false);
                      }}
                      title="단톡방용 텍스트 요약 복사"
                      className="w-full text-left px-3.5 py-2.5 text-[12.5px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                    >
                      <MessageSquare size={14} className="text-secondary shrink-0" />
                      <span>{copiedStatus === 'summary' ? '요약 복사 완료' : '텍스트 요약 복사'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDownloadShareCard();
                        setIsShareMenuOpen(false);
                      }}
                      title="인포그래픽 요약 카드 이미지 다운로드"
                      className="w-full text-left px-3.5 py-2.5 text-[12.5px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                    >
                      <Camera size={14} className="text-secondary shrink-0" />
                      <span>요약 이미지 저장</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {hasAnyToolAction && (
              <div className="relative shrink-0" ref={toolDropdownRef}>
                <button
                  type="button"
                  data-testid="apt-header-tool-menu-btn"
                  aria-label="분석 및 금융 도구"
                  aria-expanded={isToolDropdownOpen}
                  onMouseEnter={preloadCalculators}
                  onFocus={preloadCalculators}
                  onClick={() => setIsToolDropdownOpen((prev) => !prev)}
                  className="h-8 px-2.5 sm:px-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded-[10px] inline-flex items-center gap-1 sm:gap-1.5 font-bold text-[12px] border-none cursor-pointer transition-colors active:scale-[0.97] whitespace-nowrap"
                  title="대출·취득세·전세·비교 계산기 열기"
                >
                  <Calculator size={13} className="shrink-0" />
                  <span>금융 도구</span>
                  <ChevronDown
                    size={13}
                    className={`shrink-0 transition-transform duration-200 ${isToolDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {toolDropdownMenu}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full bg-surface pt-8 md:pt-10 pb-5 px-4 md:px-10 rounded-t-none md:rounded-t-3xl border-b border-border relative ${
        isToolDropdownOpen || isShareMenuOpen ? 'z-[65]' : 'z-20'
      }`}
    >
      <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 lg:min-w-[420px]">
          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                type="button"
                data-testid="apt-inline-back-btn"
                onClick={onBack}
                className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary bg-[#eff1f5] hover:bg-[#e4e8ef] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer border-none"
                title="이전 화면으로 돌아가기"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>뒤로가기</span>
              </button>
            )}
            <span className="text-[13px] font-semibold text-tertiary whitespace-nowrap shrink-0">
              {report.dong || '동탄'}
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolvedDisplayAptName + (resolvedDisplayAptName.includes('아파트') ? '' : ' 아파트'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] px-2 py-1 rounded-lg transition-colors shrink-0"
              title="구글 지도에서 아파트 위치 보기"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>지도보기</span>
            </a>
          </div>
          <div className="flex items-center justify-between gap-3 w-full">
            <HeadingTag
              className="text-xl sm:text-2xl lg:text-[28px] xl:text-[32px] font-extrabold leading-[1.25] tracking-tight text-primary min-w-0 flex-1"
            >
              <span className="break-keep break-words block w-full">{resolvedDisplayAptName}</span>
            </HeadingTag>
          </div>
        </div>

        <div
          data-testid="apt-inline-header-actions"
          className="flex flex-wrap items-center justify-between lg:justify-end gap-1.5 w-full lg:w-auto shrink-0 select-none"
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {/* Favorite Watchlist Toggle (Live Spark neutral ink chrome) */}
            <button
              type="button"
              data-testid="apt-detail-favorite-btn"
              aria-pressed={effectiveIsFavorite}
              aria-label={`${resolvedDisplayAptName} ${effectiveIsFavorite ? '관심단지 해제' : '관심단지 저장'}`}
              onClick={handleToggleFavoriteClick}
              className={`h-9 px-3 sm:px-3.5 rounded-xl flex items-center gap-1.5 font-semibold text-[12.5px] sm:text-[13px] border-none cursor-pointer transition-colors active:scale-[0.97] shrink-0 touch-manipulation ${
                effectiveIsFavorite
                  ? 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary ring-1 ring-inset ring-slate-900/15 dark:ring-white/20'
                  : 'bg-[#eff1f5] hover:bg-[#e4e8ef] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-secondary hover:text-primary'
              }`}
              title={effectiveIsFavorite ? '관심단지에서 해제' : '로그인 없이 관심단지 저장'}
            >
              <Star
                size={14}
                strokeWidth={2.2}
                className={effectiveIsFavorite ? 'fill-current shrink-0' : 'shrink-0'}
              />
              <span>
                <span className="hidden sm:inline">관심단지 </span>
                {effectiveIsFavorite ? '저장됨' : '저장'}
              </span>
            </button>

            {/* Push Notifications Button (Quiet monochrome) */}
            <button
              type="button"
              data-testid="apt-header-morning-7am-btn"
              onClick={() => handleOpenPushClick('inline_header')}
              className="h-9 px-3 sm:px-3.5 bg-[#eff1f5] hover:bg-[#e4e8ef] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-secondary hover:text-primary rounded-xl flex items-center gap-1.5 font-semibold text-[12.5px] sm:text-[13px] border-none cursor-pointer transition-colors active:scale-[0.97] shrink-0 tabular-nums touch-manipulation"
              title="매일 오전 7시대 실거래 요약 알림 받기"
            >
              <Bell size={14} strokeWidth={2.2} />
              <span>07시 알림</span>
            </button>

            {/* Mobile/Tablet (<lg) Compact Share Popover Trigger (restores share access without overflow-x clipping) */}
            <div className="relative shrink-0 lg:hidden" ref={shareMenuRef}>
              <button
                type="button"
                data-testid="apt-header-share-menu-btn"
                aria-label="공유 및 저장 옵션"
                aria-expanded={isShareMenuOpen}
                onClick={() => {
                  setIsToolDropdownOpen(false);
                  if (!isShareMenuOpen && shareMenuRef.current) {
                    const rect = shareMenuRef.current.getBoundingClientRect();
                    // Default right-0 aligns cleanly on 320px+ screens; flip to left-0 only if button wraps to far-left edge
                    setShareAlignLeft(rect.right > 0 && rect.right < 196);
                  }
                  setIsShareMenuOpen((prev) => !prev);
                }}
                className="h-9 w-9 sm:w-auto sm:px-3 justify-center rounded-xl text-[12.5px] font-semibold text-secondary hover:text-primary bg-[#eff1f5] hover:bg-[#e4e8ef] dark:bg-[#1e2532] dark:hover:bg-[#252c3d] inline-flex items-center gap-1.5 border-none cursor-pointer transition-colors active:scale-[0.97] whitespace-nowrap shrink-0 touch-manipulation"
                title="공유 · 요약 복사 · 이미지 저장"
              >
                {copiedStatus ? (
                  <Check size={14} strokeWidth={2.4} className="text-primary shrink-0" />
                ) : (
                  <Share size={14} strokeWidth={2.2} className="shrink-0" />
                )}
                <span className="hidden sm:inline">{copiedStatus ? '복사됨' : '공유'}</span>
              </button>

              {isShareMenuOpen && (
                <div
                  data-testid="apt-header-share-menu"
                  data-scroll-interactive="true"
                  className={`absolute ${
                    shareAlignLeft ? 'left-0' : 'right-0'
                  } mt-1.5 w-[184px] max-w-[calc(100vw-32px)] bg-surface border border-border rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.1)] py-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-150`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleNativeShare();
                      setIsShareMenuOpen(false);
                    }}
                    title="아파트 분석 리포트 공유하기"
                    className="w-full text-left px-3.5 py-2.5 text-[12.5px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <Share size={14} className="text-secondary shrink-0" />
                    <span>{copiedStatus === 'all-link' ? '링크 복사 완료' : '링크 공유'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCopySummary();
                      setIsShareMenuOpen(false);
                    }}
                    title="단톡방용 텍스트 요약 복사"
                    className="w-full text-left px-3.5 py-2.5 text-[12.5px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <MessageSquare size={14} className="text-secondary shrink-0" />
                    <span>{copiedStatus === 'summary' ? '요약 복사 완료' : '텍스트 요약 복사'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadShareCard();
                      setIsShareMenuOpen(false);
                    }}
                    title="인포그래픽 요약 카드 이미지 다운로드"
                    className="w-full text-left px-3.5 py-2.5 text-[12.5px] font-semibold text-primary hover:bg-elevated transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <Camera size={14} className="text-secondary shrink-0" />
                    <span>요약 이미지 저장</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share Link Button (Desktop Quiet monochrome) */}
            <button
              type="button"
              onClick={handleNativeShare}
              className={`h-9 px-3 rounded-xl hidden lg:flex items-center gap-1.5 font-semibold text-[13px] border-none cursor-pointer transition-colors active:scale-[0.97] shrink-0 ${
                copiedStatus === 'all-link'
                  ? 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary'
                  : 'hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-secondary hover:text-primary bg-transparent'
              }`}
              title="아파트 분석 리포트 공유하기"
            >
              {copiedStatus === 'all-link' ? (
                <Check size={14} strokeWidth={2.4} />
              ) : (
                <Share size={14} strokeWidth={2.2} />
              )}
              <span>{copiedStatus === 'all-link' ? '복사됨' : '공유'}</span>
            </button>

            {/* Group Chat Summary Copy Button (Desktop Quiet monochrome) */}
            <button
              type="button"
              onClick={handleCopySummary}
              className={`h-9 px-3 rounded-xl hidden lg:flex items-center gap-1.5 font-semibold text-[13px] border-none cursor-pointer transition-colors active:scale-[0.97] shrink-0 ${
                copiedStatus === 'summary'
                  ? 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary'
                  : 'hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-secondary hover:text-primary bg-transparent'
              }`}
              title="단톡방용 텍스트 요약 복사"
            >
              {copiedStatus === 'summary' ? (
                <Check size={14} strokeWidth={2.4} />
              ) : (
                <MessageSquare size={14} strokeWidth={2.2} />
              )}
              <span>{copiedStatus === 'summary' ? '복사됨' : '요약 복사'}</span>
            </button>

            {/* Infographic Summary Image Download Button (Desktop Quiet monochrome) */}
            <button
              type="button"
              onClick={handleDownloadShareCard}
              className="h-9 px-3 hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-secondary hover:text-primary border-none bg-transparent rounded-xl hidden lg:flex items-center gap-1.5 font-semibold text-[13px] cursor-pointer transition-colors active:scale-[0.97] shrink-0"
              title="인포그래픽 요약 카드 이미지 다운로드"
            >
              <Camera size={14} strokeWidth={2.2} />
              <span>이미지</span>
            </button>
          </div>

          {/* Single Primary Ink CTA: Financial & Analysis Toolkit Dropdown */}
          {hasAnyToolAction && (
            <div className="relative shrink-0 ml-auto lg:ml-0" ref={toolDropdownRef}>
              <button
                type="button"
                data-testid="apt-header-tool-menu-btn"
                aria-label="분석 및 금융 도구"
                aria-expanded={isToolDropdownOpen}
                onMouseEnter={preloadCalculators}
                onFocus={preloadCalculators}
                onClick={() => {
                  setIsShareMenuOpen(false);
                  setIsToolDropdownOpen((prev) => !prev);
                }}
                className="h-9 px-3.5 sm:px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded-xl flex items-center gap-1.5 font-bold text-[12.5px] sm:text-[13px] border-none cursor-pointer transition-colors active:scale-[0.97] whitespace-nowrap touch-manipulation"
                title="대출·취득세·전세·비교 계산기 열기"
              >
                <Calculator size={14} />
                <span>금융 도구</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isToolDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {toolDropdownMenu}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
