'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, Building2, MapPin, TrendingUp, ArrowUpRight, Search } from 'lucide-react';
import { MbtiApartmentProfile, MbtiGroup } from '@/types/mbti';
import { ALL_MBTI_TYPES, MBTI_PROFILES, TEMPERAMENTS } from '@/lib/data/mbtiData';
import { TX_SUMMARY } from '@/lib/transaction-summary';
import { findTxKey } from '@/lib/utils/apartmentMapping';

export interface MBTIEncyclopediaProps {
  onSelectProfile?: (profile: MbtiApartmentProfile) => void;
  onStartQuiz?: () => void;
  className?: string;
}

type FilterTab = 'ALL' | MbtiGroup;

export function MBTIEncyclopedia({
  onSelectProfile,
  onStartQuiz,
  className = '',
}: MBTIEncyclopediaProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'ALL', label: '전체', count: 16 },
    { id: 'NT', label: '분석가형 (NT)', count: 4 },
    { id: 'NF', label: '외교관형 (NF)', count: 4 },
    { id: 'SJ', label: '관리자형 (SJ)', count: 4 },
    { id: 'SP', label: '탐험가형 (SP)', count: 4 },
  ];

  const filteredProfiles = useMemo(() => {
    return ALL_MBTI_TYPES.map((type) => MBTI_PROFILES[type]).filter((profile) => {
      const matchesTab = activeTab === 'ALL' || profile.group === activeTab;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        profile.type.toLowerCase().includes(q) ||
        profile.alias.toLowerCase().includes(q) ||
        profile.aptName.toLowerCase().includes(q) ||
        profile.dong.toLowerCase().includes(q) ||
        profile.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [activeTab, searchQuery]);

  const handleCardClick = (profile: MbtiApartmentProfile) => {
    if (onSelectProfile) {
      onSelectProfile(profile);
    } else if (typeof window !== 'undefined') {
      window.location.hash = `apt=${encodeURIComponent(profile.aptName)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <div
      data-testid="mbti-encyclopedia"
      className={`w-full max-w-6xl mx-auto flex flex-col gap-6 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>동탄 16대 랜드마크 아파트 주거 도감</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            MBTI 16-유형 맞춤 아파트 백과사전
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            동탄 신도시 16개 대표 랜드마크의 성향별 가치와 라이프스타일 큐레이션을 한눈에 둘러보세요.
          </p>
        </div>

        {onStartQuiz && (
          <button
            type="button"
            data-testid="encyclopedia-start-quiz"
            onClick={onStartQuiz}
            className="self-start md:self-auto py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>나의 주거 MBTI 테스트하기</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Temperament Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`filter-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="단지명, MBTI, 동 검색..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>
      </div>

      {/* 16-Type Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProfiles.map((profile) => {
          const temperament = TEMPERAMENTS[profile.group];
          const txKey = findTxKey(profile.aptName, TX_SUMMARY, undefined, false, profile.dong);
          const tx = txKey ? TX_SUMMARY[txKey] : null;

          return (
            <div
              key={profile.type}
              data-testid={`profile-card-${profile.type}`}
              onClick={() => handleCardClick(profile)}
              className="group relative flex flex-col justify-between rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500/60 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99]"
            >
              <div>
                {/* Header: MBTI Badge + Temperament Indicator */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: temperament.color }}
                      className="text-white text-xs font-black px-2.5 py-1 rounded-lg tracking-wider"
                    >
                      {profile.type}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {temperament.label}
                    </span>
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                </div>

                {/* Alias */}
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">
                  {profile.alias}
                </h3>

                {/* Matched Complex Name */}
                <div className="flex items-center gap-1 text-base font-black text-orange-600 dark:text-orange-400 tracking-tight mt-2 mb-1">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{profile.aptName}</span>
                </div>

                {/* Dong Location */}
                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mb-3">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>화성시 {profile.dong}</span>
                </div>

                {/* Tagline */}
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {profile.tagline}
                </p>
              </div>

              {/* Bottom: Price & Tags */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex flex-col gap-2">
                {/* Price Display */}
                {tx ? (
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">최근 실거래</span>
                    <div className="flex items-baseline gap-0.5 text-orange-600 dark:text-orange-400 font-black text-sm">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{tx.latestPriceEok}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">입지 추천</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {profile.dong} 랜드마크
                    </span>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {profile.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
