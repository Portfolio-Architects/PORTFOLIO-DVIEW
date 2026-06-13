'use client';

import { useTransition } from 'react';
import { Sparkles, Shield, GraduationCap, Brush, ExternalLink } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { getContextualAd } from '@/lib/utils/ContextualAdEngine';

interface ContextualB2BAdBannerProps {
  apartmentName: string;
  dong: string;
  yearBuilt: string | number | undefined;
  distanceToElementary: number | undefined;
  jeonseRate: number | undefined;
  userId?: string;
  onOpenAdModal?: () => void;
  onOpenConsumerAdModal?: (adType: 'insurance' | 'interior' | 'academy' | 'cleaning', adTitle: string) => void;
}

export default function ContextualB2BAdBanner({
  apartmentName,
  dong,
  yearBuilt,
  distanceToElementary,
  jeonseRate,
  userId,
  onOpenAdModal,
  onOpenConsumerAdModal
}: ContextualB2BAdBannerProps) {
  const [isPending, startTransition] = useTransition();

  const ad = getContextualAd(yearBuilt, distanceToElementary, jeonseRate);

  // adType에 맞는 아이콘 매핑
  const renderIcon = () => {
    switch (ad.adType) {
      case 'insurance':
        return <Shield className="text-[#0d9488] shrink-0" size={20} />;
      case 'interior':
        return <Brush className="text-amber-500 shrink-0" size={20} />;
      case 'academy':
        return <GraduationCap className="text-indigo-500 shrink-0" size={20} />;
      case 'cleaning':
      default:
        return <Sparkles className="text-emerald-500 shrink-0" size={20} />;
    }
  };

  // adType에 맞는 CSS 배경 색상 그라데이션
  const getBgStyle = () => {
    switch (ad.adType) {
      case 'insurance':
        return 'from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-100/80 dark:border-emerald-900/30';
      case 'interior':
        return 'from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-100/80 dark:border-amber-900/30';
      case 'academy':
        return 'from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border-indigo-100/80 dark:border-indigo-900/30';
      case 'cleaning':
      default:
        return 'from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/10 dark:to-emerald-900/5 border-emerald-100/60 dark:border-emerald-900/20';
    }
  };

  const handleAdClick = () => {
    // 1. 비동기 Firestore 적재 (사용자 마찰을 없애기 위해 await하지 않고 백그라운드 전송)
    if (db) {
      const clickLog = {
        apartmentName,
        dong,
        adType: ad.adType,
        adTitle: ad.title,
        userId: userId || 'anonymous',
        deviceType: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
        timestamp: serverTimestamp()
      };
      
      addDoc(collection(db, 'ad_clicks'), clickLog).catch(err => {
        console.warn('[CPA Tracker] Failed to log ad click:', err);
      });
    }

    // 2. 소비자 리드 캡쳐 모달 또는 광고주 모달 열기 핸들러 분기
    if (onOpenConsumerAdModal && (ad.adType === 'academy' || ad.adType === 'interior' || ad.adType === 'cleaning')) {
      onOpenConsumerAdModal(ad.adType as any, ad.title);
    } else if (onOpenAdModal && (ad.adType === 'cleaning' || ad.adType === 'interior')) {
      onOpenAdModal();
    } else {
      // 3. 그렇지 않은 경우 다이렉트 제휴 랜딩 새 창 이동
      window.open(ad.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      onClick={handleAdClick}
      className={`bg-gradient-to-br ${getBgStyle()} p-5 rounded-3xl border shadow-sm hover:shadow-md hover:scale-[1.005] active:scale-[0.995] transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 text-left group overflow-hidden relative`}
    >
      {/* Decorative Blur Effect */}
      <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-primary/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="bg-white/80 dark:bg-surface/60 p-2 rounded-2xl border border-border/40 shadow-sm shrink-0">
          {renderIcon()}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-black border uppercase tracking-wider ${
              ad.adType === 'insurance' ? 'text-teal-600 bg-teal-50 border-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/30' :
              ad.adType === 'interior' ? 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30' :
              ad.adType === 'academy' ? 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30' :
              'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30'
            }`}>
              {ad.badge}
            </span>
            <span className="text-[11px] font-extrabold text-tertiary">B2B 제휴 제안</span>
          </div>
          <p className="text-[14.5px] font-black text-primary leading-snug tracking-tight group-hover:text-[#0d9488] transition-colors truncate">
            {ad.title}
          </p>
          <p className="text-[12.5px] text-secondary font-medium leading-relaxed">
            {ad.desc}
          </p>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleAdClick();
        }}
        className={`px-4.5 py-3 rounded-2xl font-black text-[12.5px] transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm active:scale-95 group-hover:translate-x-0.5 duration-200 cursor-pointer ${
          ad.adType === 'insurance' ? 'bg-[#fee500] hover:bg-[#fddc00] text-[#191919]' :
          ad.adType === 'interior' ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/10' :
          ad.adType === 'academy' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10' :
          'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10'
        }`}
      >
        <span>{ad.actionText}</span>
        <ExternalLink size={12} />
      </button>
    </div>
  );
}
