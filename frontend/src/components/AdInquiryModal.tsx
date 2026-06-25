'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Building2, User, MessageSquare } from 'lucide-react';
import { logger } from '@/lib/services/logger';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { throttle } from '@/lib/utils/firestoreThrottle';

interface AdInquiryModalProps {
  onClose: () => void;
}

const AdInquiryModal = React.memo(function AdInquiryModal({ onClose }: AdInquiryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);
  const contactInfoRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
      setMounted(false);
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, []);

  // Safe close handler to prevent data loss (DLP)
  const handleSafeClose = React.useCallback(() => {
    if (!isSuccess) {
      const companyName = companyNameRef.current?.value || '';
      const contactInfo = contactInfoRef.current?.value || '';
      const message = messageRef.current?.value || '';

      if (companyName.trim().length > 0 || contactInfo.trim().length > 0 || message.trim().length > 0) {
        if (!window.confirm('작성 중인 문의 내용이 있습니다. 정말 닫으시겠습니까?')) {
          return;
        }
      }
    }
    onClose();
  }, [isSuccess, onClose]);

  // Auto focus on mount with a slight delay for hydration safety
  useEffect(() => {
    const timer = setTimeout(() => {
      if (companyNameRef.current) {
        companyNameRef.current.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, []);

  // Escape key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSafeClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [handleSafeClose]);

  // Focus Trap Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyName = companyNameRef.current?.value || '';
    const contactInfo = contactInfoRef.current?.value || '';
    const message = messageRef.current?.value || '';

    if (!companyName.trim() || !contactInfo.trim() || !message.trim()) return;
    
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setIsSubmitting(true);
    try {
      await throttle(() => addDoc(collection(db, 'adInquiries'), {
        companyName: companyName.trim(),
        contactInfo: contactInfo.trim(),
        message: message.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      }));
      if (!mountedRef.current) return;
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
      setIsSuccess(true);
      successTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          onClose();
          successTimeoutRef.current = null;
        }
      }, 2000);
    } catch (error) {
      logger.error('AdInquiryModal', 'Error submitting inquiry', undefined, error);
      alert('접수 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200" 
      onClick={handleSafeClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-inquiry-title"
        aria-describedby="ad-inquiry-desc"
        onKeyDown={handleKeyDown}
        className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-border/20 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-body">
          <div className="flex items-center gap-2">
            <Building2 className="text-[#0d9488] dark:text-[#00d29d]" size={20} />
            <h2 id="ad-inquiry-title" className="text-[18px] font-extrabold text-primary tracking-tight">
              광고 및 제휴 문의
            </h2>
          </div>
          <button 
            onClick={handleSafeClose} 
            className="p-1.5 hover:bg-body rounded-full transition-colors"
            aria-label="문의 창 닫기"
          >
            <X size={20} className="text-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-6 custom-scrollbar">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="w-16 h-16 bg-[#e6f4f2] dark:bg-[#0d9488]/10 text-[#0d9488] dark:text-[#00d29d] rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Send size={30} className="ml-0.5 mt-0.5" />
              </div>
              <h3 className="text-[20px] font-extrabold text-primary mb-2">접수 완료되었습니다!</h3>
              <p className="text-[14px] text-secondary leading-relaxed">
                귀중한 제안에 깊이 감사드립니다.<br />
                남겨주신 연락처로 담당자가 신속히 검토하여<br />
                빠른 시일 내에 연락드리겠습니다.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <p id="ad-inquiry-desc" className="text-[14px] text-secondary leading-relaxed mb-1">
                D-VIEW의 고효율 프롭테크 트래픽을 활용하여 귀사의 로컬 비즈니스 브랜드를 확실하게 노출해 보세요.
              </p>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                  <Building2 size={14} className="text-tertiary" />
                  회사명 / 담당자명 <span className="text-[#ff3b30]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예) 디뷰 공인중개사 / 김디뷰"
                  ref={companyNameRef}
                  className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[14px] text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                  <User size={14} className="text-tertiary" />
                  연락처 / 이메일 <span className="text-[#ff3b30]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="회신 받으실 연락처를 남겨주세요."
                  ref={contactInfoRef}
                  className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[14px] text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-tertiary" />
                  제안 내용 <span className="text-[#ff3b30]">*</span>
                </label>
                <textarea
                  required
                  placeholder="간단한 제안 내용이나 목적을 적어주세요."
                  ref={messageRef}
                  rows={4}
                  className="w-full px-4 py-3 bg-body border border-border rounded-xl text-[14px] text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#0d9488] hover:bg-[#0f766e] disabled:bg-secondary/20 disabled:text-tertiary text-white text-[15px] font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      제안 접수하기
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

AdInquiryModal.displayName = 'AdInquiryModal';
export default AdInquiryModal;
