import React from 'react';
import { Search, X } from 'lucide-react';
import { DongApartment } from '@/lib/dong-apartments';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';

export interface CompareHeaderSearchProps {
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery1: string;
  setSearchQuery1: (val: string) => void;
  apt1: DongApartment | null;
  setApt1: (apt: DongApartment | null) => void;
  isFocused1: boolean;
  setIsFocused1: (val: boolean) => void;
  dropdownRef1: React.RefObject<HTMLDivElement | null>;
  handleKeyDown1: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  dropdownOptions1: DongApartment[];
  activeIndex1: number;
  recentApts: DongApartment[];
  saveToRecent: (apt: DongApartment) => void;

  searchQuery2: string;
  setSearchQuery2: (val: string) => void;
  apt2: DongApartment | null;
  setApt2: (apt: DongApartment | null) => void;
  isFocused2: boolean;
  setIsFocused2: (val: boolean) => void;
  dropdownRef2: React.RefObject<HTMLDivElement | null>;
  handleKeyDown2: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  dropdownOptions2: DongApartment[];
  activeIndex2: number;
}

export const CompareHeaderSearch = React.memo(function CompareHeaderSearch({
  firstInputRef,
  searchQuery1,
  setSearchQuery1,
  apt1,
  setApt1,
  isFocused1,
  setIsFocused1,
  dropdownRef1,
  handleKeyDown1,
  dropdownOptions1,
  activeIndex1,
  recentApts,
  saveToRecent,
  searchQuery2,
  setSearchQuery2,
  apt2,
  setApt2,
  isFocused2,
  setIsFocused2,
  dropdownRef2,
  handleKeyDown2,
  dropdownOptions2,
  activeIndex2,
}: CompareHeaderSearchProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center bg-body/50 p-4 rounded-2xl border border-border/20">
      {/* Apt 1 Input */}
      <div className="md:col-span-3 relative" ref={dropdownRef1}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
          <input
            ref={firstInputRef}
            type="text"
            placeholder="1번 단지 검색..."
            aria-label="1번 단지 검색"
            value={searchQuery1}
            onChange={(e) => {
              setSearchQuery1(e.target.value);
              if (apt1) setApt1(null);
            }}
            onFocus={() => setIsFocused1(true)}
            onKeyDown={handleKeyDown1}
            className="w-full bg-surface border border-border/40 focus:border-[#ea6100] rounded-xl py-2 pl-9 pr-8 text-[13.5px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
          />
          {searchQuery1 && (
            <button
              onClick={() => {
                setSearchQuery1('');
                setApt1(null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isFocused1 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border shadow-xl rounded-xl z-50 overflow-y-auto max-h-[220px] py-1">
            {dropdownOptions1.length > 0 ? (
              <>
                {searchQuery1.trim() === '' && recentApts.length > 0 && (
                  <div className="px-3 py-1 text-[10px] font-black text-tertiary uppercase tracking-wider border-b border-border/10 mb-1">
                    최근 선택 단지
                  </div>
                )}
                {dropdownOptions1.map((apt, index) => {
                  const isFirstRemaining = searchQuery1.trim() === '' && recentApts.length > 0 && index === recentApts.length;
                  return (
                    <React.Fragment key={apt.name}>
                      {isFirstRemaining && (
                        <div className="px-3 py-1 mt-2 text-[10px] font-black text-tertiary uppercase tracking-wider border-t border-b border-border/10 mb-1 pt-1.5">
                          전체 단지 리스트
                        </div>
                      )}
                      <button
                        data-index={index}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setApt1(apt);
                          setSearchQuery1(getDisplayAptName(apt.name));
                          setIsFocused1(false);
                          saveToRecent(apt);
                        }}
                        className={`w-full text-left px-3 py-2 text-[12.5px] font-bold hover:bg-body text-secondary flex items-center justify-between transition-all ${
                          activeIndex1 === index ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : ''
                        }`}
                      >
                        <span>{getDisplayAptName(apt.name)}</span>
                        <span className="text-[10px] text-tertiary px-1.5 py-0.5 bg-body rounded">{apt.dong}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              <div className="px-3 py-2 text-[12px] font-bold text-tertiary text-center">검색 결과가 없습니다</div>
            )}
          </div>
        )}
      </div>

      {/* VS Divider */}
      <div className="md:col-span-1 flex items-center justify-center">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ea6100] to-emerald-500 text-white font-black text-[12px] flex items-center justify-center shadow-md select-none shrink-0">
          VS
        </span>
      </div>

      {/* Apt 2 Input */}
      <div className="md:col-span-3 relative" ref={dropdownRef2}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
          <input
            type="text"
            placeholder="2번 단지 검색..."
            value={searchQuery2}
            onChange={(e) => {
              setSearchQuery2(e.target.value);
              if (apt2) setApt2(null);
            }}
            onFocus={() => setIsFocused2(true)}
            onKeyDown={handleKeyDown2}
            className="w-full bg-surface border border-border/40 focus:border-[#ea6100] rounded-xl py-2 pl-9 pr-8 text-[13.5px] font-bold text-primary outline-none transition-all placeholder:text-tertiary"
          />
          {searchQuery2 && (
            <button
              onClick={() => {
                setSearchQuery2('');
                setApt2(null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isFocused2 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border shadow-xl rounded-xl z-50 overflow-y-auto max-h-[220px] py-1">
            {dropdownOptions2.length > 0 ? (
              <>
                {searchQuery2.trim() === '' && recentApts.length > 0 && (
                  <div className="px-3 py-1 text-[10px] font-black text-tertiary uppercase tracking-wider border-b border-border/10 mb-1">
                    최근 선택 단지
                  </div>
                )}
                {dropdownOptions2.map((apt, index) => {
                  const isFirstRemaining = searchQuery2.trim() === '' && recentApts.length > 0 && index === recentApts.length;
                  return (
                    <React.Fragment key={apt.name}>
                      {isFirstRemaining && (
                        <div className="px-3 py-1 mt-2 text-[10px] font-black text-tertiary uppercase tracking-wider border-t border-b border-border/10 mb-1 pt-1.5">
                          전체 단지 리스트
                        </div>
                      )}
                      <button
                        data-index={index}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setApt2(apt);
                          setSearchQuery2(getDisplayAptName(apt.name));
                          setIsFocused2(false);
                          saveToRecent(apt);
                        }}
                        className={`w-full text-left px-3 py-2 text-[12.5px] font-bold hover:bg-body text-secondary flex items-center justify-between transition-all ${
                          activeIndex2 === index ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : ''
                        }`}
                      >
                        <span>{getDisplayAptName(apt.name)}</span>
                        <span className="text-[10px] text-tertiary px-1.5 py-0.5 bg-body rounded">{apt.dong}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              <div className="px-3 py-2 text-[12px] font-bold text-tertiary text-center">검색 결과가 없습니다</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
