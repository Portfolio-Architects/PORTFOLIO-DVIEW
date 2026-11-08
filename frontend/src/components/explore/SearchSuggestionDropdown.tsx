import React, { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { DONGS } from '@/lib/dongs';
import { trackEvent, trackApartmentView, trackSearchQuery } from '@/lib/utils/analytics';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { getHighlightSegments } from '@/lib/utils/apartmentSearch';
import {
  addRecentApartment,
  getRecentApartments,
  removeRecentApartment,
  type RecentApartmentItem,
} from '@/lib/utils/recentApartments';
import { EnrichedApt } from './types';

interface SearchSuggestionDropdownProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setIsSearchFocused: (focused: boolean) => void;
  recommendedKeywords: string[];
  setCurrentCategory: (category: string) => void;
  suggestionsApts: EnrichedApt[];
  suggestionsDongs: typeof DONGS;
  suggestionsBrands: string[];
  handleSelectApt: (name: string) => void;
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
}

export function SearchSuggestionDropdown({
  searchQuery,
  setSearchQuery,
  setIsSearchFocused,
  recommendedKeywords,
  setCurrentCategory,
  suggestionsApts,
  suggestionsDongs,
  suggestionsBrands,
  handleSelectApt,
  preloadApartmentTx,
}: SearchSuggestionDropdownProps) {
  const [recentApts, setRecentApts] = useState<RecentApartmentItem[]>([]);

  useEffect(() => {
    setRecentApts(getRecentApartments());
  }, []);

  return (
    <div 
      id="search-suggestions-listbox"
      className="absolute top-full left-0 md:left-auto md:right-0 mt-2 w-full md:w-[360px] bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-2xl z-50 overflow-y-auto max-h-[480px] p-4.5 flex flex-col gap-4.5"
      role="listbox"
      aria-label="검색 추천 및 자동완성"
    >
      {!searchQuery.trim() ? (
        <>
          {/* Recent Viewed Apartments */}
          {recentApts.length > 0 && (
            <div role="group" aria-label="최근 조회한 단지">
              <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock size={12} className="text-tertiary" />
                <span>최근 조회한 단지</span>
              </h4>
              <div className="flex flex-col gap-1">
                {recentApts.slice(0, 4).map((recent) => (
                  <div
                    key={recent.name}
                    className="flex items-center justify-between px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl transition-colors group"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        addRecentApartment({ name: recent.name, dong: recent.dong });
                        trackApartmentView({
                          apartment_name: recent.name,
                          apt_name: recent.name,
                          dong: recent.dong || undefined,
                          surface: 'search_suggestion_dropdown',
                          trigger: 'recent_shortcut',
                          view_type: 'shortcut',
                        });
                        handleSelectApt(recent.name);
                        setIsSearchFocused(false);
                      }}
                      className="flex items-center justify-between flex-1 min-w-0 text-left pr-2 cursor-pointer"
                    >
                      <span className="text-primary text-[12.5px] font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {getDisplayAptName(recent.name)}
                      </span>
                      {recent.dong && (
                        <span className="text-[10.5px] font-semibold text-tertiary bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded shrink-0 ml-2">
                          {recent.dong}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`${getDisplayAptName(recent.name)} 최근 기록 삭제`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentApts(removeRecentApartment(recent.name));
                      }}
                      className="p-1 rounded-md text-tertiary hover:text-secondary hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Keywords */}
          <div role="group" aria-label="추천 검색어" className={recentApts.length > 0 ? 'border-t border-border/40 pt-3.5' : ''}>
            <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2">
              추천 검색어
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {recommendedKeywords.map((kw) => (
                <button
                  key={kw}
                  role="option"
                  aria-selected="false"
                  tabIndex={0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    trackEvent('search_tag_click', { tag: kw });
                    trackSearchQuery({
                      search_term: kw,
                      query: kw,
                      surface: 'search_suggestion_dropdown',
                      trigger: 'recommended_keyword',
                    });
                    setSearchQuery(kw);
                  }}
                  className="bg-slate-50 dark:bg-slate-900/60 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-secondary text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all active:scale-95 border border-slate-200/50 dark:border-slate-800/50 outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Dongs Shortcuts */}
          <div role="group" aria-label="법정동 바로가기" className="border-t border-border/40 pt-3.5">
            <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2">
              법정동 바로가기
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {DONGS.map((dong) => (
                <button
                  key={dong.id}
                  role="option"
                  aria-selected="false"
                  tabIndex={0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCurrentCategory(`dong-${dong.name}`);
                    setSearchQuery('');
                    setIsSearchFocused(false);
                    trackEvent('search_tag_click', { tag: `dong-${dong.name}` });
                  }}
                  className="group flex flex-col bg-slate-50/50 dark:bg-slate-900/40 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/5 hover:border-emerald-500/30 p-2.5 rounded-xl text-left transition-all active:scale-95 border border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-primary text-[12.5px] font-bold truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{dong.name}</span>
                    <span className="text-tertiary text-[9.5px] truncate max-w-[140px] mt-0.5">{dong.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Matching Apartments */}
          <div role="group" aria-label="아파트 단지 바로가기">
            <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2">
              아파트 단지 바로가기
            </h4>
            {suggestionsApts.length > 0 ? (
              <div className="flex flex-col gap-1">
                {suggestionsApts.map((item) => (
                  <button
                    key={item.apt.name}
                    role="option"
                    aria-selected="false"
                    tabIndex={0}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addRecentApartment({ name: item.apt.name, dong: item.apt.dong });
                      if (searchQuery.trim()) {
                        trackSearchQuery({
                          search_term: searchQuery.trim(),
                          query: searchQuery.trim(),
                          selected_apt: item.apt.name,
                          surface: 'search_suggestion_dropdown',
                          trigger: 'search_shortcut',
                        });
                      }
                      trackApartmentView({
                        apartment_name: item.apt.name,
                        apt_name: item.apt.name,
                        dong: item.apt.dong || undefined,
                        surface: 'search_suggestion_dropdown',
                        trigger: 'search_shortcut',
                        view_type: 'shortcut',
                      });
                      handleSelectApt(item.apt.name);
                      setIsSearchFocused(false);
                    }}
                    onMouseEnter={() => {
                      preloadApartmentTx?.(item.apt.name, item.apt.dong);
                      import('@/components/apartment/ApartmentModal').catch(() => {});
                      import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
                    }}
                    onTouchStart={() => {
                      preloadApartmentTx?.(item.apt.name, item.apt.dong);
                      import('@/components/apartment/ApartmentModal').catch(() => {});
                      import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
                    }}
                    className="flex items-center justify-between p-2.5 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/5 rounded-xl transition-all text-left group active:scale-99 border border-transparent hover:border-emerald-500/10 outline-none focus:ring-1 focus:ring-emerald-500/50"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-primary text-[13px] font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {getHighlightSegments(item.apt.name, searchQuery).map((seg, idx) =>
                          seg.highlighted ? (
                            <span key={idx} className="text-blue-600 dark:text-blue-400 font-extrabold">
                              {seg.text}
                            </span>
                          ) : (
                            <React.Fragment key={idx}>{seg.text}</React.Fragment>
                          )
                        )}
                      </span>
                      <span className="text-tertiary text-[11px] mt-0.5 tabular-nums">
                        {item.apt.dong} · {item.formattedHousehold} · {item.formattedYearBuilt}
                      </span>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      {item.totalPrice > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[13px] font-extrabold">{item.formattedPrice}</span>
                      ) : (
                        <span className="text-tertiary text-[12px]">-</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-tertiary text-[12px]">
                검색 결과와 일치하는 아파트가 없습니다.
              </div>
            )}
          </div>

          {/* Matching Dongs or Brands */}
          {(suggestionsDongs.length > 0 || suggestionsBrands.length > 0) && (
            <div className="border-t border-border/40 pt-3.5 flex flex-col gap-3">
              {suggestionsDongs.length > 0 && (
                <div role="group" aria-label="매칭 법정동 카테고리" className="flex flex-col gap-1.5">
                  {suggestionsDongs.map((dong) => (
                    <button
                      key={dong.id}
                      role="option"
                      aria-selected="false"
                      tabIndex={0}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCurrentCategory(`dong-${dong.name}`);
                        setSearchQuery('');
                        setIsSearchFocused(false);
                        trackEvent('search_tag_click', { tag: `dong-${dong.name}` });
                      }}
                      className="flex items-center justify-between p-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left transition-all active:scale-98 group outline-none focus:ring-1 focus:ring-emerald-500/50"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400 text-[13px] font-bold">
                        {dong.name} 카테고리로 바로 이동
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {suggestionsBrands.length > 0 && (
                <div role="group" aria-label="브랜드 검색 완성">
                  <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2">
                    브랜드 검색 완성
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestionsBrands.map((brand) => (
                      <button
                        key={brand}
                        role="option"
                        aria-selected="false"
                        tabIndex={0}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          trackEvent('search_tag_click', { tag: brand });
                          trackSearchQuery({
                            search_term: brand,
                            query: brand,
                            surface: 'search_suggestion_dropdown',
                            trigger: 'brand_suggestion',
                          });
                          setSearchQuery(brand);
                        }}
                        className="bg-slate-50 dark:bg-slate-900/60 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-primary text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 transition-all active:scale-95 outline-none focus:ring-1 focus:ring-emerald-500/50"
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
