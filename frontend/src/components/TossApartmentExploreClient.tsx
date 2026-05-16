'use client';

import React, { useState, useMemo } from 'react';
import { Heart, Search, ChevronRight, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Camera, ChevronDown, X } from 'lucide-react';
import PageHeroHeader from './PageHeroHeader';
import { DONGS, getDongByName } from '@/lib/dongs';
import { normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import { formatEokWithUnit } from '@/components/MacroDashboardClient';

const formatPrice = (priceMan: number) => {
  const { value, unit } = formatEokWithUnit(priceMan);
  return value + (unit === '만원' ? '만' : '');
};

const formatYearBuilt = (yearStr?: string | number) => {
  if (!yearStr) return '-';
  const str = String(yearStr).replace(/[^0-9]/g, '');
  
  let year = 0;
  let month = 1;
  
  if (str.length === 4) {
    year = parseInt(str);
  } else if (str.length >= 6) {
    year = parseInt(str.substring(0, 4));
    month = parseInt(str.substring(4, 6));
  } else {
    return `${String(yearStr)}년`;
  }
  
  if (isNaN(year)) return `${String(yearStr)}년`;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  let diffYears = currentYear - year;
  let diffMonths = currentMonth - month;
  
  if (diffMonths < 0) {
    diffYears--;
    diffMonths += 12;
  }
  
  let ageStr = '';
  if (diffYears < 0) {
    ageStr = '분양권/입주예정';
  } else if (diffYears === 0 && diffMonths === 0) {
    ageStr = '신축';
  } else {
    ageStr = `${diffYears}년 ${diffMonths}월차`;
  }
  
  if (str.length >= 6) {
    return `${year}년 ${String(month).padStart(2, '0')}월 / ${ageStr}`;
  } else {
    return `${year}년 / ${ageStr}`;
  }
};

// Using similar props to what was passed to the left panel before
export default function TossApartmentExploreClient({
  sheetApartments,
  txSummaryData,
  nameMapping,
  fieldReportsMap,
  publicRentalSet,
  userFavorites,
  favoriteCounts,
  typeMap,
  handleSelectApt,
  onToggleFavorite,
}: any) {
  const [currentCategory, setCurrentCategory] = useState<string>('rank-price');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Flatten and filter public rentals
  const allApts = useMemo(() => {
    return Object.values(sheetApartments).flat().filter((a: any) => !publicRentalSet.has(a.name));
  }, [sheetApartments, publicRentalSet]);

  // Enrich with data
  const enrichedApts = useMemo(() => {
    return allApts.map((apt: any) => {
      const rawKey = apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;

      const sum = txSummaryData[txKey];
      
      const pyeongPrice = sum?.avg3MPerPyeong || sum?.avg1MPerPyeong || (sum?.latestArea ? sum.latestPrice / (sum.latestArea / 3.3058) : 0);
      const sales = sum ? (sum.avg3MPrice || sum.avg1MPrice || sum.latestPrice || 0) : 0;
      const jeonse = sum ? (sum.avg3MRentDeposit || sum.avg1MRentDeposit || sum.latestRentDeposit || 0) : 0;
      const ratio = sales > 0 && jeonse > 0 ? (jeonse / sales) : 0;
      
      return {
        apt,
        pyeongPrice,
        totalPrice: sales,
        jeonsePrice: jeonse,
        ratio,
        volume3M: sum?.avg3MTxCount || 0,
        volume1M: sum?.avg1MTxCount || 0,
        turnoverRate: apt.householdCount && sum?.avg3MTxCount ? (sum.avg3MTxCount / apt.householdCount) * 100 : 0,
        hasTx: !!sum && !!(sum.avg1MPrice || sum.latestPrice) && !!(sum.avg1MRentDeposit || sum.latestRentDeposit),
        views: fieldReportsMap.get(apt.name)?.viewCount || 0,
        photoCount: fieldReportsMap.get(apt.name)?.images?.length || 0,
        likes: favoriteCounts[apt.name] || 0,
        isFavorited: userFavorites.has(apt.name)
      };
    });
  }, [allApts, txSummaryData, nameMapping, fieldReportsMap, favoriteCounts, userFavorites]);

  // Sort based on category
  const sortedApts = useMemo(() => {
    let filtered = [...enrichedApts];

    if (currentCategory === 'favorites') {
      filtered = filtered.filter(a => a.isFavorited);
    } else if (currentCategory.startsWith('dong-')) {
      const dongName = currentCategory.replace('dong-', '');
      filtered = filtered.filter(a => a.apt.dong === dongName);
    }

    // Sort logic
    filtered.sort((a, b) => {
      if (currentCategory === 'rank-price' || currentCategory.startsWith('dong-')) {
        return b.pyeongPrice - a.pyeongPrice;
      }
      if (currentCategory === 'rank-jeonse') {
        return b.ratio - a.ratio;
      }
      if (currentCategory === 'rank-views') {
        return b.views - a.views;
      }
      if (currentCategory === 'rank-volume') {
        return b.volume3M - a.volume3M;
      }
      // default: price per pyeong
      return b.pyeongPrice - a.pyeongPrice;
    });

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace(/\s+/g, '');
      filtered = filtered.filter(a => a.apt.name.toLowerCase().replace(/\s+/g, '').includes(q));
    }

    return filtered;
  }, [enrichedApts, currentCategory, searchQuery]);

  return (
    <div className="flex flex-col w-full bg-surface">
      {/* Standardized Hero Header */}
      <PageHeroHeader 
        title="D-VIEW 아파트 탐색"
        subtitleStrong="동탄 전역 아파트 비교 분석"
        subtitleLight="시세, 거래량, 관심도 등 다양한 지표로 아파트를 탐색하세요"
      />

      {/* Main Content Area */}
      <div className="flex w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 md:pt-10 pb-16 min-h-[calc(100vh-220px)] bg-surface items-stretch">
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-border py-6 sticky top-[60px]">
        <div className="mb-6">
          <h2 className="text-[14px] font-extrabold text-primary mb-3">단지 랭킹</h2>
          <div className="flex flex-col gap-1">
            <SidebarItem 
              label="내 관심 단지" 
              active={currentCategory === 'favorites'} 
              onClick={() => setCurrentCategory('favorites')} 
            />
            <SidebarItem 
              label="평당가 높은 순" 
              active={currentCategory === 'rank-price'} 
              onClick={() => setCurrentCategory('rank-price')} 
            />
            <SidebarItem 
              label="전세가율 높은 순" 
              active={currentCategory === 'rank-jeonse'} 
              onClick={() => setCurrentCategory('rank-jeonse')} 
            />
            <SidebarItem 
              label="최근 거래량 많은 순" 
              active={currentCategory === 'rank-volume'} 
              onClick={() => setCurrentCategory('rank-volume')} 
            />
            <SidebarItem 
              label="조회수 많은 순" 
              active={currentCategory === 'rank-views'} 
              onClick={() => setCurrentCategory('rank-views')} 
            />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-[14px] font-extrabold text-primary mb-3">법정동별 보기</h2>
          <div className="flex flex-col gap-1">
            {DONGS.map(dong => (
              <SidebarItem 
                key={dong.name}
                label={dong.name} 
                active={currentCategory === `dong-${dong.name}`} 
                onClick={() => setCurrentCategory(`dong-${dong.name}`)} 
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Compact Dynamic Sticky Header (Mobile Only) */}
      <div 
        className={`fixed top-0 left-0 right-0 md:hidden z-30 bg-white/95 backdrop-blur-md px-5 py-3 flex items-center justify-between transition-all duration-300 ${
          isScrolled ? 'translate-y-0 opacity-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <button 
          className="flex items-center gap-1 focus:outline-none"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <h2 className="text-[16px] font-extrabold text-primary tracking-tight">
            {currentCategory === 'favorites' ? '내 관심 단지' : 
             currentCategory === 'rank-price' ? '평당가 높은 순' :
             currentCategory === 'rank-jeonse' ? '전세가율 높은 순' :
             currentCategory === 'rank-volume' ? '최근 거래량 많은 순' :
             currentCategory === 'rank-views' ? '조회수 많은 순' :
             `${currentCategory.replace('dong-', '')} 아파트`}
          </h2>
          <ChevronDown className="w-4 h-4 text-primary" />
        </button>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="p-1.5 -mr-1.5 rounded-full hover:bg-body transition-colors"
        >
          <ArrowUp className="w-5 h-5 text-tertiary" />
        </button>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        <div className="px-5 py-3 md:px-0 md:py-5 border-b border-border flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-white md:sticky md:top-[60px] md:z-10">
          <div className="flex flex-row justify-between items-center md:flex-col md:items-start">
            <button 
              className="flex items-center gap-1 focus:outline-none md:pointer-events-none"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <h1 className="text-[20px] md:text-[28px] font-extrabold text-primary tracking-tight">
                {currentCategory === 'favorites' ? '내 관심 단지' : 
                 currentCategory === 'rank-price' ? '평당가 높은 순' :
                 currentCategory === 'rank-jeonse' ? '전세가율 높은 순' :
                 currentCategory === 'rank-volume' ? '최근 거래량 많은 순' :
                 currentCategory === 'rank-views' ? '조회수 많은 순' :
                 `${currentCategory.replace('dong-', '')} 아파트`}
              </h1>
              <ChevronDown className="w-5 h-5 text-primary md:hidden" />
            </button>
            <p className="text-[13px] md:text-[15px] font-medium text-tertiary mt-0 md:mt-2">총 {sortedApts.length}개 단지</p>
          </div>

          <div className="relative w-full md:w-[280px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
            <input 
              type="text" 
              placeholder="단지명 검색 (예: 롯데캐슬)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f2f4f6] border border-transparent focus:border-[#00d29d] focus:bg-white focus:shadow-[0_0_0_2px_rgba(49,130,246,0.2)] rounded-xl py-2 md:py-2.5 pl-10 pr-4 text-[14px] font-medium text-[#191f28] outline-none transition-all placeholder:text-[#8b95a1]"
            />
          </div>
        </div>

        <div className="flex flex-col relative">
          {/* Table Header */}
          <div className="hidden md:flex sticky top-[60px] z-10 bg-white items-center md:px-0 py-3 border-b border-border text-[14px] font-bold text-tertiary shrink-0">
            <div className="w-[40px] text-center"></div>
            <div className="w-[80px] text-center">순위</div>
            <div className="flex-1 min-w-[180px] ml-2">단지명</div>
            <div className="w-[180px] text-center">연식</div>
            <div className="w-[140px] text-center">매매가</div>
            <div className="w-[130px] text-center">평당가</div>
            <div className="w-[140px] text-center">전세가</div>
            <div className="w-[100px] text-center">세대수</div>
            <div className="w-[120px] text-center">거래량 / 회전율</div>
          </div>

          {/* Table Body */}
          <div className="pb-20">
              {sortedApts.map((item, index) => (
                <React.Fragment key={item.apt.name}>
                  {/* Desktop View (Hidden on Mobile) */}
                  <div 
                    onClick={() => handleSelectApt(item.apt.name)}
                    className="hidden md:flex items-center md:px-0 py-4 border-b border-body/50 hover:bg-body/50 cursor-pointer transition-colors"
                  >
                    {/* Heart */}
                    <div 
                      className="w-[40px] text-center flex justify-center"
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.apt.name); }}
                    >
                      <Heart size={18} className={item.isFavorited ? "text-toss-red fill-current" : "text-border"} />
                    </div>
                    
                    {/* Rank */}
                    <div className="w-[80px] text-center text-[15px] font-bold text-secondary">
                      {index + 1}
                    </div>
                    
                    {/* Name & Dong */}
                    <div className="flex-1 min-w-[180px] flex items-center ml-2">
                      <span className="text-[15px] font-extrabold text-primary leading-none">{item.apt.name}</span>
                      <span className="ml-2 text-[13px] text-tertiary leading-none font-medium">{item.apt.dong}</span>
                      {item.photoCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-[#e0fbf4] text-[#00b386] text-[11px] font-bold rounded-md leading-none flex items-center">
                          <Camera className="w-3 h-3 mr-1 inline-block" />
                          사진 {item.photoCount}장
                        </span>
                      )}
                    </div>

                    {/* Age */}
                    <div className="w-[180px] flex flex-col justify-center items-end text-right">
                      <span className="text-[14px] font-medium text-secondary leading-none">{formatYearBuilt(item.apt.yearBuilt)}</span>
                    </div>
                    
                    {/* Price */}
                    <div className="w-[140px] text-right flex items-center justify-end">
                      <span className="text-[15px] font-bold text-primary">
                        {item.totalPrice > 0 ? formatPrice(item.totalPrice) : '-'}
                      </span>
                    </div>
                    
                    {/* Pyeong */}
                    <div className="w-[130px] text-right flex items-center justify-end">
                      <span className="text-[14px] font-bold text-toss-blue">
                        {item.pyeongPrice > 0 ? `${Math.floor(item.pyeongPrice).toLocaleString()}만/평` : '-'}
                      </span>
                    </div>

                    {/* Jeonse */}
                    <div className="w-[140px] text-right flex flex-col justify-center items-end">
                      <span className="text-[14px] font-bold text-primary">
                        {item.jeonsePrice > 0 ? formatPrice(item.jeonsePrice) : '-'}
                      </span>
                      <span className="text-[12px] text-tertiary mt-1.5 leading-none">
                        {item.ratio > 0 ? `전세율 ${(item.ratio * 100).toFixed(1)}%` : '-'}
                      </span>
                    </div>

                    {/* Household */}
                    <div className="w-[100px] text-right flex items-center justify-end text-[14px] text-secondary">
                      {item.apt.householdCount ? `${item.apt.householdCount}세대` : '-'}
                    </div>

                    {/* Volume */}
                    <div className="w-[120px] text-right flex flex-col justify-center items-end">
                      <span className="text-[14px] font-medium text-secondary">
                        {item.volume3M > 0 ? `${item.volume3M}건` : '-'}
                      </span>
                      <span className="text-[12px] text-toss-blue mt-1.5 leading-none">
                        {item.turnoverRate > 0 ? `회전율 ${item.turnoverRate.toFixed(1)}%` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Mobile View (Hidden on Desktop) */}
                  <div 
                    onClick={() => handleSelectApt(item.apt.name)}
                    className="flex md:hidden flex-row items-center justify-between px-5 py-4 border-b border-body/50 hover:bg-body/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center justify-center min-w-[24px] pt-0.5">
                        <span className="text-[15px] font-bold text-secondary mb-1">{index + 1}</span>
                        <div onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.apt.name); }}>
                          <Heart size={16} className={item.isFavorited ? "text-toss-red fill-current" : "text-tertiary"} />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[16px] font-extrabold text-primary leading-tight">{item.apt.name}</span>
                          {item.photoCount > 0 && (
                            <span className="px-1.5 py-[2px] bg-[#e0fbf4] text-[#00b386] text-[10px] font-bold rounded flex items-center">
                              <Camera className="w-2.5 h-2.5 mr-0.5 inline-block" />{item.photoCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] text-tertiary font-medium mb-1">
                          {item.apt.dong} · {formatYearBuilt(item.apt.yearBuilt).split(' / ').pop()} · {item.apt.householdCount ? `${item.apt.householdCount}세대` : ''}
                        </span>
                        <span className="text-[12px] text-secondary">
                          {item.jeonsePrice > 0 ? `전세 ${formatPrice(item.jeonsePrice)} (${(item.ratio * 100).toFixed(1)}%)` : '전세 없음'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end text-right">
                      <span className="text-[16px] font-bold text-primary mb-1">
                        {item.totalPrice > 0 ? formatPrice(item.totalPrice) : '-'}
                      </span>
                      <span className="text-[13px] font-bold text-toss-blue">
                        {item.pyeongPrice > 0 ? `${Math.floor(item.pyeongPrice).toLocaleString()}만/평` : '-'}
                      </span>
                      {item.volume3M > 0 && (
                        <span className="text-[12px] text-secondary mt-1">
                          거래 {item.volume3M}건
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

      {/* Mobile Bottom Sheet Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:hidden">
          {/* Dimmed Background */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sheet */}
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <h2 className="text-[18px] font-extrabold text-primary">단지 보기 방식</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 -mr-1.5 rounded-full hover:bg-body transition-colors"
              >
                <X className="w-6 h-6 text-tertiary" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 px-5 py-2">
              <div className="py-3">
                <h3 className="text-[13px] font-extrabold text-tertiary mb-2 px-2">단지 랭킹</h3>
                <div className="flex flex-col gap-1">
                  <MobileSidebarItem 
                    label="내 관심 단지" 
                    active={currentCategory === 'favorites'} 
                    onClick={() => { setCurrentCategory('favorites'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="평당가 높은 순" 
                    active={currentCategory === 'rank-price'} 
                    onClick={() => { setCurrentCategory('rank-price'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="전세가율 높은 순" 
                    active={currentCategory === 'rank-jeonse'} 
                    onClick={() => { setCurrentCategory('rank-jeonse'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="최근 거래량 많은 순" 
                    active={currentCategory === 'rank-volume'} 
                    onClick={() => { setCurrentCategory('rank-volume'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="조회수 많은 순" 
                    active={currentCategory === 'rank-views'} 
                    onClick={() => { setCurrentCategory('rank-views'); setIsMobileMenuOpen(false); }} 
                  />
                </div>
              </div>

              <div className="py-3 border-t border-border mt-1">
                <h3 className="text-[13px] font-extrabold text-tertiary mb-2 px-2 mt-2">법정동별 보기</h3>
                <div className="flex flex-col gap-1 pb-6">
                  {DONGS.map(dong => (
                    <MobileSidebarItem 
                      key={dong.name}
                      label={dong.name} 
                      active={currentCategory === `dong-${dong.name}`} 
                      onClick={() => { setCurrentCategory(`dong-${dong.name}`); setIsMobileMenuOpen(false); }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function SidebarItem({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`text-left px-3 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
        active ? 'bg-body text-primary' : 'text-secondary hover:bg-body/50'
      }`}
    >
      {label}
    </button>
  );
}

function MobileSidebarItem({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`text-left px-4 py-3.5 rounded-2xl text-[16px] font-bold transition-all flex items-center justify-between ${
        active ? 'bg-[#e0fbf4] text-[#00b386]' : 'text-primary hover:bg-body/50'
      }`}
    >
      {label}
      {active && <div className="w-1.5 h-1.5 rounded-full bg-[#00b386]" />}
    </button>
  );
}
