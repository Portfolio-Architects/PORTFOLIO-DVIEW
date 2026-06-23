'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { MessageSquare, Eye, Heart, Loader2, ChevronDown, Share2, ExternalLink, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useSWRInfinite from 'swr/infinite';

const MarkdownViewer = dynamic(() => import('@/components/ui/MarkdownViewer'), {
  ssr: true,
  loading: () => <div className="w-full h-24 bg-body/20 rounded-2xl animate-pulse" />
});
import { safeReload } from '@/lib/utils/safeReload';
import { logger } from '@/lib/services/logger';

const LoungeDetailClient = dynamic(() => import('@/components/LoungeDetailClient').catch(err => {
  logger.warn('LoungeFeedClient.dynamic', 'LoungeDetailClient Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('LoungeDetailClient');
  return { default: () => null };
}), { ssr: false });
const AptStoriesWidget = dynamic(() => import('@/components/AptStoriesWidget').catch(err => {
  logger.warn('LoungeFeedClient.dynamic', 'AptStoriesWidget Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('AptStoriesWidget');
  return { default: () => null };
}), { ssr: false });
import LoungeModalBackdrop from '@/components/LoungeModalBackdrop';
import { NativeAdPlaceholder } from '@/components/ui/NativeAdPlaceholder';
import { usePWA } from '@/components/pwa/PWAProvider';
import { shareLocalNoticeToKakao } from '@/lib/utils/kakaoShare';

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
  commentCount: number;
  createdAt: number;
  apartmentName?: string;
}

interface LocalNoticeItem {
  id: string;
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
  content?: string; // AI 분석 본문 마크다운 (신설)
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
  
  const nowMs = Date.now();
  let timeMs = 0;
  
  if (typeof dateInput === 'number') {
    timeMs = dateInput;
  } else if (dateInput instanceof Date) {
    timeMs = dateInput.getTime();
  } else {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '방금 전';
    timeMs = d.getTime();
  }
  
  const diffMs = Math.max(0, nowMs - timeMs);
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  
  const date = new Date(timeMs);
  const now = new Date(nowMs);
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

const LoungeFeedClient = React.memo(function LoungeFeedClient({ initialPosts, currentTab }: LoungeFeedClientProps) {
  const { showToast } = usePWA();

  const getCategoryChipStyles = (category: string) => {
    switch (category) {
      case '아파트 이야기':
        return 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30';
      case '동탄 임장/분석':
      case '임장기':
        return 'bg-[#e8f8f0] text-[#00a06c] dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30';
      case '부동산 고민상담':
      case '부동산 기초':
      case '부동산':
        return 'bg-red-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400 border border-red-100/50 dark:border-rose-900/20';
      case '동탄 청약/대출':
      case '정책자금 대출':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20';
      case '동탄 교통/상권':
      case '인프라':
      case '교통':
        return 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/20';
      case '동탄 육아/교육':
      case '어린이집/유치원':
      case '학원/교육':
      case '교육':
        return 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/20';
      case '실시간 오픈런/정보':
      case '소아과/병원':
      case '실시간 제보':
        return 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/20';
      case '동탄 벼룩/나눔':
      case '나눔/벼룩':
      case '공동구매':
        return 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/20 dark:text-cyan-400 border border-cyan-100/50 dark:border-cyan-900/20';
      default:
        return 'bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400 border border-gray-100/50';
    }
  };
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<Post[]>(
    getPostsKey,
    postsFetcher,
    {
      fallbackData: initialPosts ? [initialPosts] : undefined,
      revalidateFirstPage: false,
      persistSize: true,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 180000
    }
  );

  const posts = useMemo(() => {
    return data ? data.flat() : [];
  }, [data]);

  const hotPosts = useMemo(() => {
    const now = Date.now();
    const postsWithScore = posts.map(post => {
      const rawCreatedAt = post.createdAt;
      const createdAt = typeof rawCreatedAt === 'number' && !isNaN(rawCreatedAt) 
        ? rawCreatedAt 
        : (typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt).getTime() : now);
      
      const safeCreatedAt = isNaN(createdAt) ? now : createdAt;
      const ageDays = Math.max(0, (now - safeCreatedAt) / (1000 * 60 * 60 * 24));
      const score = (Number(post.views || 0) + Number(post.likes || 0) * 5 + Number(post.commentCount || 0) * 10) / Math.pow(ageDays + 1, 1.2);
      return { post, score: isNaN(score) ? 0 : score };
    });

    return postsWithScore
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(item => item.post);
  }, [posts]);

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

  const [activeSubCategory, setActiveSubCategory] = useState<'all' | 'city' | 'rail' | 'town' | 'culture'>('all');
  const [activeDongFilter, setActiveDongFilter] = useState<string>('all');

  useEffect(() => {
    setVisibleNoticesCount(20);
  }, [activeSubCategory, activeDongFilter]);

  useEffect(() => {
    let isMounted = true;
    let idleId: number | null = null;
    const checkParams = () => {
      if (!isMounted) return;
      // Check query parameter
      const params = new URLSearchParams(window.location.search);
      const noticeParam = params.get('notice');
      const postParam = params.get('post');
      
      const postMatch = window.location.hash.match(/#post=([^&]+)/);
      const noticeMatch = window.location.hash.match(/#notice=([^&]+)/);
      
      if (postMatch) {
        setSelectedPostId(decodeURIComponent(postMatch[1]));
        setSelectedNoticeId(null);
      } else if (postParam) {
        setSelectedPostId(postParam);
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
      } else if (window.location.hash === '#lounge-notices-culture') {
        setActiveSubCategory('culture');
      }
    };
    
    checkParams();
    window.addEventListener('hashchange', checkParams, { passive: true });

    const preloadDetail = () => {
      if (!isMounted) return;
      import('@/components/LoungeDetailClient').catch(() => {});
    };
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      if ('requestIdleCallback' in window) {
        idleId = (window as any).requestIdleCallback(preloadDetail, { timeout: 3000 });
      } else {
        preloadTimeoutRef.current = setTimeout(preloadDetail, 2000);
      }
    }

    return () => {
      isMounted = false;
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      window.removeEventListener('hashchange', checkParams);
      if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (currentTab === '동탄 부동산 뉴스' && newsData.length === 0) {
      setNewsLoading(true);
      fetch("/api/macro/news", { signal: controller.signal })
        .then(res => res.json())
        .then((json: { status: string; data?: NewsItem[] }) => {
          if (active && json.status === "success" && json.data) {
            setNewsData(json.data);
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          logger.warn('LoungeFeedClient.useNewsEffect', 'Failed to fetch news', undefined, err);
        })
        .finally(() => {
          if (active) setNewsLoading(false);
        });
    }
    return () => {
      active = false;
      controller.abort();
    };
  }, [currentTab, newsData.length]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if ((currentTab === '동탄구 소식' || selectedNoticeId) && noticesData.length === 0) {
      // 1. Fetch Local Events (Static JSON, extremely fast)
      fetch("/data/local-events.json", { signal: controller.signal })
        .then(res => res.json())
        .catch(() => [])
        .then((eventsJson: any[]) => {
          if (!active) return;
          const mappedEvents: LocalNoticeItem[] = eventsJson.map((event: any) => ({
            id: event.id,
            title: `[${event.category}] ${event.title} (${event.time})`,
            url: event.link || '#',
            dept: event.location,
            date: event.date,
            isDongtan: true,
            source: 'culture',
            content: `### 📅 행사 시간\n${event.time}\n\n### 📍 개최 장소\n${event.location}\n\n### 💡 D-VIEW 추천 꿀팁\n${event.tip}`
          }));

          setNoticesData(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const filteredNew = mappedEvents.filter(e => !existingIds.has(e.id));
            return [...prev, ...filteredNew].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          });
        })
        .catch(err => {
          if (err.name !== 'AbortError') logger.warn('LoungeFeedClient.useNoticesEffect', 'Failed to fetch local events', undefined, err);
        });

      // 2. Fetch Local Notices (Heavier DB API)
      setNoticesLoading(true);
      fetch("/api/local-notices", { signal: controller.signal })
        .then(res => res.json())
        .catch(() => ({ notices: [] }))
        .then((noticesJson: any) => {
          if (!active) return;
          let mergedNotices: LocalNoticeItem[] = [];
          if (noticesJson && noticesJson.notices) {
            mergedNotices = [...noticesJson.notices];
          }

          setNoticesData(prev => {
            const noticeIds = new Set(mergedNotices.map(n => n.id));
            const nonNoticeItems = prev.filter(p => !noticeIds.has(p.id));
            return [...nonNoticeItems, ...mergedNotices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          });

          if (noticesJson && noticesJson.lastUpdated) {
            setLastUpdatedTime(noticesJson.lastUpdated);
          }
        })
        .catch(err => {
          if (active && err.name !== 'AbortError') {
            logger.warn('LoungeFeedClient.useNoticesEffect', 'Failed to fetch notices', undefined, err);
          }
        })
        .finally(() => {
          if (active) setNoticesLoading(false);
        });
    }
    return () => {
      active = false;
      controller.abort();
    };
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
      { threshold: 0.01, rootMargin: '200px' }
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
      } else if (activeSubCategory === 'culture') {
        if (notice.source !== 'culture') return false;
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
      }).catch(err => logger.error('LoungeFeedClient.handleShareNotice', 'Share failed', undefined, err));
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("소식 공유 링크가 클립보드에 복사되었습니다!");
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

  const handleClosePostModal = () => {
    if (window.location.search.includes('post=')) {
      const newUrl = window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, '', newUrl);
    }
    window.location.hash = '';
    setSelectedPostId(null);
    mutate();
  };

  const filteredPosts = useMemo(() => {
    if (currentTab === '모든 이야기') return posts;
    if (currentTab === '동탄 부동산 뉴스' || currentTab === '동탄구 소식') return [];
    const targetCategories = CATEGORY_MAP[currentTab] || [currentTab];
    return posts.filter((p) => targetCategories.includes(p.category || '기타'));
  }, [posts, currentTab]);

  const autoFetchCountRef = useRef(0);

  // Reset auto-fetch limit when current tab changes to prevent infinite database fetch loops
  useEffect(() => {
    autoFetchCountRef.current = 0;
  }, [currentTab]);

  // Auto-fetch if the current category has no posts but there are more posts in the DB (limit to 3 runs to prevent infinite loops)
  useEffect(() => {
    if (filteredPosts.length === 0 && hasMore && !isLoadingMore && autoFetchCountRef.current < 3) {
      const timer = setTimeout(() => {
        autoFetchCountRef.current += 1;
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
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-border bg-surface hover:bg-body hover:border-[#008262]/30 dark:hover:border-[#00d29d]/30 transition-all cursor-pointer group w-full text-left"
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
                      <p className="text-[14.5px] sm:text-[16px] font-bold text-primary leading-[1.5] sm:leading-normal group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors truncate">
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
            { id: 'town', label: '동네행정' },
            { id: 'culture', label: '문화·행사' }
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
            filteredNotices.slice(0, visibleNoticesCount).map((notice, idx) => {
              const isCulture = notice.source === 'culture';
              if (isCulture) {
                const isLecture = notice.title.includes('[강좌]');
                
                // D-Day 계산 헬퍼
                const getDDayText = (dateStr: string) => {
                  const target = new Date(dateStr);
                  const today = new Date('2026-06-07'); // current date in metadata is 2026-06-07
                  today.setHours(0, 0, 0, 0);
                  target.setHours(0, 0, 0, 0);
                  const diff = target.getTime() - today.getTime();
                  const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  if (diffDays === 0) return { text: isLecture ? '접수 마감' : '오늘 개최', color: 'bg-rose-500 text-white border-rose-600' };
                  if (diffDays > 0) return { text: isLecture ? `접수 D-${diffDays}` : `D-${diffDays}`, color: 'bg-emerald-500 text-white border-emerald-600 animate-pulse' };
                  return { text: isLecture ? '접수 종료' : '종료됨', color: 'bg-gray-400 text-white border-gray-500' };
                };
                
                const dday = getDDayText(notice.date);
                const displayTitle = isLecture 
                  ? notice.title.replace(/\[강좌\]\s*/, '') 
                  : notice.title;
                const displayDesc = isLecture
                  ? '동탄 주민자치센터에서 운영하는 생활밀착형 교양/문화/체육 강좌입니다. 정원 내 선착순 수강 신청으로 저렴하게 고품질 교육 혜택을 이용하세요.'
                  : '본 소식은 동탄 권역의 대표 문화·축제 라이프스타일 정보입니다. 무료 이용 및 인근 주차가 가능하며, 가족 단위 방문에 적합합니다. D-VIEW에서 일정을 공유해보세요!';
                const displayPrice = isLecture ? '무료 ~ 3만원 선' : '무료';
                const displayDept = isLecture ? `${notice.dept} 주민센터` : notice.dept;
                const displayUrlLabel = isLecture ? '화성시 통합예약 이동' : '원문 고시공고 이동';
                
                return (
                  <div
                    key={notice.id}
                    onClick={() => {
                      window.location.hash = `notice=${notice.id}`;
                    }}
                    className={`flex flex-col gap-4 p-5 rounded-3xl border transition-all cursor-pointer w-full group relative overflow-hidden text-left ${
                      isLecture 
                        ? 'border-teal-100/80 dark:border-teal-900/30 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 dark:from-teal-950/10 dark:to-emerald-950/10 hover:border-teal-300 dark:hover:border-teal-700/50 hover:shadow-[0_12px_24px_rgba(20,184,166,0.06)]' 
                        : 'border-emerald-100/80 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/10 dark:to-teal-950/10 hover:border-emerald-300 dark:hover:border-emerald-700/50 hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)]'
                    }`}
                  >
                    {/* Decorative Blob */}
                    <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500 ${
                      isLecture ? 'bg-teal-500/10 dark:bg-teal-500/20' : 'bg-emerald-500/10 dark:bg-emerald-500/20'
                    }`} />
                    
                    {/* Top Row: D-Day & Meta */}
                    <div className="flex items-center justify-between gap-3 z-10">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg border ${dday.color} shadow-sm uppercase tracking-wider`}>
                          {dday.text}
                        </span>
                        <span className={`text-[11.5px] font-extrabold px-2 py-1 rounded-lg border ${
                          isLecture 
                            ? 'text-teal-600 bg-teal-100/50 dark:bg-teal-950/30 dark:text-teal-400 border-teal-100/30' 
                            : 'text-emerald-600 bg-emerald-100/50 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100/30'
                        }`}>
                          {isLecture ? '주민센터 강좌' : notice.dept}
                        </span>
                      </div>
                      <span className="text-[12px] font-bold text-tertiary">
                        {isLecture ? `접수개시: ${notice.date}` : `행사일: ${notice.date}`}
                      </span>
                    </div>

                    {/* Middle: Title & Description */}
                    <div className="flex flex-col gap-1.5 z-10">
                      <h4 className={`text-[15.5px] sm:text-[17px] font-black leading-snug tracking-tight transition-colors ${
                        isLecture ? 'group-hover:text-teal-600' : 'group-hover:text-emerald-600'
                      }`}>
                        {displayTitle}
                      </h4>
                      <p className="text-[12.5px] text-secondary font-medium leading-relaxed">
                        {displayDesc}
                      </p>
                    </div>

                    {/* Bottom: Info Grid & Share Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4 mt-1 z-10">
                      <div className="flex items-center gap-4 text-[12px] font-bold text-secondary">
                        <span className="flex items-center gap-1">
                          💵 수강료: <strong className={isLecture ? 'text-teal-600' : 'text-emerald-600'}>{displayPrice}</strong>
                        </span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="flex items-center gap-1">
                          📍 주관: <strong>{displayDept}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => shareLocalNoticeToKakao(notice)}
                          className="px-3.5 py-2 bg-[#fee500] hover:bg-[#fddc00] text-[#191919] text-[11.5px] font-black rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          카카오톡 공유
                        </button>
                        <button
                          onClick={() => handleShareNotice(notice)}
                          className="px-3.5 py-2 bg-surface hover:bg-body border border-border text-secondary text-[11.5px] font-black rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          링크 복사
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
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
              )
            })
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
      {/* 실시간 아파트 이야기 한줄평 Widget */}
      {currentTab !== '동탄 부동산 뉴스' && currentTab !== '동탄구 소식' && (
        <AptStoriesWidget />
      )}

      {/* 실시간 인기 토크 Widget */}
      {currentTab !== '동탄 부동산 뉴스' && currentTab !== '동탄구 소식' && hotPosts.length > 0 && (
        <div className="bg-gradient-to-br from-[#e8f8f5] to-emerald-500/5 dark:from-[#082f27] dark:to-emerald-500/10 border border-emerald-500/15 rounded-3xl p-5 mb-2 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-[13.5px] font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
              🔥 실시간 동탄 핫이슈 단지 토크
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hotPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => { window.location.hash = `post=${post.id}`; }}
                className="flex items-start gap-3 p-3.5 bg-surface hover:bg-body border border-border/60 hover:border-emerald-500/20 rounded-2xl cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/30 group-hover:bg-[#008262] transition-colors">
                  <Sparkles size={14} className="text-[#008262] dark:text-[#00d29d] group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-[#008262] dark:text-[#00d29d] rounded-md">
                      {post.category}
                    </span>
                    <span className="text-[11px] font-semibold text-tertiary font-sans">
                      {post.author || '매니저'}
                    </span>
                  </div>
                  <h4 className="text-[13.5px] sm:text-[14px] font-bold text-primary truncate group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-tertiary">
                    <span className="flex items-center gap-0.5"><Eye size={11}/> {post.views}</span>
                    <span className="flex items-center gap-0.5 text-rose-500"><Heart size={11} className="fill-current"/> {post.likes}</span>
                    <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"><MessageSquare size={11}/> {post.commentCount || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div onClick={(e) => e.stopPropagation()} className="w-full py-2">
                <NativeAdPlaceholder 
                  location={`라운지 피드 중간 광고 ${Math.floor(index / 4)}`} 
                  adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOUNGE_FEED || "test-lounge-feed-slot"} 
                  isCompact={true}
                />
              </div>
            )}
            <div 
              onClick={() => {
                if (news.category === '아파트 이야기' && news.apartmentName) {
                  window.location.href = `/#apt=${encodeURIComponent(news.apartmentName)}`;
                } else {
                  window.location.hash = `post=${news.id}`;
                }
              }} 
              className="flex gap-4 p-5 rounded-2xl border border-border/60 bg-surface/80 dark:bg-surface/60 backdrop-blur-md hover:bg-body/60 dark:hover:bg-body/40 hover:border-emerald-500/20 dark:hover:border-emerald-500/30 hover:shadow-[0_12px_24px_rgba(0,130,98,0.04)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer group w-full text-left"
            >
              {/* Left Content Area */}
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                {/* Meta info row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide ${getCategoryChipStyles(news.category)}`}>
                    {news.category === '임장기' ? '동탄 임장/분석' : 
                     news.category === '부동산 기초' ? '부동산 고민상담' :
                     news.category === '정책자금 대출' ? '동탄 청약/대출' :
                     news.category === '인프라' ? '동탄 교통/상권' : 
                     (news.category || '기타')}
                  </span>
                  <span className="text-[12px] font-bold text-secondary font-sans">{news.author || '익명'}</span>
                  <span className="text-[11px] text-tertiary font-medium">{news.meta?.split('·')[0]?.trim() || formatRelativeTime(news.createdAt)}</span>
                </div>

                {/* Title & Comment Count */}
                <div className="flex items-start gap-2">
                  <h3 className="text-[15.5px] sm:text-[17px] font-black text-primary leading-snug group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors line-clamp-1 flex-1">
                    {news.title}
                  </h3>
                  {news.commentCount > 0 && (
                    <span className="text-[11px] sm:text-[11.5px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-md shrink-0 border border-emerald-100/40">
                      {news.commentCount}
                    </span>
                  )}
                </div>

                {/* Summary (1~2 lines) */}
                {news.summary && (
                  <p className="text-[13px] sm:text-[13.5px] text-secondary font-medium leading-relaxed line-clamp-2">
                    {news.summary}
                  </p>
                )}

                {/* Views & Likes */}
                <div className="flex items-center gap-3 mt-1 text-[12px] font-bold text-tertiary">
                  <span className="flex items-center gap-0.5"><Eye size={12.5}/> {news.views || 0}</span>
                  <span className={`flex items-center gap-0.5 ${news.likes > 0 ? 'text-rose-500' : ''}`}><Heart size={12.5} className={news.likes > 0 ? 'fill-current' : ''}/> {news.likes || 0}</span>
                </div>
              </div>

              {/* Right Thumbnail Area (Optional) */}
              {news.imageUrl && (
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative rounded-xl overflow-hidden border border-border/50 bg-body/20">
                  <img 
                    src={news.imageUrl} 
                    alt={news.title} 
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
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
        <LoungeModalBackdrop onClose={handleClosePostModal}>
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
            <div className="p-5 sm:p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
              {/* 만약 AI 리포트 본문(content)이 존재하면 마크다운 뷰어 노출 */}
              {selectedNotice.content ? (
                <div className="flex flex-col gap-5">
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-body/30 border border-border/40 rounded-2xl p-5 sm:p-6 font-semibold leading-relaxed text-[13.5px] text-secondary">
                    <MarkdownViewer content={selectedNotice.content} />
                  </div>
                  
                  {/* AI 리포트 액션 유도 버튼 */}
                  <div className="flex flex-col sm:flex-row items-stretch gap-3 border-t border-border pt-4">
                    <Link 
                      href="/?calc=sell_timing" 
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer active:scale-[0.98] text-[13.5px]"
                    >
                      <Sparkles size={16} /> AI 매도 적합성(호구 지수) 계산기 실행
                    </Link>
                    <Link 
                      href="/?tab=gap" 
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-body hover:bg-body/80 border border-border text-secondary font-extrabold rounded-xl transition-all cursor-pointer active:scale-[0.98] text-[13.5px]"
                    >
                      동탄 갭투자 랭킹 대시보드 바로가기
                    </Link>
                  </div>

                  {/* 공유 행 */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => shareLocalNoticeToKakao(selectedNotice)}
                      className="flex-1 px-4 py-3.5 bg-[#fee500] hover:bg-[#fddc00] text-[#191919] font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] text-[13.5px]"
                    >
                      <Share2 size={16} /> 리포트 카카오톡 공유
                    </button>
                    <button
                      onClick={() => handleShareNotice(selectedNotice)}
                      className="flex-1 px-4 py-3.5 bg-body hover:bg-body/80 border border-border text-secondary font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] text-[13.5px]"
                    >
                      <Share2 size={16} /> 링크 복사
                    </button>
                  </div>
                </div>
              ) : (
                // 기존 일반 고시공고 카드 구조
                <div className="flex flex-col gap-6 w-full">
                  {/* 원문 이동 및 공유 버튼 */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <a 
                      href={`/api/bypass-notice?url=${encodeURIComponent((selectedNotice.url || '').trim())}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer active:scale-[0.98] text-[14px]"
                    >
                      <ExternalLink size={16} /> {selectedNotice.title.includes('[강좌]') ? '주민자치센터 수강 신청 바로가기' : '원문 고시공고 사이트 이동'}
                    </a>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => shareLocalNoticeToKakao(selectedNotice)}
                        className="flex-1 sm:flex-none px-4 py-3 bg-[#fee500] hover:bg-[#fddc00] text-[#191919] font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] text-[14px]"
                      >
                        <Share2 size={16} /> 카카오톡 공유
                      </button>
                      <button
                        onClick={() => handleShareNotice(selectedNotice)}
                        className="flex-1 sm:flex-none px-4 py-3 bg-body hover:bg-body/80 border border-border text-secondary font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] text-[14px]"
                      >
                        <Share2 size={16} /> 링크 복사
                      </button>
                    </div>
                  </div>

                  {/* D-VIEW AI Insight Section */}
                  <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex flex-col gap-2 w-full">
                    <h4 className="text-[13px] font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      💡 D-VIEW {selectedNotice.title.includes('[강좌]') ? '정주 여건 분석 팁' : '부동산 분석 팁'}
                    </h4>
                    <p className="text-[13px] text-emerald-950/80 dark:text-emerald-200/90 leading-relaxed font-bold">
                      {selectedNotice.title.includes('[강좌]') 
                        ? '풍부한 주민자치센터 강좌와 문화 혜택은 실거주 만족도를 높이고 안정적인 정주 여건을 조성하는 주요 인프라 자산입니다. D-VIEW 입지 분석 탭에서 인근 어린이집, 유치원 등 보육 환경과 통학 안정성 점수를 연계하여 종합적인 거주 가치를 판단해보세요.'
                        : '본 고시공고는 동탄 권역의 개발 및 행정 변동과 관련이 깊은 소식입니다. 동탄역세권 대시보드의 실거래 추이 및 평수 필터링을 사용하여 본 공고가 주는 개발 호재의 매매 가치 영향을 확인해보세요.'}
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
                </div>
              )}

              {/* D-VIEW Premium Content */}
              <div className="flex flex-col gap-3 border-t border-border pt-5">
                <h3 className="text-[14px] font-extrabold text-primary">D-VIEW 추천 콘텐츠</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/?apt=동탄역 롯데캐슬" className="p-3.5 border border-border bg-body hover:bg-body/80 rounded-xl transition-all group">
                    <div className="text-[12px] font-bold text-tertiary">실시간 인기 단지</div>
                    <div className="text-[14px] font-extrabold text-secondary group-hover:text-primary transition-colors mt-1">동탄역 롯데캐슬 상세분석 ➔</div>
                  </Link>
                  <Link href="/?calc=sell_timing" className="p-3.5 border border-border bg-body hover:bg-body/80 rounded-xl transition-all group">
                    <div className="text-[12px] font-bold text-tertiary">부동산 가치 계산기</div>
                    <div className="text-[14px] font-extrabold text-secondary group-hover:text-primary transition-colors mt-1">AI 매도 타이밍 분석 ➔</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </LoungeModalBackdrop>
      )}
    </div>
  );
});

LoungeFeedClient.displayName = 'LoungeFeedClient';
export default LoungeFeedClient;
