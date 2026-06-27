'use client';

// Security Audit: Verified that no target="_blank" links exist in this welcome modal component to prevent Tabnabbing (rel="noopener noreferrer" guard).
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Compass, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { logger } from '@/lib/services/logger';

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `; expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value || ''}${expires}; path=/; SameSite=Lax; Secure`;
}

const WelcomeModal = React.memo(function WelcomeModal() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const welcomeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      try {
        const seenLocal = localStorage.getItem('dview-welcome-seen');
        const seenCookie = getCookie('dview-welcome-seen');
        
        if (seenLocal !== 'true' && seenCookie !== 'true') {
          // Trigger the modal after 1.5 seconds to ensure smooth hydration and layout loading
          welcomeTimeoutRef.current = setTimeout(() => {
            setIsOpen(true);
            welcomeTimeoutRef.current = null;
          }, 1500);
        }
      } catch (e) {
        logger.warn('WelcomeModal.useEffect', 'localStorage is unavailable, checking cookie fallback', undefined, e);
        const seenCookie = getCookie('dview-welcome-seen');
        if (seenCookie !== 'true') {
          welcomeTimeoutRef.current = setTimeout(() => {
            setIsOpen(true);
            welcomeTimeoutRef.current = null;
          }, 1500);
        }
      }
    }
    return () => {
      setMounted(false);
      if (welcomeTimeoutRef.current) {
        clearTimeout(welcomeTimeoutRef.current);
        welcomeTimeoutRef.current = null;
      }
    };
  }, []);

  const closeModal = (): void => {
    if (welcomeTimeoutRef.current) {
      clearTimeout(welcomeTimeoutRef.current);
      welcomeTimeoutRef.current = null;
    }
    try {
      localStorage.setItem('dview-welcome-seen', 'true');
    } catch (err) {
      logger.warn('WelcomeModal.closeModal', 'Failed to save welcome popup state to localStorage', undefined, err);
    }
    try {
      setCookie('dview-welcome-seen', 'true', 365);
    } catch (err) {
      logger.warn('WelcomeModal.closeModal', 'Failed to save welcome popup state to cookie', undefined, err);
    }
    setIsOpen(false);
  };

  // Prevent body scroll when welcome modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, [isOpen]);

  // Focus and Escape key management
  useEffect(() => {
    if (isOpen && mounted) {
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeModal();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, mounted]);

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    closeModal();
  };

  const handleFocusTrap = (e: React.KeyboardEvent) => {
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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      aria-describedby="welcome-modal-desc"
      ref={modalRef}
      onKeyDown={handleFocusTrap}
      className="fixed inset-0 z-[20000] flex items-center justify-center p-4"
    >
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative bg-surface/90 dark:bg-surface/85 backdrop-blur-2xl border border-border/40 max-w-md w-full p-6 sm:p-8 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col items-center text-center animate-in zoom-in-95 ease-[cubic-bezier(0.34,1.56,0.64,1)] duration-300 z-10">
        
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-body/50 text-tertiary rounded-full hover:bg-[#e5e8eb] hover:text-primary transition-colors border border-border/30"
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        {/* Decorative Brand Emblem */}
        <div className="w-16 h-16 rounded-[22px] bg-[#c44d00]/10 dark:bg-[#ea6100]/10 flex items-center justify-center mb-6 shadow-inner border border-[#c44d00]/15 dark:border-[#ea6100]/15">
          <Compass size={32} className="text-[#c44d00] dark:text-[#ea6100] animate-pulse" />
        </div>

        {/* Title */}
        <h2 id="welcome-modal-title" className="text-[19px] sm:text-[21px] font-black text-primary leading-snug tracking-tight mb-3">
          데이터 기반 주거·일터 통합 포털<br />
          <span className="text-[#c44d00] dark:text-[#ea6100] font-black">D-VIEW</span>에 오신 것을 환영합니다
        </h2>

        {/* Description */}
        <p id="welcome-modal-desc" className="text-[13px] sm:text-[14px] text-secondary leading-relaxed break-keep mb-6">
          D-VIEW는 동탄역 179개 아파트 단지의 실거래 및 안심 학군 분석은 물론, 테크노밸리 지식산업센터 입주 매칭과 직주근접 세제 혜택 시뮬레이션을 원스톱으로 지원하는 데이터 플랫폼입니다.
        </p>

        {/* Feature List */}
        <ul className="w-full flex flex-col gap-3.5 text-left bg-body/40 dark:bg-body/20 rounded-2xl p-4.5 mb-7 border border-border/30">
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-md bg-[#c44d00]/10 dark:bg-[#ea6100]/10 flex items-center justify-center shrink-0 mt-0.5 border border-[#c44d00]/10 dark:border-[#ea6100]/10">
              <ShieldCheck size={12} className="text-[#c44d00] dark:text-[#ea6100]" />
            </div>
            <div>
              <h4 className="text-[12.5px] font-extrabold text-primary leading-tight">실시간 주거·오피스 실거래가 분석</h4>
              <p className="text-[11px] text-tertiary mt-0.5 leading-normal">국토교통부 아파트/오피스 실거래가 API 데이터를 통해 실거래 시세와 공실률 추이를 연동합니다.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-md bg-[#c44d00]/10 dark:bg-[#ea6100]/10 flex items-center justify-center shrink-0 mt-0.5 border border-[#c44d00]/10 dark:border-[#ea6100]/10">
              <ShieldCheck size={12} className="text-[#c44d00] dark:text-[#ea6100]" />
            </div>
            <div>
              <h4 className="text-[12.5px] font-extrabold text-primary leading-tight">KICOX 공공데이터 기반 입주 매칭</h4>
              <p className="text-[11px] text-tertiary mt-0.5 leading-normal">전국 지식산업센터 현황 및 등록공장대장 데이터를 매핑하여 단지별 스펙과 실시간 입주사 목록을 제공합니다.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-md bg-[#c44d00]/10 dark:bg-[#ea6100]/10 flex items-center justify-center shrink-0 mt-0.5 border border-[#c44d00]/10 dark:border-[#ea6100]/10">
              <ShieldCheck size={12} className="text-[#c44d00] dark:text-[#ea6100]" />
            </div>
            <div>
              <h4 className="text-[12.5px] font-extrabold text-primary leading-tight">직주근접 & 세제 감면 시뮬레이터</h4>
              <p className="text-[11px] text-tertiary mt-0.5 leading-normal">기업 이전에 따른 세금 감면액과 임직원 배후 주거지의 도보 인프라 편의성을 정량 스코어링합니다.</p>
            </div>
          </li>
        </ul>

        {/* CTA Button */}
        <button
          onClick={handleClose}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#c44d00] hover:bg-[#9e3c00] dark:bg-[#ff8f00] dark:hover:bg-[#c44d00] text-white text-[14.5px] font-extrabold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.96] shadow-md shadow-[#ea6100]/15"
        >
          <span>D-VIEW 탐색 시작하기</span>
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

WelcomeModal.displayName = 'WelcomeModal';
export default WelcomeModal;
