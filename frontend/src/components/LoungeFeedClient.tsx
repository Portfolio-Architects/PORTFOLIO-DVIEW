'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { MessageSquare, Eye, Heart, Loader2, ChevronDown, Share2, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import LoungeDetailClient from '@/components/LoungeDetailClient';
import LoungeModalBackdrop from '@/components/LoungeModalBackdrop';
import { NativeAdPlaceholder } from '@/components/ui/NativeAdPlaceholder';
import { usePWA } from '@/components/pwa/PWAProvider';

interface Post {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  category: string;
  author: string;
  meta: string;
  views: number;
  likes: number;
  createdAt: number;
}

interface LocalNoticeItem {
  id: string;
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong';
}

interface NewsItem {
  id: number;
  category: string;
  sub: string;
  title: string;
  summary?: string;
  link: string;
}

interface LoungeFeedClientProps {
  initialPosts: Post[];
  currentTab: string;
}

const CATEGORY_MAP: Record<string, string[]> = {
  '동탄 부동산 뉴스': [],
  '매니저 임장기': ['매니저 임장기'],
  '동탄 육아/교육': ['동탄 육아/교육', '어린이집/유치원', '학원/교육'],
  '실시간 오픈런/정보': ['실시간 오픈런/정보', '소아과/병원', '실시간 제보'],
  '우리동네 이야기': ['동탄 임장/분석', '임장기', '부동산 고민상담', '부동산 기초', '동탄 청약/대출', '정책자금 대출', '동탄 교통/상권', '인프라', '우리동네 이야기', '기타', '전체'],
  '동탄 벼룩/나눔': ['동탄 벼룩/나눔', '나눔/벼룩', '공동구매']
};

export function formatRelativeTime(dateInput: number | string | Date | undefined): string {
  if (!dateInput) return '방금 전';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '방금 전';
  
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (year === now.getFullYear()) {
    return `${month}.${day}`;
  }
  return `${year}.${month}.${day}`;
}

const postsFetcher = (url: string) => fetch(url).then(res => res.json()).then(json => json.posts || []);

const getPostsKey = (pageIndex: number, previousPageData: Post[] | null) => {
  if (previousPageData && !previousPageData.length) return null; // Reached the end
  if (pageIndex === 0) return `/api/posts?limit=20`;
  if (!previousPageData) return null; // Safe guard
  const lastPost = previousPageData[previousPageData.length - 1];
  return `/api/posts?limit=20&lastCreatedAt=${lastPost.createdAt}`;
};

export default function LoungeFeedClient({ initialPosts, currentTab }: LoungeFeedClientProps) {
  const { showToast } = usePWA();
  const { data, error, size, setSize, isValidating } = useSWRInfinite<Post[]>(
    getPostsKey,
    postsFetcher,
    {
      fallbackData: initialPosts ? [initialPosts] : undefined,
      revalidateFirstPage: false,
      persistSize: true,
    }
  );

  const posts = useMemo(() => {
    return data ? data.flat() : [];
  }, [data]);

  const isReachingEnd = data && (data.length === 0 || (data[data.length - 1] && data[data.length - 1].length < 20));
  const isLoadingMore = isValidating && size > 1 && data && typeof data[size - 1] === 'undefined';
  const hasMore = !isReachingEnd;
  const observerTarget = useRef<HTMLDivElement>(null);

  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [visibleNewsCount, setVisibleNewsCount] = useState(10);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [noticesData, setNoticesData] = useState<LocalNoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [visibleNoticesCount, setVisibleNoticesCount] = useState(20);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);

  const [activeSubCategory, setActiveSubCategory] = useState<'all' | 'city' | 'rail' | 'town'>('all');
  const [activeDongFilter, setActiveDongFilter] = useState<string>('all');

  useEffect(() => {
    setVisibleNoticesCount(20);
  }, [activeSubCategory, activeDongFilter]);

  useEffect(() => {
    const checkParams = () => {
      // Check query parameter
      const params = new URLSearchParams(window.location.search);
      const noticeParam = params.get('notice');
      
      const postMatch = window.location.hash.match(/#post=([^&]+)/);
      const noticeMatch = window.location.hash.match(/#notice=([^&]+)/);
      
      if (postMatch) {
        setSelectedPostId(decodeURIComponent(postMatch[1]));
        setSelectedNoticeId(null);
      } else if (noticeMatch) {
        setSelectedNoticeId(decodeURIComponent(noticeMatch[1]));
        setSelectedPostId(null);
      } else if (noticeParam) {
        setSelectedNoticeId(noticeParam);
        setSelectedPostId(null);
      } else {
        setSelectedPostId(null);
        setSelectedNoticeId(null);
      }

      // Check if routing directly to rail notices tab
      if (window.location.hash === '#lounge-notices-rail') {
        setActiveSubCategory('rail');
      }
    };
    
    checkParams();
    window.addEventListener('hashchange', checkParams);
    return () => window.removeEventListener('hashchange', checkParams);
  }, []);

  useEffect(() => {
    if (currentTab === '동탄 부동산 뉴스' && newsData.length === 0) {
      setNewsLoading(true);
      fetch("/api/macro/news")
        .then(res => res.json())
        .then((json: { status: string; data?: NewsItem[] }) => {
          if (json.status === "success" && json.data) {
            setNewsData(json.data);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setNewsLoading(false));
    }
  }, [currentTab, newsData.length]);

  useEffect(() => {
    if ((currentTab === '동탄구 소식' || selectedNoticeId) && noticesData.length === 0) {
      setNoticesLoading(true);
      fetch("/api/local-notices?t=" + Date.now())
        .then(res => res.json())
        .then((json: { notices?: LocalNoticeItem[]; lastUpdated?: string }) => {
          if (json.notices) {
            setNoticesData(json.notices);
          }
          if (json.lastUpdated) {
            setLastUpdatedTime(json.lastUpdated);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setNoticesLoading(false));
    }
  }, [currentTab, selectedNoticeId, noticesData.length]);

  const loadMorePosts = useCallback(() => {
    if (isValidating || isReachingEnd) return;
    setSize(prev => prev + 1);
  }, [isValidating, isReachingEnd, setSize]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMorePosts]);

  // Filter notices data based on sub-category and dong filter
  const filteredNotices = useMemo(() => {
    return noticesData.filter(notice => {
      // 1. Sub category filtering
      if (activeSubCategory === 'city') {
        if (notice.source !== 'gosi' && notice.source !== 'bbs') return false;
      } else if (activeSubCategory === 'rail') {
        if (notice.source !== 'rail') return false;
      } else if (activeSubCategory === 'town') {
        if (notice.source !== 'dong') return false;
        
        // 2. Dong filtering (only applicable under 'town' category)
        if (activeDongFilter !== 'all') {
          if (notice.dept !== activeDongFilter) return false;
        }
      }
      return true;
    });
  }, [noticesData, activeSubCategory, activeDongFilter]);

  const selectedNotice = noticesData.find(n => n.id === selectedNoticeId);

  const handleShareNotice = (notice: LocalNoticeItem) => {
    const shareUrl = `${window.location.origin}/lounge?notice=${notice.id}&title=${encodeURIComponent(notice.title)}&dept=${encodeURIComponent(notice.dept)}`;
    if (navigator.share) {
      navigator.share({
        title: `[동탄구 소식] ${notice.title}`,
        text: `${notice.dept} 고시공고 - D-VIEW에서 바로 확인해보세요!`,
        url: shareUrl,
      }).catch(err => console.error(err));
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("🎉 소식 공유 링크가 클립보드에 복사되었습니다!");
      });
    }
  };

  const handleCloseNoticeModal = () => {
    if (window.location.search.includes('notice=')) {
      const newUrl = window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, '', newUrl);
    }
    window.location.hash = '';
    setSelectedNoticeId(null);
  };

  const filteredPosts = (currentTab === '동탄 부동산 뉴스' || currentTab === '동탄구 소식')
    ? []
    : posts.filter((p) => (CATEGORY_MAP[currentTab] || [currentTab]).includes(p.category || '기타'));

  // Auto-fetch if the current category has no posts but there are more posts in the DB
  useEffect(() => {
    if (filteredPosts.length === 0 && hasMore && !isLoadingMore) {
      const timer = setTimeout(() => {
        loadMorePosts();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filteredPosts.length, hasMore, isLoadingMore, loadMorePosts]);

  if (currentTab === '동탄 부동산 뉴스') {
    return (
      <div className="flex flex-col gap-4 w-full">
        {newsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-5 rounded-2xl border border-border bg-surface animate-pulse">
              <div className="w-8 h-8 shrink-0 bg-gray-200 rounded-full" />
              <div className="flex flex-col w-full">
                <div className="w-1/3 h-3 bg-gray-200 rounded mb-2" />
                <div className="w-full h-4 bg-gray-200 rounded mb-1.5" />
                <div className="w-2/3 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))
        ) : (
            (newsData.length > 0 ? newsData.slice(0, visibleNewsCount) : [
              {
                id: 1,
                category: "INFRASTRUCTURE",
                sub: "Transportation",
                title: "GTX-A 노선 개통 이후 동탄역 주변 아파트 실거래가 15% 상승",
                summary: "광역 교통망 확충이 지역 핵심 자산 가치에 미치는 파급력을 분석한 리포트입니다. 특히 동탄역 인근 단지들의 신고가 경신 사례를 다룹니다.",
                link: "#",
              },
              {
                id: 2,
                category: "MARKET",
                sub: "Supply & Demand",
                title: "동탄2신도시 입주 물량 안정화 진입, 전세가율 반등",
                summary: "동탄 호수공원 및 문화디자인밸리 중심의 신축 아파트 선호도가 지속되면서, 전세 매물 감소와 함께 전세가율이 상승 곡선을 그리고 있습니다.",
                link: "#",
              },
              {
                id: 3,
                category: "POLICY",
                sub: "Urban Development",
                title: "동탄 트램(도시철도) 기본설계 본격화",
                summary: "1동탄과 2동탄을 잇는 내부 교통망 완성으로 인한 권역별 가격 갭(Gap) 축소 전망 및 주요 트램 정거장 예정지 인근 부동산 시장 동향입니다.",
                link: "#",
              },
              {
                id: 4,
                category: "COMMERCIAL",
                sub: "Anchor Tenant",
                title: "경부고속도로 지하화 및 상부 공원화 사업",
                summary: "동탄역세권 광역비즈니스콤플렉스 확장 및 라이프스타일 앵커 시설 도입이 예정되어 있어, 주변 상권과 주거 환경의 획기적 개선이 기대됩니다.",
                link: "#",
              },
              {
                id: 5,
                category: "MACRO",
                sub: "Liquidity",
                title: "금리 인하 기대감 선반영, 거래량 3개월 연속 상승",
                summary: "신생아 특례대출 등 정책 금융이 3040 세대의 매수 심리에 미친 영향을 분석하며, 하반기 추가적인 거래량 증가 여부를 진단합니다.",
                link: "#",
              },
              {
                id: 6,
                category: "COMMUNITY",
                sub: "Education",
                title: "동탄 내 학군 형성 가속화, '시범 커뮤니티' 권역 프리미엄 고착화",
                summary: "우수 학군 배정 단지의 가격 하방 경직성 및 거래 회전율 검증 데이터를 바탕으로, 교육 환경이 집값에 미치는 실증적 사례를 보여줍니다.",
                link: "#",
              },
            ]).map((news) => {
              const isPlaceholder = news.link === "#";
              const LinkComponent = isPlaceholder ? "div" : "a";
              return (
                <LinkComponent
                  key={news.id}
                  href={isPlaceholder ? undefined : news.link}
                  target={isPlaceholder ? undefined : "_blank"}
                  rel={isPlaceholder ? undefined : "noopener noreferrer"}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-border bg-surface hover:bg-body hover:border-toss-blue/30 transition-all cursor-pointer group w-full text-left"
                >
                  <div className="flex items-center gap-3 sm:gap-0 shrink-0">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center bg-surface rounded-full border border-border text-[#00d29d] font-bold text-[14px] sm:text-[16px] shadow-sm group-hover:bg-[#00d29d] group-hover:text-white transition-colors">
                      {news.id}
                    </div>
                    
                    {/* Mobile Meta */}
                    <div className="flex sm:hidden items-center gap-2">
                      <span className="text-[11px] font-extrabold text-[#00d29d] tracking-wide">{news.category}</span>
                      <span className="text-[11px] text-gray-300">|</span>
                      <span className="text-[11px] font-semibold text-tertiary truncate max-w-[100px]">{news.sub}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-5 flex-1 min-w-0">
                    {/* Desktop Meta */}
                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                      <span className="w-[115px] text-[13px] font-extrabold text-[#00a06c] tracking-wide text-center bg-[#e8f8f0] px-2 py-1.5 rounded-lg truncate">{news.category}</span>
                      <span className="w-[80px] text-[14px] font-semibold text-tertiary truncate text-center">{news.sub}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-[14.5px] sm:text-[16px] font-bold text-primary leading-[1.5] sm:leading-normal group-hover:text-toss-blue transition-colors truncate">
                        {news.title}
                      </p>
                      {news.summary && (
                        <p className="text-[13.5px] text-secondary leading-[1.5] line-clamp-2 mt-1 hidden sm:block">
                          {news.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </LinkComponent>
              );
            })
          )}
          
          {newsData.length > visibleNewsCount && (
            <div className="mt-4 flex justify-center pb-8">
              <button 
                onClick={() => setVisibleNewsCount(prev => prev + 10)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-surface border border-border hover:bg-body text-secondary text-[13.5px] font-bold rounded-full transition-colors shadow-sm"
              >
                더보기 ({visibleNewsCount} {"/"} {newsData.length})
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
      </div>
    );
  }

  if (currentTab === '동탄구 소식') {
    return (
      <div className="flex flex-col gap-4 w-full">
        {/* Freshness Indicator Widget */}
        <div className="flex items-center justify-between bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl p-4 mb-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400">
              실시간 행정망 자동 수집 중
            </span>
          </div>
          {lastUpdatedTime && (
            <span className="text-[12px] font-bold text-emerald-600/80 dark:text-emerald-400/80">
              최근 업데이트: {formatRelativeTime(lastUpdatedTime)}
            </span>
          )}
        </div>

        {/* 1단계 대분류 필터 칩 */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          {[
            { id: 'all', label: '전체' },
            { id: 'city', label: '시정공고' },
            { id: 'rail', label: '교통·철도' },
            { id: 'town', label: '동네행정' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubCategory(tab.id as any);
                setActiveDongFilter('all');
              }}
              className={`px-4 py-2 text-[13px] font-extrabold rounded-full transition-all shrink-0 cursor-pointer ${
                activeSubCategory === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10'
                  : 'bg-surface border border-border text-secondary hover:bg-body'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 2단계 소분류 행정동 필터 칩 (대분류가 'town'일 때만) */}
        {activeSubCategory === 'town' && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none animate-in fade-in slide-in-from-top-2 duration-200">
            {[
              { id: 'all', label: '전체 동네' },
              { id: '동탄1동', label: '동탄1동' },
              { id: '동탄2동', label: '동탄2동' },
              { id: '동탄3동', label: '동탄3동' },
              { id: '동탄4동', label: '동탄4동' },
              { id: '동탄5동', label: '동탄5동' },
              { id: '동탄6동', label: '동탄6동' },
              { id: '동탄7동', label: '동탄7동' },
              { id: '동탄8동', label: '동탄8동' },
              { id: '동탄9동', label: '동탄9동' }
            ].map(dong => (
              <button
                key={dong.id}
                onClick={() => setActiveDongFilter(dong.id)}
                className={`px-3 py-1.5 text-[12px] font-black rounded-lg transition-all shrink-0 cursor-pointer ${
                  activeDongFilter === dong.id
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                    : 'bg-surface border border-border text-tertiary hover:bg-body'
                }`}
              >
                {dong.label}
              </button>
            ))}
          </div>
        )}

        {noticesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-5 rounded-2xl border border-border bg-surface animate-pulse">
              <div className="w-8 h-8 shrink-0 bg-gray-200 rounded-full" />
              <div className="flex flex-col w-full">
                <div className="w-1/3 h-3 bg-gray-200 rounded mb-2" />
                <div className="w-full h-4 bg-gray-200 rounded mb-1.5" />
                <div className="w-2/3 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))
        ) : (
          <>
            {filteredNotices.length === 0 ? (
              <div className="bg-surface rounded-2xl p-12 text-center border border-border">
                <span className="text-[14px] font-bold text-tertiary">
                  선택하신 조건에 해당하는 공지사항이 없습니다.
                </span>
              </div>
            ) : (
              filteredNotices.slice(0, visibleNoticesCount).map((notice, idx) => (
                <a
                  key={notice.id}
                  href={`/api/bypass-notice?url=${encodeURIComponent((notice.url || '').trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-border bg-surface hover:bg-body hover:border-emerald-500/30 transition-all cursor-pointer group w-full"
                >
                  <div className="flex items-center gap-3 sm:gap-0 shrink-0">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center bg-surface rounded-full border border-border text-emerald-500 font-bold text-[14px] sm:text-[16px] shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      {idx + 1}
                    </div>
                    
                    {/* Mobile Meta */}
                    <div className="flex sm:hidden items-center gap-2">
                      <span className="text-[11px] font-extrabold text-emerald-600 tracking-wide">{notice.dept}</span>
                      <span className="text-[11px] text-gray-300">|</span>
                      <span className="text-[11px] font-semibold text-tertiary truncate max-w-[100px]">{notice.date}</span>
                      {notice.isDongtan && (
                        <>
                          <span className="text-[11px] text-gray-300">|</span>
                          <span className="bg-emerald-50 text-emerald-600 px-1 py-0.5 text-[9px] font-black rounded">동탄</span>
                        </>
                      )}
                    </div>
                  </div>
     
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-5 flex-1 min-w-0">
                    {/* Desktop Meta */}
                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                      <span className="w-[115px] text-[13px] font-extrabold text-emerald-600 tracking-wide text-center bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1.5 rounded-lg truncate border border-emerald-100 dark:border-emerald-900/30">{notice.dept}</span>
                      <span className="w-[96px] text-[14px] font-semibold text-tertiary text-center shrink-0">{notice.date}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-[14.5px] sm:text-[16px] font-bold text-primary leading-[1.5] sm:leading-normal group-hover:text-emerald-600 transition-colors truncate">
                        {notice.title}
                      </p>
                    </div>
     
                    {notice.isDongtan && (
                      <span className="hidden sm:inline-block bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 text-[11px] font-black rounded-lg border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                        동탄 관련 소식
                      </span>
                    )}
                  </div>
                </a>
              ))
            )}
          </>
        )}
        
        {filteredNotices.length > visibleNoticesCount && (
          <div className="mt-4 flex justify-center pb-8">
            <button 
              onClick={() => setVisibleNoticesCount(prev => prev + 80)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-surface border border-border hover:bg-body text-secondary text-[13.5px] font-bold rounded-full transition-colors shadow-sm cursor-pointer"
            >
              더보기 ({visibleNoticesCount} {"/"} {filteredNotices.length})
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {filteredPosts.length === 0 && !hasMore && (
        <div className="bg-transparent rounded-2xl p-12 text-center border border-dashed border-toss-gray">
          <MessageSquare size={40} className="mx-auto mb-4 text-toss-gray" />
          <p className="text-[15px] font-bold text-secondary">아직 &apos;{currentTab}&apos; 관련 글이 없습니다</p>
        </div>
      )}

      {filteredPosts.map((news, index) => {
        const renderAd = index > 0 && index % 4 === 0;
        return (
          <Fragment key={news.id}>
            {renderAd && (
              <div onClick={(e) => e.stopPropagation()} className="w-full">
                <NativeAdPlaceholder 
                  location={`라운지 피드 중간 광고 ${Math.floor(index / 4)}`} 
                  adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOUNGE_FEED || "test-lounge-feed-slot"} 
                />
              </div>
            )}
            <div 
              onClick={() => { window.location.hash = `post=${news.id}`; }} 
            className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-border bg-surface hover:bg-body hover:border-toss-blue/30 transition-all cursor-pointer group w-full"
          >
            <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 sm:gap-0 shrink-0">
              <div className="flex items-center gap-3 sm:gap-0">
                <div className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center bg-surface rounded-full border border-border text-tertiary font-bold text-[14px] sm:text-[16px] shadow-sm group-hover:bg-toss-blue group-hover:text-white transition-colors">
                  <MessageSquare size={16} />
                </div>
                
                {/* Mobile Meta */}
                <div className="flex sm:hidden items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-extrabold tracking-wide ${
                      (news.category === '동탄 임장/분석' || news.category === '임장기') ? 'text-[#00a06c]' :
                      (news.category === '부동산 고민상담' || news.category === '부동산 기초') ? 'text-toss-red' :
                      (news.category === '동탄 청약/대출' || news.category === '정책자금 대출') ? 'text-toss-blue' :
                      (news.category === '동탄 교통/상권' || news.category === '인프라') ? 'text-[#9b51e0]' :
                      (news.category === '동탄 육아/교육' || news.category === '어린이집/유치원' || news.category === '학원/교육') ? 'text-amber-500' :
                      (news.category === '실시간 오픈런/정보' || news.category === '소아과/병원' || news.category === '실시간 제보') ? 'text-rose-500' :
                      (news.category === '동탄 벼룩/나눔' || news.category === '나눔/벼룩' || news.category === '공동구매') ? 'text-emerald-500' :
                      'text-secondary'
                    }`}>
                      {news.category === '임장기' ? '동탄 임장/분석' : 
                       news.category === '부동산 기초' ? '부동산 고민상담' :
                       news.category === '정책자금 대출' ? '동탄 청약/대출' :
                       news.category === '인프라' ? '동탄 교통/상권' : 
                       (news.category || '기타')}
                  </span>
                  <span className="text-[11px] text-gray-300">|</span>
                  <span className="text-[11px] font-semibold text-tertiary truncate max-w-[80px]">{news.author || '매니저'}</span>
                  <span className="text-[11px] text-gray-300">|</span>
                  <span className="text-[11px] font-semibold text-tertiary shrink-0">{news.meta?.split('·')[0]?.trim() || formatRelativeTime(news.createdAt)}</span>
                </div>
              </div>
              
              {/* Mobile Top Right Meta: Views, Likes */}
              <div className="flex sm:hidden items-center gap-2.5 text-[11px] font-semibold text-tertiary">
                <span className="flex items-center gap-1"><Eye size={12}/> {news.views || 0}</span>
                <span className={`flex items-center gap-1 ${news.likes > 0 ? 'text-toss-red' : ''}`}><Heart size={12} className={news.likes > 0 ? 'fill-current' : ''}/> {news.likes || 0}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-5 flex-1 min-w-0">
              {/* Desktop Meta */}
              <div className="hidden sm:flex items-center gap-4 shrink-0">
                <span className={`w-[115px] text-[13px] font-extrabold tracking-wide text-center px-2 py-1.5 rounded-lg truncate border ${
                    (news.category === '동탄 임장/분석' || news.category === '임장기') ? 'bg-[#e8f8f0] text-[#00a06c] border-[#e8f8f0]' :
                    (news.category === '부동산 고민상담' || news.category === '부동산 기초') ? 'bg-[#ffe8e8] text-toss-red border-[#ffe8e8]' :
                    (news.category === '동탄 청약/대출' || news.category === '정책자금 대출') ? 'bg-toss-blue-light text-toss-blue border-toss-blue-light' :
                    (news.category === '동탄 교통/상권' || news.category === '인프라') ? 'bg-[#f4e8ff] text-[#9b51e0] border-[#f4e8ff]' :
                    (news.category === '동탄 육아/교육' || news.category === '어린이집/유치원' || news.category === '학원/교육') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    (news.category === '실시간 오픈런/정보' || news.category === '소아과/병원' || news.category === '실시간 제보') ? 'bg-rose-50 text-rose-500 border-rose-100' :
                    (news.category === '동탄 벼룩/나눔' || news.category === '나눔/벼룩' || news.category === '공동구매') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-body text-secondary border-body'
                  }`}>
                    {news.category === '임장기' ? '동탄 임장/분석' : 
                     news.category === '부동산 기초' ? '부동산 고민상담' :
                     news.category === '정책자금 대출' ? '동탄 청약/대출' :
                     news.category === '인프라' ? '동탄 교통/상권' : 
                     (news.category || '기타')}
                </span>
                <span className="w-[80px] text-[14px] font-semibold text-tertiary truncate text-center">{news.author || '매니저'}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[14.5px] sm:text-[16px] font-bold text-primary leading-[1.5] sm:leading-normal group-hover:text-toss-blue transition-colors truncate">
                  {news.title}
                </p>
              </div>

              {/* Desktop Right Meta: Date, Views, Likes */}
              <div className="hidden sm:flex items-center gap-4 shrink-0 pl-2">
                <span className="text-[13px] font-medium text-tertiary w-[50px] text-right">{news.meta?.split('·')[0]?.trim() || formatRelativeTime(news.createdAt)}</span>
                <div className="flex items-center gap-3 text-[13px] font-semibold text-tertiary w-[80px] justify-end">
                  <span className="flex items-center gap-1"><Eye size={14}/> {news.views || 0}</span>
                  <span className={`flex items-center gap-1 ${news.likes > 0 ? 'text-toss-red' : ''}`}><Heart size={14} className={news.likes > 0 ? 'fill-current' : ''}/> {news.likes || 0}</span>
                </div>
              </div>
            </div>

          </div>
        </Fragment>
        );
      })}

      {hasMore && (
        <div ref={observerTarget} className="py-8 flex justify-center text-tertiary">
          {isLoadingMore ? <Loader2 className="animate-spin w-6 h-6" /> : "스크롤하여 더 보기"}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPostId && (
        <LoungeModalBackdrop onClose={() => { window.location.hash = ''; }}>
          <LoungeDetailClient postId={selectedPostId} isModal={true} />
        </LoungeModalBackdrop>
      )}

      {/* Notice Detail Modal */}
      {selectedNoticeId && selectedNotice && (
        <LoungeModalBackdrop onClose={handleCloseNoticeModal}>
          <div className="bg-surface rounded-2xl w-full max-w-2xl mx-auto overflow-hidden shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-border flex justify-between items-start gap-4 bg-emerald-500/5">
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded">
                    {selectedNotice.dept}
                  </span>
                  <span className="text-[12px] font-bold text-tertiary">
                    {selectedNotice.date}
                  </span>
                </div>
                <h2 className="text-[18px] sm:text-[20px] font-black text-primary leading-snug tracking-tight">
                  {selectedNotice.title}
                </h2>
              </div>
              <button 
                onClick={handleCloseNoticeModal}
                className="text-tertiary hover:text-primary p-1 bg-body rounded-full transition-colors flex items-center justify-center shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 flex flex-col gap-6">
              {/* 원문 이동 및 공유 버튼 */}
              <div className="flex items-center gap-3">
                <a 
                  href={`/api/bypass-notice?url=${encodeURIComponent((selectedNotice.url || '').trim())}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer active:scale-[0.98] text-[14px]"
                >
                  <ExternalLink size={16} /> 원문 고시공고 사이트 이동
                </a>
                <button
                  onClick={() => handleShareNotice(selectedNotice)}
                  className="px-5 py-3 bg-[#fee500] hover:bg-[#fddc00] text-[#191919] font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] text-[14px]"
                >
                  <Share2 size={16} /> 카카오톡 공유
                </button>
              </div>

              {/* D-VIEW AI Insight Section */}
              <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex flex-col gap-2">
                <h4 className="text-[13px] font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  💡 D-VIEW 부동산 분석 팁
                </h4>
                <p className="text-[13px] text-emerald-950/80 dark:text-emerald-200/90 leading-relaxed font-bold">
                  본 고시공고는 동탄 권역의 개발 및 행정 변동과 관련이 깊은 소식입니다. 
                  동탄역세권 대시보드의 실거래 추이 및 평수 필터링을 사용하여 본 공고가 주는 개발 호재의 매매 가치 영향을 확인해보세요.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Link 
                    href="/" 
                    className="text-[12px] font-extrabold text-[#00a06c] hover:underline flex items-center gap-1"
                  >
                    데이터 랩 실거래 대시보드로 이동 ➔
                  </Link>
                </div>
              </div>

              {/* D-VIEW Premium Content */}
              <div className="flex flex-col gap-3 border-t border-border pt-5">
                <h3 className="text-[14px] font-extrabold text-primary">D-VIEW 추천 콘텐츠</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/?apt=동탄역 롯데캐슬" className="p-3.5 border border-border bg-body hover:bg-body/80 rounded-xl transition-all group">
                    <div className="text-[12px] font-bold text-tertiary">실시간 인기 단지</div>
                    <div className="text-[14px] font-extrabold text-secondary group-hover:text-primary transition-colors mt-1">동탄역 롯데캐슬 상세분석 ➔</div>
                  </Link>
                  <Link href="/engineering" className="p-3.5 border border-border bg-body hover:bg-body/80 rounded-xl transition-all group">
                    <div className="text-[12px] font-bold text-tertiary">기술 성과서</div>
                    <div className="text-[14px] font-extrabold text-secondary group-hover:text-primary transition-colors mt-1">엔지니어링 리포트 보기 ➔</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </LoungeModalBackdrop>
      )}
    </div>
  );
}
