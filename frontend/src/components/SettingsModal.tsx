'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Moon, Sun, Monitor, Scaling, Bell, BellOff, Loader2 } from 'lucide-react';
import { useSettings } from '@/lib/contexts/SettingsContext';
import { usePWA } from './pwa/PWAProvider';

const SettingsModal = React.memo(function SettingsModal() {
  const [mounted, setMounted] = useState(false);
  const { isSettingsModalOpen, setIsSettingsModalOpen, areaUnit, setAreaUnit, theme, setTheme } = useSettings();
  const { pushSubscription, unsubscribeFromPush, isPushSupported } = usePWA();
  
  const [subscribedApts, setSubscribedApts] = useState<string[]>([]);
  const [isLoadingApts, setIsLoadingApts] = useState(false);
  const mountedRef = useRef(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    if (mountedRef.current) {
      setMounted(true);
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch subscribed apartments when modal opens
  useEffect(() => {
    if (!isSettingsModalOpen || !pushSubscription) {
      setSubscribedApts([]);
      return;
    }

    let isMounted = true;
    const fetchSubscribedApts = async () => {
      setIsLoadingApts(true);
      try {
        const res = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(pushSubscription.endpoint)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setSubscribedApts(data.apts || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subscribed apartments', err);
      } finally {
        if (isMounted) {
          setIsLoadingApts(false);
        }
      }
    };

    fetchSubscribedApts();
    return () => {
      isMounted = false;
    };
  }, [isSettingsModalOpen, pushSubscription]);

  const handleUnsubscribeApt = async (aptName: string) => {
    const success = await unsubscribeFromPush(aptName);
    if (success) {
      setSubscribedApts(prev => prev.filter(name => name !== aptName));
    }
  };

  const handleUnsubscribeAll = async () => {
    if (confirm('모든 아파트의 실거래가 알림을 완전히 해제하시겠습니까?')) {
      const success = await unsubscribeFromPush(null);
      if (success) {
        setSubscribedApts([]);
      }
    }
  };

  // Prevent background scroll when settings modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!isSettingsModalOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, [isSettingsModalOpen]);

  // Focus and Escape key management
  useEffect(() => {
    if (isSettingsModalOpen) {
      // Auto focus first option when modal opens
      const timer = setTimeout(() => {
        if (firstOptionRef.current) {
          firstOptionRef.current.focus();
        }
      }, 50);

      // Escape key handling
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsSettingsModalOpen(false);
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isSettingsModalOpen, setIsSettingsModalOpen]);

  // Focus Trap Handler
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

  if (!mounted || !isSettingsModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <button 
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm border-none cursor-default"
        onClick={() => setIsSettingsModalOpen(false)}
        aria-label="설정 창 닫기"
      />
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        aria-describedby="settings-desc"
        onKeyDown={handleKeyDown}
        className="relative w-full sm:max-w-md bg-surface sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-body/50">
          <h2 id="settings-title" className="text-lg font-bold text-primary flex items-center gap-2">
            소비자 설정
          </h2>
          <button 
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-2 -mr-2 text-tertiary hover:text-primary transition-colors rounded-full hover:bg-black/5 dark:bg-surface/5"
            aria-label="설정 창 닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div id="settings-desc" className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          
          {/* Theme Settings */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
              <Sun size={16} />
              화면 모드
            </h3>
            <div role="group" aria-label="화면 모드 선택" className="grid grid-cols-3 gap-2 bg-body p-1 rounded-xl">
              {[
                { id: 'light' as const, label: '라이트', icon: Sun },
                { id: 'dark' as const, label: '다크', icon: Moon },
                { id: 'system' as const, label: '시스템', icon: Monitor },
              ].map(opt => {
                const isActive = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    ref={opt.id === 'light' ? firstOptionRef : undefined}
                    onClick={() => setTheme(opt.id)}
                    aria-pressed={isActive}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-surface text-toss-blue shadow-sm font-bold' 
                        : 'text-tertiary hover:text-secondary font-medium'
                    }`}
                  >
                    <opt.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Area Unit Settings */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
              <Scaling size={16} />
              면적 표시 기준
            </h3>
            <div role="group" aria-label="면적 표시 기준 선택" className="grid grid-cols-2 gap-2 bg-body p-1 rounded-xl">
              {[
                { id: 'm2', label: '제곱미터 (m²)' },
                { id: 'pyeong', label: '평' },
              ].map(opt => {
                const isActive = areaUnit === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAreaUnit(opt.id as 'm2' | 'pyeong')}
                    aria-pressed={isActive}
                    className={`py-3 rounded-lg transition-all duration-200 text-sm ${
                      isActive 
                        ? 'bg-surface text-toss-blue shadow-sm font-bold' 
                        : 'text-tertiary hover:text-secondary font-medium'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Web Push Subscription Management */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
              <Bell size={16} />
              실거래 알림 구독 관리
            </h3>
            
            {!isPushSupported ? (
              <div className="text-xs text-tertiary bg-body p-4 rounded-xl text-center font-medium">
                이 브라우저는 알림을 지원하지 않습니다.
              </div>
            ) : !pushSubscription ? (
              <div className="text-xs text-tertiary bg-body p-4 rounded-xl text-center font-medium">
                현재 구독 중인 실거래 알림이 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-2 bg-body p-3 rounded-xl">
                {isLoadingApts ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-xs text-tertiary font-medium">
                    <Loader2 size={14} className="animate-spin text-toss-blue" />
                    구독 목록 불러오는 중...
                  </div>
                ) : subscribedApts.length === 0 ? (
                  <div className="text-xs text-tertiary py-3 text-center font-medium">
                    알림을 구독한 단지가 없습니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1.5 custom-scrollbar pr-1">
                      {subscribedApts.map(apt => (
                        <div key={apt} className="flex items-center justify-between bg-surface px-3 py-2 rounded-lg border border-border/40">
                          <span className="text-[12.5px] font-bold text-secondary truncate max-w-[200px]">
                            {apt}
                          </span>
                          <button
                            onClick={() => handleUnsubscribeApt(apt)}
                            className="text-xs font-black text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                          >
                            해제
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-border/40 pt-2.5 mt-1 flex justify-end">
                      <button
                        onClick={handleUnsubscribeAll}
                        className="text-xs font-extrabold text-tertiary hover:text-primary flex items-center gap-1 cursor-pointer bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <BellOff size={12} />
                        전체 수신 거부
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

        </div>
        
        <div className="p-4 border-t border-border bg-body/30">
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="w-full btn-primary py-3.5 rounded-xl text-base"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
});

SettingsModal.displayName = 'SettingsModal';
export default SettingsModal;
