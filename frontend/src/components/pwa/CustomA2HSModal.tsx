'use client';

import React from 'react';
import { usePWA } from './PWAProvider';
import { X, ArrowDownToLine } from 'lucide-react';

export default function CustomA2HSModal() {
  const { showCustomA2HSModal, setShowCustomA2HSModal, triggerA2HSPrompt } = usePWA();

  if (!showCustomA2HSModal) return null;

  const handleInstall = async () => {
    const installed = await triggerA2HSPrompt();
    if (installed) {
      setShowCustomA2HSModal(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[9999] backdrop-blur-sm transition-opacity"
        onClick={() => setShowCustomA2HSModal(false)}
      />
      
      {/* Bottom Sheet Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-surface rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.08)] transform transition-transform duration-300 ease-out max-w-2xl mx-auto border-t border-border/40 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="px-6 pt-6 pb-2">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-[#003829]/50 rounded-[18px] flex items-center justify-center text-emerald-600 dark:text-[#00d29d]">
                <ArrowDownToLine size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[17px] font-black text-primary">D-VIEW 앱 설치하기</h3>
                <p className="text-[13px] text-tertiary mt-0.5">바탕화면에서 실거래가를 더 빠르게 확인하세요.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCustomA2HSModal(false)}
              className="p-2 text-tertiary hover:text-secondary hover:bg-body rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-body rounded-2xl p-4.5 mb-6 border border-border/40">
            {/* 리워드 그로스 배지 */}
            <div className="flex items-center gap-2 mb-3 bg-[#e0fbf4] dark:bg-[#003829]/60 px-3 py-2 rounded-xl text-[12.5px] font-black text-[#008262] dark:text-[#00d29d] border border-[#00d29d]/15">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              설치 즉시 리포트 무료 조회권 3회 100% 선물! 🎁
            </div>
            <ul className="space-y-2.5 text-[13px] text-secondary font-bold">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 bg-[#008262] dark:bg-[#00d29d] rounded-full"></span>
                브라우저 주소창 없이 전체화면으로 넓게 보기
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 bg-[#008262] dark:bg-[#00d29d] rounded-full"></span>
                클릭 한 번으로 관심 아파트 실시간 접속
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 bg-[#008262] dark:bg-[#00d29d] rounded-full"></span>
                네이티브 앱 수준의 빠르고 부드러운 속도
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCustomA2HSModal(false)}
              className="flex-1 py-3.5 px-4 bg-body text-secondary font-bold rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-[13.5px]"
            >
              나중에 할게요
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-3.5 px-4 bg-[#008262] dark:bg-[#00b386] text-surface font-bold rounded-2xl hover:bg-[#006950] dark:hover:bg-[#008262] active:scale-[0.98] transition-all shadow-md text-[13.5px]"
            >
              지금 추가하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
