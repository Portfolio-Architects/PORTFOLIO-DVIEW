'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Moon, Sun, Monitor, Scaling } from 'lucide-react';
import { useSettings } from '@/lib/contexts/SettingsContext';

const SettingsModal = React.memo(function SettingsModal() {
  const [mounted, setMounted] = useState(false);
  const { isSettingsModalOpen, setIsSettingsModalOpen, areaUnit, setAreaUnit, theme, setTheme } = useSettings();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (mountedRef.current) {
      setMounted(true);
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Prevent background scroll when settings modal is open
  useEffect(() => {
    if (!isSettingsModalOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, [isSettingsModalOpen]);

  if (!mounted || !isSettingsModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsSettingsModalOpen(false)}
      />
      <div className="relative w-full sm:max-w-md bg-surface sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300">
        <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-body/50">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            소비자 설정
          </h2>
          <button 
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-2 -mr-2 text-tertiary hover:text-primary transition-colors rounded-full hover:bg-black/5 dark:bg-surface/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          
          {/* Theme Settings */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
              <Sun size={16} />
              화면 모드
            </h3>
            <div className="grid grid-cols-3 gap-2 bg-body p-1 rounded-xl">
              {[
                { id: 'light' as const, label: '라이트', icon: Sun },
                { id: 'dark' as const, label: '다크', icon: Moon },
                { id: 'system' as const, label: '시스템', icon: Monitor },
              ].map(opt => {
                const isActive = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
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
            <div className="grid grid-cols-2 gap-2 bg-body p-1 rounded-xl">
              {[
                { id: 'm2', label: '제곱미터 (m²)' },
                { id: 'pyeong', label: '평' },
              ].map(opt => {
                const isActive = areaUnit === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAreaUnit(opt.id as 'm2' | 'pyeong')}
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
