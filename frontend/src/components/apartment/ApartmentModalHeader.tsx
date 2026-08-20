import React from 'react';
import {
  MapPin, Heart, Share, Check, MessageSquare, Camera, Bell,
  Calculator, ChevronDown, Radar, Shield, GraduationCap, ShieldAlert
} from 'lucide-react';
import type { FieldReportData } from '@/lib/types/report.types';

export interface ApartmentModalHeaderProps {
  report: FieldReportData;
  displayAptName: string;
  inline?: boolean;
  isFavoritedModal: boolean;
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
  onOpenCompare?: (aptName: string) => void;
  onOpenJeonseSafety?: (aptName: string) => void;
  onOpenMortgage?: (aptName: string) => void;
  onOpenTaxCalculator?: (aptName: string) => void;
  onOpenSellTimingCalculator?: (aptName: string) => void;
}

export const ApartmentModalHeader = React.memo(function ApartmentModalHeader({
  report,
  displayAptName,
  inline,
  isFavoritedModal,
  onToggleFavorite,
  handleNativeShare,
  handleCopySummary,
  handleDownloadShareCard,
  setIsPushModalOpen,
  copiedStatus,
  isToolDropdownOpen,
  setIsToolDropdownOpen,
  toolDropdownRef,
  preloadCalculators,
  onOpenCompare,
  onOpenJeonseSafety,
  onOpenMortgage,
  onOpenTaxCalculator,
  onOpenSellTimingCalculator,
}: ApartmentModalHeaderProps) {
  return (
    <div className={`w-full ${inline ? 'bg-surface' : 'bg-surface/70 dark:bg-surface/40 backdrop-blur-md'} pt-8 md:pt-10 pb-6 px-4 md:px-10 border-b border-border rounded-t-none md:rounded-t-3xl relative z-20`}>
      <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 lg:min-w-[450px]">
          <div className="flex items-center gap-2">
            <span className="bg-body text-secondary text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0">{report.dong || '동탄'}</span>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAptName + (displayAptName.includes('아파트') ? '' : ' 아파트'))}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1b64da] bg-[#e8f3ff] hover:bg-[#dbeafe] px-2.5 py-1 rounded-full transition-all shrink-0 group border border-[#1b64da]/20"
              title="구글 지도에서 아파트 위치 보기"
            >
              <MapPin className="w-3 h-3 group-hover:scale-105 transition-transform" />
              <span>지도보기</span>
            </a>
          </div>
          <div className="flex items-center justify-between gap-3 w-full">
            <h1 className="text-xl sm:text-2xl lg:text-[28px] xl:text-[32px] min-[1400px]:text-[36px] font-extrabold leading-[1.25] tracking-tight text-primary min-w-0 flex-1">
              <span className="break-keep break-words block w-full">{displayAptName}</span>
            </h1>
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(report.apartmentName);
                }}
                className={`px-3 py-1.5 rounded-xl border transition-all duration-200 active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isFavoritedModal
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    : 'bg-neutral-100 dark:bg-zinc-800/80 border-border/40 text-neutral-400 hover:text-rose-400'
                }`}
                title={isFavoritedModal ? '관심 단지 해제' : '관심 단지 등록'}
                aria-label={`${displayAptName} 관심 단지 ${isFavoritedModal ? '해제' : '등록'}`}
              >
                <Heart
                  size={18}
                  className={`transition-all duration-300 ${
                    isFavoritedModal ? 'text-rose-500 fill-current scale-110' : 'text-neutral-400'
                  }`}
                />
                <span className="text-xs font-black">
                  {isFavoritedModal ? '관심 단지' : '관심 등록'}
                </span>
              </button>
            )}
          </div>
        </div>

        <div 
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 py-1.5 w-[calc(100%+2rem)] shrink-0 lg:w-auto lg:overflow-x-visible lg:px-0 lg:mx-0 select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Share Link Button */}
          <button
            onClick={handleNativeShare}
            className={`h-10 px-4 rounded-[12px] shadow-sm hidden lg:flex items-center gap-1.5 font-extrabold text-[13px] border-none cursor-pointer transform transition-all duration-200 active:scale-[0.94] shrink-0 ${
              copiedStatus === 'all-link'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-[#f2f4f6] hover:bg-[#e5e8eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-secondary'
            }`}
            title="아파트 분석 리포트 공유하기"
          >
            {copiedStatus === 'all-link' ? (
              <Check size={14} strokeWidth={2.5} className="text-white" />
            ) : (
              <Share size={14} strokeWidth={2.5} className="text-secondary/80" />
            )}
            <span>{copiedStatus === 'all-link' ? '링크 복사 완료!' : '공유하기'}</span>
          </button>

          {/* Group Chat Summary Copy Button */}
          <button
            onClick={handleCopySummary}
            className={`h-10 px-4 rounded-[12px] shadow-sm hidden lg:flex items-center gap-1.5 font-extrabold text-[13px] border cursor-pointer transform transition-all duration-200 active:scale-[0.94] shrink-0 ${
              copiedStatus === 'summary'
                ? 'bg-emerald-500 text-white border-transparent shadow-md'
                : 'bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/10 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/10'
            }`}
            title="단톡방용 텍스트 요약 복사"
          >
            {copiedStatus === 'summary' ? (
              <Check size={14} strokeWidth={2.5} className="text-white" />
            ) : (
              <MessageSquare size={14} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{copiedStatus === 'summary' ? '요약 복사 완료!' : '단톡방 요약 복사'}</span>
          </button>

          {/* Infographic Summary Image Download Button */}
          <button
            onClick={handleDownloadShareCard}
            className="h-10 px-4 bg-[#f2f4f6] hover:bg-[#e5e8eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-secondary border-none rounded-[12px] shadow-sm hidden lg:flex items-center gap-1.5 font-extrabold text-[13px] cursor-pointer transform transition-all duration-200 active:scale-[0.94] shrink-0"
            title="인포그래픽 요약 카드 이미지 다운로드"
          >
            <Camera size={14} strokeWidth={2.5} className="text-secondary/80" />
            <span>이미지 저장</span>
          </button>

          {/* Push Notifications Button */}
          <button
            onClick={() => setIsPushModalOpen(true)}
            className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-800 dark:hover:bg-emerald-900 text-white rounded-[12px] shadow-sm flex items-center gap-1.5 font-extrabold text-[13px] border-none cursor-pointer transform transition-all duration-200 active:scale-[0.94] shrink-0"
            title="실거래 변동 Web Push 알림 받기"
          >
            <Bell size={14} strokeWidth={2.5} className="animate-pulse" />
            <span className="text-white">실거래 알림 받기</span>
          </button>

          {/* Financial & Analysis Toolkit Dropdown */}
          <div className="relative shrink-0" ref={toolDropdownRef}>
            <button
              onClick={() => setIsToolDropdownOpen(prev => !prev)}
              className={`h-10 px-4 bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white rounded-[12px] shadow-md flex items-center gap-1.5 font-extrabold text-[13px] border-none cursor-pointer transform transition-all duration-200 active:scale-[0.94]`}
              title="AI 분석 리포트 및 부동산 금융 계산기 열기"
            >
              <Calculator size={14} />
              <span>분석 및 금융 도구</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isToolDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-[240px] bg-surface/85 dark:bg-zinc-900/85 backdrop-blur-md border border-border/40 dark:border-white/10 rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] py-2 z-[100] animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="px-4 py-1.5 text-[11px] font-black text-tertiary border-b border-border/40 select-none uppercase tracking-wider">
                  AI 진단 & 금융 계산기
                </div>
                
                {onOpenCompare && (
                  <button
                    onClick={() => { onOpenCompare(report.apartmentName); setIsToolDropdownOpen(false); }}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <Radar size={15} className="text-[#c44d00]" />
                    <div className="flex flex-col">
                      <span>단지 1:1 비교</span>
                    </div>
                  </button>
                )}

                {onOpenJeonseSafety && (
                  <button
                    onClick={() => { onOpenJeonseSafety(report.apartmentName); setIsToolDropdownOpen(false); }}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <Shield size={15} className="text-[#ff8f00]" />
                    <div className="flex flex-col">
                      <span>전세 안전진단</span>
                    </div>
                  </button>
                )}

                {onOpenMortgage && (
                  <button
                    onClick={() => { onOpenMortgage(report.apartmentName); setIsToolDropdownOpen(false); }}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <Calculator size={15} className="text-[#c44d00]" />
                    <div className="flex flex-col">
                      <span>대출 계산기</span>
                    </div>
                  </button>
                )}

                {onOpenTaxCalculator && (
                  <button
                    onClick={() => { onOpenTaxCalculator(report.apartmentName); setIsToolDropdownOpen(false); }}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <GraduationCap size={15} className="text-[#ff8f00]" />
                    <div className="flex flex-col">
                      <span>취득세 계산기</span>
                    </div>
                  </button>
                )}

                {onOpenSellTimingCalculator && (
                  <button
                    onClick={() => { onOpenSellTimingCalculator(report.apartmentName); setIsToolDropdownOpen(false); }}
                    onMouseEnter={preloadCalculators}
                    onFocus={preloadCalculators}
                    className="w-full text-left px-4 py-3 text-[13.5px] font-bold text-secondary hover:bg-body hover:text-primary transition-colors flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <ShieldAlert size={15} className="text-[#f04452]" />
                    <div className="flex flex-col">
                      <span>AI 매도 진단기</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
