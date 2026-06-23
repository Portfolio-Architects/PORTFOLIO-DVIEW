'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Phone, ExternalLink, GraduationCap } from 'lucide-react';
import { logger } from '@/lib/services/logger';

interface AdItem {
  id: string;
  title: string;
  description: string;
  targetDongs: string[];
  minEducationGrade: string;
  ctaUrl: string;
  badge: string;
  phone: string;
}

interface LocalEducationAdProps {
  dong?: string;
  educationGrade: string;
  apartmentName: string;
}

const gradeOrder = ['C', 'B', 'A', 'S'];

const isGradeEligible = (aptGrade: string, adMinGrade: string) => {
  const aptIndex = gradeOrder.indexOf(aptGrade);
  const adIndex = gradeOrder.indexOf(adMinGrade);
  return aptIndex >= adIndex;
};

const LocalEducationAd = React.memo(function LocalEducationAd({ dong = '', educationGrade, apartmentName }: LocalEducationAdProps) {
  const [matchedAd, setMatchedAd] = useState<AdItem | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = React.useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    async function loadAds() {
      try {
        // Memory leak prevention: only perform state updates if component remains mounted
        const res = await fetch('/data/local-ads.json', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load ad pool');
        const data = await res.json();
        const adsList: AdItem[] = data.ads || [];

        if (!mountedRef.current) return;

        // 1. Filter by Dong
        let filtered = adsList.filter(ad => 
          ad.targetDongs.includes(dong) || ad.targetDongs.includes('*')
        );

        // 2. Filter by Education Grade Eligibility
        filtered = filtered.filter(ad => 
          isGradeEligible(educationGrade, ad.minEducationGrade)
        );

        if (filtered.length > 0) {
          // Prefer specific dong matches over wildcard '*'
          const specificMatch = filtered.find(ad => ad.targetDongs.includes(dong));
          setMatchedAd(specificMatch || filtered[0]);
        } else {
          // Fallback to default ad
          const defaultAd = adsList.find(ad => ad.id === 'edu-ad-default');
          setMatchedAd(defaultAd || null);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        logger.error('LocalEducationAd', 'Failed to load ads', undefined, err);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    loadAds();
    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [dong, educationGrade]);

  const handleAdClick = async () => {
    if (!matchedAd) return;
    try {
      await fetch('/api/ads/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: matchedAd.id,
          apartmentName,
          dong,
          clickedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      logger.error('LocalEducationAd', 'Failed to log ad click', undefined, err);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[190px] sm:h-[140px] bg-body/50 border border-border rounded-2xl animate-pulse flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <GraduationCap size={24} className="text-emerald-500/40 animate-bounce" />
          <span className="text-[12px] text-tertiary font-medium">맞춤 교육 파트너 추천 로드 중...</span>
        </div>
      </div>
    );
  }

  if (!matchedAd) return null;

  return (
    <div className="w-full border border-emerald-500/20 bg-gradient-to-r from-emerald-950/5 to-slate-900/5 dark:from-emerald-950/20 dark:to-slate-950/25 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/35 transition-all duration-300 relative group overflow-hidden">
      {/* Sparkle background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black tracking-widest uppercase select-none">
              SPONSORED
            </span>
            <span className="text-[11px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 select-none">
              <Sparkles size={10} />
              {matchedAd.badge}
            </span>
            {dong && (
              <span className="text-[11px] bg-slate-500/10 text-secondary border border-border px-2 py-0.5 rounded-full font-bold">
                {dong} 학군 밀착형
              </span>
            )}
          </div>

          <h3 className="text-[15px] font-extrabold text-primary flex items-center gap-1.5 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
            {matchedAd.title}
          </h3>
          <p className="text-[13px] text-secondary leading-relaxed mt-1.5 font-medium break-keep">
            {matchedAd.description}
          </p>
          
          <div className="flex items-center gap-3 mt-3 text-[12px] text-tertiary font-bold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Phone size={12} strokeWidth={2.5} />
              {matchedAd.phone}
            </span>
            <span className="inline-block w-1 h-1 rounded-full bg-border" />
            <span>학군 매칭 등급: {educationGrade} Grade</span>
          </div>
        </div>

        <a 
          href={matchedAd.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAdClick}
          className="w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-[13px] px-4.5 py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-900/10 hover:shadow-md hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 group-hover:translate-x-0.5 duration-200"
        >
          <span>자세히 보기</span>
          <ExternalLink size={13} strokeWidth={2.5} />
        </a>
      </div>
    </div>
  );
});

LocalEducationAd.displayName = 'LocalEducationAd';
export default LocalEducationAd;
