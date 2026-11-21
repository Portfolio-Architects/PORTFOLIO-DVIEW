'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePWA } from './PWAProvider';
import { acquireBodyScrollLock } from '@/lib/utils/bodyScrollLock';
import { X, ArrowDownToLine, Share, PlusSquare } from 'lucide-react';

const CustomA2HSModal = React.memo(function CustomA2HSModal() {
  const { showCustomA2HSModal, setShowCustomA2HSModal, triggerA2HSPrompt, isIOS } = usePWA();
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setMounted(false);
    };
  }, []);

  // Prevent body scroll when A2HS modal is open (reference-counted across portal modals)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!showCustomA2HSModal) return;
    return acquireBodyScrollLock();
  }, [showCustomA2HSModal]);

  // Focus and Escape key management
  useEffect(() => {
    if (showCustomA2HSModal && mounted) {
      const timer = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowCustomA2HSModal(false);
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showCustomA2HSModal, mounted]);

  if (!showCustomA2HSModal || !mounted) return null;

  const handleInstall = async () => {
    const installed = await triggerA2HSPrompt();
    if (installed && mountedRef.current) {
      setShowCustomA2HSModal(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  return createPortal(
    <>
      {/* Backdrop (Elevated above MobileDock z-[10000]) */}
      <button 
        type="button"
        data-scroll-interactive="true"
        className="fixed inset-0 bg-black/40 z-[10020] backdrop-blur-sm transition-opacity border-none cursor-default"
        onClick={() => setShowCustomA2HSModal(false)}
        aria-label="앱 설치 유도 창 닫기"
      />
      
      {/* Bottom Sheet Modal */}
      <div 
        ref={modalRef}
        data-scroll-interactive="true"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2hs-title"
        aria-describedby="a2hs-desc"
        className="fixed bottom-0 left-0 right-0 z-[10021] bg-surface rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.08)] transform transition-transform duration-300 ease-out max-w-2xl mx-auto border-t border-border/40 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] animate-in slide-in-from-bottom duration-300"
      >
        <div className="w-full pt-3 pb-1 flex justify-center" aria-hidden="true">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        <div className="px-5 sm:px-6 pt-3 pb-2">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#eff1f5] dark:bg-[#1e2532] rounded-[18px] flex items-center justify-center text-primary">
                <ArrowDownToLine size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h3 id="a2hs-title" className="text-[17px] font-black text-primary">D-VIEW 앱 설치하기</h3>
                <p id="a2hs-desc" className="text-[13px] text-tertiary mt-0.5">바탕화면에서 실거래가를 더 빠르게 확인하세요.</p>
              </div>
            </div>
            <button 
              ref={closeButtonRef}
              onClick={() => setShowCustomA2HSModal(false)}
              className="p-2 text-tertiary hover:text-secondary hover:bg-body rounded-full transition-colors"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          {isIOS ? (
            <div className="bg-[#f7f8fa] dark:bg-[#151a23] rounded-2xl p-5 border border-border/80 text-left mb-6">
              <div className="flex items-center gap-2 mb-3 bg-[#eff1f5] dark:bg-[#1e2532] px-3 py-2 rounded-xl text-[12.5px] font-black text-primary border border-border/60">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-red"></span>
                </span>
                홈 화면에 추가하여 편리하게 리포트 조회!
              </div>
              <p className="text-[13.5px] font-black text-primary mb-3">
                Safari 브라우저에서 홈화면 추가하기
              </p>
              <div className="space-y-3.5 text-[13px] text-secondary font-bold">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface border border-border text-primary shrink-0 shadow-sm"><Share size={14} /></span>
                  <p className="leading-normal pt-0.5">
                    1. Safari 브라우저 하단 도구 막대에서 <strong>[공유]</strong> 버튼을 누릅니다.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface border border-border text-primary shrink-0 shadow-sm"><PlusSquare size={14} /></span>
                  <p className="leading-normal pt-0.5">
                    2. 공유 메뉴를 아래로 스크롤하여 <strong>[홈 화면에 추가]</strong>를 누릅니다.
                  </p>
                </div>
                <p className="text-[11.5px] text-tertiary font-bold pl-10 leading-relaxed">
                  ※ 카카오톡 등 인앱 브라우저에서는 우측 하단 <strong>Safari 브라우저 열기</strong> 버튼을 먼저 클릭한 뒤 위 과정을 진행해 주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#f7f8fa] dark:bg-[#151a23] rounded-2xl p-4.5 mb-6 border border-border/80">
              {/* 리워드 그로스 배지 */}
              <div className="flex items-center gap-2 mb-3 bg-[#eff1f5] dark:bg-[#1e2532] px-3 py-2 rounded-xl text-[12.5px] font-black text-primary border border-border/60">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-red"></span>
                </span>
                앱으로 간편하게 관심 단지 실거래가 분석!
              </div>
              <ul className="space-y-2.5 text-[13px] text-secondary font-bold">
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  브라우저 주소창 없이 전체화면으로 넓게 보기
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  클릭 한 번으로 관심 아파트 실시간 접속
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  네이티브 앱 수준의 빠르고 부드러운 속도
                </li>
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowCustomA2HSModal(false)}
              className="flex-1 py-3.5 px-4 bg-[#f7f8fa] dark:bg-[#151a23] text-secondary font-bold rounded-2xl hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] transition-colors text-[13.5px]"
            >
              {isIOS ? '닫기' : '나중에 할게요'}
            </button>
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="flex-1 py-3.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all text-[13.5px]"
              >
                지금 추가하기
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.getElementById('modal-root') || document.body
  );
});

CustomA2HSModal.displayName = 'CustomA2HSModal';
export default CustomA2HSModal;
