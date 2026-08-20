import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { User } from 'firebase/auth';

export interface MacroBriefingModalProps {
  showBriefingPopup: boolean;
  setShowBriefingPopup: (show: boolean) => void;
  mounted: boolean;
  user: User | null;
  handleLogin: () => void;
}

export const MacroBriefingModal = React.memo(function MacroBriefingModal({
  showBriefingPopup,
  setShowBriefingPopup,
  mounted,
  user,
  handleLogin,
}: MacroBriefingModalProps) {
  if (!showBriefingPopup || !mounted || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom-6 zoom-in-95 duration-300"
      >
        {/* Close Button */}
        <button
          onClick={() => setShowBriefingPopup(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-body text-tertiary hover:text-primary transition-colors cursor-pointer border-none bg-transparent outline-none"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-7 pt-9 flex flex-col items-center text-center">
          {/* Title & Badge */}
          <div className="flex items-center gap-1.5 justify-center mb-2.5">
            <span className="bg-[#ea6100]/10 text-[#ff8f00] font-black text-[9.5px] px-2 py-0.5 rounded-[6px]">
              리텐션 케어
            </span>
            <h3 className="text-[17px] font-black text-primary tracking-tight">
              내 아파트 시세 브리핑
            </h3>
          </div>

          <p className="text-[12.5px] text-secondary font-bold leading-relaxed mb-5 break-keep">
            관심 단지를 등록해 두시면, 매일 오전 국토부 실거래가 신고건을 기반으로 시세 변동과 매매/전세 갭을 자동으로 분석해 드립니다.
          </p>

          {/* Features List */}
          <div className="w-full bg-body rounded-2xl p-5 flex flex-col gap-4 text-left border border-border/40 mb-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12.5px] font-bold text-primary">실거래가 변동 실시간 수집</span>
              <span className="text-[11px] text-tertiary font-medium leading-normal">매일 아침 시세 변동 내역 자동 비교</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[12.5px] font-bold text-primary">매매/전세 갭(Gap) 정밀 분석</span>
              <span className="text-[11px] text-tertiary font-medium leading-normal">전세가율 및 단지별 최신 갭 비율 계산</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[12.5px] font-bold text-primary">나만의 대시보드 맞춤형 차트</span>
              <span className="text-[11px] text-tertiary font-medium leading-normal">불필요한 정보 없이 내 관심 단지만 요약</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => {
                setShowBriefingPopup(false);
                if (!user) {
                  handleLogin();
                } else {
                  const searchEl = document.querySelector('input[placeholder="단지명 검색..."]');
                  if (searchEl) {
                    (searchEl as HTMLElement).focus();
                    searchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }}
              className="w-full py-3 bg-[#ea6100] hover:bg-[#ea6100]/90 text-white border-none rounded-2xl text-[13.5px] font-extrabold cursor-pointer transition-colors shadow-sm text-center active:scale-[0.985] outline-none"
            >
              {user ? "지금 관심 단지 등록하기 ➔" : "3초 간편 로그인하고 시작하기 ➔"}
            </button>
            
            <div className="flex items-center justify-between w-full mt-2 px-1">
              <button
                onClick={() => {
                  localStorage.setItem("dview_briefing_popup_dismissed", Date.now().toString());
                  setShowBriefingPopup(false);
                }}
                className="text-[11px] text-tertiary hover:text-secondary font-bold bg-transparent border-none cursor-pointer transition-colors outline-none"
              >
                오늘 하루 보지 않기
              </button>
              <button
                onClick={() => {
                  setShowBriefingPopup(false);
                }}
                className="text-[11px] text-tertiary hover:text-secondary font-bold bg-transparent border-none cursor-pointer transition-colors outline-none"
              >
                다음에 할게요
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
