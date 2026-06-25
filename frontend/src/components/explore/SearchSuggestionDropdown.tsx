import React from 'react';
import { DONGS } from '@/lib/dongs';
import { trackEvent } from '@/lib/utils/analytics';
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
  return (
    <div 
      id="search-suggestions-listbox"
      className="absolute top-full left-0 md:left-auto md:right-0 mt-2 w-full md:w-[360px] bg-white/98 dark:bg-zinc-950/98 backdrop-blur-xl border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl z-50 overflow-y-auto max-h-[480px] p-4.5 flex flex-col gap-4.5"
      role="listbox"
      aria-label="검색 추천 및 자동완성"
    >
      {!searchQuery.trim() ? (
        <>
          {/* Recommended Keywords */}
          <div role="group" aria-label="추천 검색어">
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
                    setSearchQuery(kw);
                    trackEvent('search_tag_click', { tag: kw });
                  }}
                  className="bg-neutral-50 dark:bg-zinc-900/60 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-secondary text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all active:scale-95 border border-neutral-200/50 dark:border-zinc-800/50 outline-none focus:ring-1 focus:ring-emerald-500/50"
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
                  className="group flex flex-col bg-neutral-50/50 dark:bg-zinc-900/40 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/5 hover:border-emerald-500/30 p-2.5 rounded-xl text-left transition-all active:scale-95 border border-neutral-200/60 dark:border-zinc-800/60 outline-none focus:ring-1 focus:ring-emerald-500/50"
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
                      handleSelectApt(item.apt.name);
                      setIsSearchFocused(false);
                      trackEvent('view_apartment', { apt_name: item.apt.name, trigger: 'search_shortcut' });
                    }}
                    onMouseEnter={() => {
                      preloadApartmentTx?.(item.apt.name, item.apt.dong);
                      import('@/components/ApartmentModal').catch(() => {});
                      import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
                    }}
                    onTouchStart={() => {
                      preloadApartmentTx?.(item.apt.name, item.apt.dong);
                      import('@/components/ApartmentModal').catch(() => {});
                      import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
                    }}
                    className="flex items-center justify-between p-2.5 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/5 rounded-xl transition-all text-left group active:scale-99 border border-transparent hover:border-emerald-500/10 outline-none focus:ring-1 focus:ring-emerald-500/50"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-primary text-[13px] font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {item.apt.name}
                      </span>
                      <span className="text-tertiary text-[11px] mt-0.5">
                        {item.apt.dong} · {item.formattedHousehold} · {item.formattedYearBuilt}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
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
                          setSearchQuery(brand);
                          trackEvent('search_tag_click', { tag: brand });
                        }}
                        className="bg-neutral-50 dark:bg-zinc-900/60 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-primary text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-neutral-200/50 dark:border-zinc-800/50 transition-all active:scale-95 outline-none focus:ring-1 focus:ring-emerald-500/50"
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
