'use client';

import React from 'react';
import { usePWA } from './PWAProvider';
import { X, BellRing, Sparkles, ShieldCheck } from 'lucide-react';

interface PushSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  aptName: string;
}

export default function PushSubscriptionModal({ isOpen, onClose, aptName }: PushSubscriptionModalProps) {
  const { subscribeToPush, showToast, isPushSupported } = usePWA();
  const [submitting, setSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const success = await subscribeToPush();
      if (success) {
        showToast(`🔔 ${aptName}의 실거래가 변동 알림 신청이 완료되었습니다!`);
        onClose();
      }
    } catch (err) {
      console.error('Subscription error in modal', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/45 z-[9999] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet / Popover Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-surface rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transform transition-transform duration-300 ease-out max-w-lg mx-auto border-t border-border/40 pb-[calc(env(safe-area-inset-bottom)+24px)] animate-in slide-in-from-bottom duration-300">
        <div className="px-6 pt-6 pb-2">
          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-[#003829]/50 rounded-[18px] flex items-center justify-center text-emerald-600 dark:text-[#00d29d] shrink-0">
                <BellRing size={22} strokeWidth={2.5} className="animate-bounce" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[17px] font-black text-primary truncate">{aptName} 알림 신청</h3>
                <p className="text-[12.5px] text-tertiary mt-0.5">실거래 신고 발생 시 매일 아침 즉시 배달</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-tertiary hover:text-secondary hover:bg-body rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Curation Value Props Banner */}
          <div className="bg-[#e8f8f5] dark:bg-[#002f23] rounded-2xl p-5 border border-[#00d29d]/15 text-left mb-6 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-3 bg-[#e0fbf4] dark:bg-[#003829]/60 px-3 py-2 rounded-xl text-[12px] font-extrabold text-[#008262] dark:text-[#00d29d] border border-[#00d29d]/15 w-fit">
              <Sparkles size={13} className="text-emerald-500" />
              <span>DVIEW 실시간 알림 서비스</span>
            </div>
            
            <ul className="space-y-3 text-[13px] text-secondary font-bold z-10 relative">
              <li className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-normal">국토교통부 실거래 데이터 등록 즉시 <strong>오전 KST 07:00</strong>에 브라우저 알림 배달</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-normal">주변 유사 평형 대장 단지와의 갭(Gap) 및 신고가 발생 현황 동시 제공</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-normal">스팸 없는 안심 정보 (언제든 마이페이지에서 1-Click 수신 거부 가능)</span>
              </li>
            </ul>
          </div>

          {!isPushSupported && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 mb-6 text-center">
              <p className="text-[12px] font-bold text-rose-600 dark:text-rose-400">
                ※ 현재 사용 중이신 브라우저는 Web Push 알림을 지원하지 않습니다. Chrome, Safari(iOS 16.4+), Edge 브라우저를 이용해 주세요.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 px-4 bg-body hover:bg-neutral-200 dark:hover:bg-neutral-800 text-secondary font-bold rounded-2xl transition-colors text-[13.5px] cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleSubscribe}
              disabled={!isPushSupported || submitting}
              className="flex-1 py-3.5 px-4 bg-[#008262] dark:bg-[#00b386] disabled:bg-gray-300 dark:disabled:bg-zinc-800 disabled:text-gray-500 text-surface font-black rounded-2xl hover:bg-[#006950] dark:hover:bg-[#008262] active:scale-[0.98] transition-all shadow-md text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '실거래가 알림 신청하기'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
