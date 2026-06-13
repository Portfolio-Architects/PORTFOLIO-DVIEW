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
      <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-surface rounded-t-2xl shadow-xl transform transition-transform duration-300 ease-out max-w-2xl mx-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <ArrowDownToLine size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">D-VIEW 앱 설치하기</h3>
                <p className="text-sm text-tertiary mt-0.5">바탕화면에서 실거래가를 더 빠르게 확인하세요.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCustomA2HSModal(false)}
              className="p-2 text-tertiary hover:text-secondary hover:bg-body rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-body rounded-xl p-4 mb-6">
            <ul className="space-y-2 text-sm text-secondary">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#008262] dark:bg-[#00d29d] rounded-full"></span>
                브라우저 주소창 없이 전체화면으로 넓게 보기
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#008262] dark:bg-[#00d29d] rounded-full"></span>
                클릭 한 번으로 관심 아파트 실시간 접속
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#008262] dark:bg-[#00d29d] rounded-full"></span>
                네이티브 앱 수준의 빠르고 부드러운 속도
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCustomA2HSModal(false)}
              className="flex-1 py-3.5 px-4 bg-body text-secondary font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              나중에 할게요
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-3.5 px-4 bg-[#008262] dark:bg-[#00b386] text-surface font-semibold rounded-xl hover:bg-[#006950] dark:hover:bg-[#008262] active:scale-[0.98] transition-all shadow-sm"
            >
              지금 추가하기
            </button>
          </div>
        </div>
        {/* iOS safe area padding */}
        <div className="h-safe-area-inset-bottom"></div>
      </div>
    </>
  );
}
