'use client';

import React, { useState } from 'react';
import { Bell, Smartphone, Check, X, ChevronRight } from 'lucide-react';

export default function NotificationBanner() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [types, setTypes] = useState({
    realtime: true,
    weekly: false,
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    setSubscribed(true);
  };

  return (
    <div className="w-full bg-surface border border-border dark:bg-slate-900/60 dark:border-slate-800/80 text-primary rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden transition-all duration-300">
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-toss-blue/5 dark:bg-toss-blue/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#00d29d]/5 dark:bg-[#00d29d]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-between relative z-10">
        
        {/* Left Section: Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div>

            <h3 className="text-[18px] md:text-[20px] font-black leading-tight tracking-tight text-primary dark:text-white">
              실시간 거래가 & 주간 리포트 알림 받기
            </h3>
            <p className="text-[12px] md:text-[13px] text-secondary dark:text-slate-300 mt-2 font-medium break-keep leading-relaxed">
              관심 단지의 신규 실거래가 등록 소식과 동탄 부동산 시장 트렌드 리포트를 놓치지 말고 받아보세요.
            </p>
          </div>

          {/* Interactive Checkboxes */}
          <div className="flex flex-wrap gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={types.realtime}
                onChange={() => setTypes({ ...types, realtime: !types.realtime })}
                className="w-4.5 h-4.5 rounded border-border bg-body text-toss-blue focus:ring-toss-blue focus:ring-offset-background dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-[12px] font-semibold text-secondary dark:text-slate-200">실시간 실거래 알림</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={types.weekly}
                onChange={() => setTypes({ ...types, weekly: !types.weekly })}
                className="w-4.5 h-4.5 rounded border-border bg-body text-toss-blue focus:ring-toss-blue focus:ring-offset-background dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-[12px] font-semibold text-secondary dark:text-slate-200">주간 종합 리포트</span>
            </label>
          </div>
        </div>

        {/* Right Section: Form or Success */}
        <div className="flex-1 flex flex-col justify-center min-w-0 sm:min-w-[280px] lg:max-w-[360px] bg-body/30 dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl p-4 md:p-5">
          {subscribed ? (
            <div className="flex flex-col items-center justify-center text-center py-4">
              <div className="w-10 h-10 rounded-full bg-[#00d29d]/20 flex items-center justify-center text-[#00d29d] mb-3 animate-bounce">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-[14px] font-bold text-primary dark:text-white">알림 신청이 완료되었습니다!</p>
              <p className="text-[11px] text-secondary dark:text-slate-400 mt-1">
                입력하신 이메일({email})로 신규 소식을 발송해 드릴 예정입니다.
              </p>
              <button 
                onClick={() => { setSubscribed(false); setEmail(''); }}
                className="mt-4 text-[11px] font-bold text-tertiary hover:text-primary dark:text-slate-400 dark:hover:text-white underline transition-colors"
              >
                다른 정보로 재신청
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <span className="text-[11px] font-bold text-tertiary dark:text-slate-400">알림 이메일 등록</span>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 min-w-0 bg-surface border border-border dark:bg-slate-950/60 dark:border-slate-700 rounded-xl px-3 py-2 text-[13px] placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-toss-blue text-primary dark:text-white"
                />
                <button
                  type="submit"
                  className="bg-toss-blue hover:opacity-90 text-white font-extrabold text-[12px] rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all shrink-0 shadow-lg shadow-toss-blue/10 dark:shadow-toss-blue/20"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>구독</span>
                </button>
              </div>
              
              <div className="w-full h-[1px] bg-border dark:bg-slate-800 my-1" />

              {/* PWA Button */}
              <button
                type="button"
                onClick={() => setShowPwaGuide(true)}
                className="w-full flex items-center justify-between text-left text-secondary hover:text-primary dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#00d29d]" />
                  <span className="text-[12px] font-bold">D-VIEW 앱 홈 화면에 설치하기</span>
                </div>
                <ChevronRight className="w-4 h-4 text-tertiary" />
              </button>
            </form>
          )}
        </div>
      </div>

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
}
