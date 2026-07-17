'use client';

import { useRouter } from 'next/navigation';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePreventElasticBounce } from '@/hooks/usePreventElasticBounce';

const LoungeModalBackdrop = React.memo(function LoungeModalBackdrop({ children, onClose }: { children: ReactNode, onClose?: () => void }) {
  const router = useRouter();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  usePreventElasticBounce(backdropRef);

  const onCloseRef = useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleClose = () => {
    if (onCloseRef.current) {
      onCloseRef.current();
    } else {
      router.back();
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Focus Trap Handler
  const handleFocusTrap = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && backdropRef.current) {
      const focusableElements = backdropRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  // Auto focus to close button or first focusable element inside on mount
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      if (backdropRef.current) {
        const focusableElements = backdropRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (focusableElements && focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div 
      ref={backdropRef}
      onKeyDown={handleFocusTrap}
      className="fixed inset-0 z-50 flex justify-center bg-black/40 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto w-full pt-6 pb-6 px-2 sm:pt-16 sm:pb-16 sm:px-4"
    >
      <button 
        type="button"
        className="absolute inset-0 bg-transparent cursor-default focus:outline-none border-none outline-none"
        onClick={handleClose}
        aria-label="모달 닫기"
      />
      <article 
        role="dialog"
        aria-modal="true"
        aria-labelledby="lounge-modal-title"
        aria-describedby="lounge-modal-desc"
        className="w-full max-w-[1040px] h-fit bg-surface/75 dark:bg-zinc-900/75 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 ease-out relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen Reader Only Title and Description */}
        <h1 id="lounge-modal-title" className="sr-only">라운지 게시글 상세 보기</h1>
        <p id="lounge-modal-desc" className="sr-only">게시글 본문과 댓글을 확인하고 의견을 공유하는 모달 창입니다.</p>
        
        {children}
      </article>
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

LoungeModalBackdrop.displayName = 'LoungeModalBackdrop';
export default LoungeModalBackdrop;
