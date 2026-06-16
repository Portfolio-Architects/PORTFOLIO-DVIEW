'use client';

import React, { useState } from 'react';
import { Smartphone, X, ChevronRight } from 'lucide-react';

const NotificationBanner = React.memo(function NotificationBanner() {
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  return (
    <div className="md:hidden w-full px-4 mb-6">
      {/* PWA 설치 유도 바 */}
      <button
        type="button"
        onClick={() => setShowPwaGuide(true)}
        className="w-full flex items-center justify-between bg-surface border border-border dark:bg-slate-900/60 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm hover:opacity-95 transition-all text-primary dark:text-white"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#00d29d]/10 flex items-center justify-center text-[#00d29d] shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[13px] font-black tracking-tight">D-VIEW 앱 홈 화면에 설치하기</span>
            <span className="text-[11px] text-secondary mt-0.5 font-medium truncate">앱처럼 편리하게 실거래 알림 and 대시보드를 이용해 보세요.</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-tertiary shrink-0" />
      </button>

      {/* PWA Guide Modal Overlay */}
      {showPwaGuide && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-md p-6 relative text-primary dark:bg-[#1e293b] dark:border-slate-700 dark:text-white shadow-2xl animate-in zoom-in duration-200">
            <button 
              onClick={() => setShowPwaGuide(false)}
              className="absolute top-4 right-4 text-tertiary hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-[#00d29d]" />
              <h4 className="text-[16px] font-black">홈 화면에 D-VIEW 추가하기</h4>
            </div>

            <div className="flex flex-col gap-4 text-[13px] leading-relaxed text-secondary dark:text-slate-300">
              <div className="p-3 bg-body/50 border border-border rounded-xl dark:bg-slate-900/50 dark:border-slate-800">
                <span className="font-extrabold text-toss-blue block mb-1">iOS (Safari) 환경</span>
                <p>1. Safari 브라우저 하단의 <strong>공유(보내기)</strong> 버튼을 클릭합니다.<br />2. 메뉴를 내린 뒤 <strong>'홈 화면에 추가'</strong>를 누릅니다.</p>
              </div>

              <div className="p-3 bg-body/50 border border-border rounded-xl dark:bg-slate-900/50 dark:border-slate-800">
                <span className="font-extrabold text-toss-blue block mb-1">Android (Chrome/Samsung) 환경</span>
                <p>1. Chrome 우측 상단 <strong>메뉴(점 3개)</strong>를 클릭합니다.<br />2. <strong>'홈 화면에 추가'</strong> 또는 <strong>'앱 설치'</strong>를 선택합니다.</p>
              </div>
            </div>

            <button
              onClick={() => setShowPwaGuide(false)}
              className="w-full mt-6 py-3 bg-body hover:bg-border/50 text-primary dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-extrabold text-[13px] rounded-xl transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

NotificationBanner.displayName = 'NotificationBanner';
export default NotificationBanner;
