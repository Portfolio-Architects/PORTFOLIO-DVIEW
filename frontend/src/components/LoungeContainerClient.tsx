'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import useSWR from 'swr';
import PageHeroHeader from './PageHeroHeader';
import { safeReload } from '@/lib/utils/safeReload';
import { logger } from '@/lib/services/logger';
import { 
  MessageSquare, 
  Newspaper, 
  Megaphone, 
  FileText, 
  Train, 
  MapPin, 
  Sparkles, 
  X, 
  ArrowUpRight, 
  ExternalLink, 
  ChevronDown 
} from 'lucide-react';

const LoungeFeedSkeleton = () => (
  <div className="w-full flex flex-col gap-4 animate-pulse min-h-[400px]">
    {[1, 2, 3].map(i => (
      <div key={i} className="w-full h-[110px] bg-body/20 dark:bg-surface/5 rounded-2xl border border-border/40" />
    ))}
  </div>
);

const LoungeComposeSkeleton = () => (
  <div className="w-full h-[80px] bg-body/20 dark:bg-surface/5 rounded-2xl border border-border/40 animate-pulse mt-4" />
);

const LoungeFeedClient = dynamic(() => import('@/components/LoungeFeedClient').catch(err => {
  logger.warn('LoungeContainerClient.dynamic', 'LoungeFeedClient Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('LoungeFeedClient');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <LoungeFeedSkeleton />
});

const LoungeComposeClient = dynamic(() => import('@/components/LoungeComposeClient').catch(err => {
  logger.warn('LoungeContainerClient.dynamic', 'LoungeComposeClient Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('LoungeComposeClient');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <LoungeComposeSkeleton />
});

const MarkdownViewer = dynamic(() => import('@/components/ui/MarkdownViewer'), {
  ssr: true,
  loading: () => <div className="w-full h-24 bg-body/20 rounded-2xl animate-pulse" />
});

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
  createdAt: number | null;
  apartmentName?: string;
}

interface NoticeItem {
  id: string;
  title?: string;
  url?: string;
  dept?: string;
  date: string;
  isDongtan: boolean;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
  createdAt?: string;
  content?: string;
}

interface NewsItem {
  id: number;
  category: string;
  sub: string;
  title: string;
  link: string;
  pubDate: string;
}

interface LoungeContainerClientProps {
  initialPosts: Post[];
  initialNews?: NewsItem[];
  initialNotices?: NoticeItem[];
  searchParams?: { notice?: string; tab?: string };
  onRequestLogin?: (message: string) => void;
}

// Format date string to display nicely
const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  } catch {
    return dateStr;
  }
};

// Get source badge styling and icon for local notices
const getNoticeSourceDetails = (source: string | undefined) => {
  switch (source) {
    case 'gosi':
      return {
        label: '고시공고',
        icon: FileText,
        bgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50',
      };
    case 'rail':
      return {
        label: '교통/철도',
        icon: Train,
        bgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/50',
      };
    case 'dong':
      return {
        label: '동네행정',
        icon: MapPin,
        bgClass: 'bg-[#e8f8f0] text-[#00a06c] dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/50',
      };
    case 'culture':
      return {
        label: '문화/축제',
        icon: Sparkles,
        bgClass: 'bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/50',
      };
    default:
      return {
        label: '시정소식',
        icon: Megaphone,
        bgClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-100/50',
      };
  }
};

// Get category label & color for news
const getNewsCategoryDetails = (category: string) => {
  switch (category) {
    case 'POLICY':
      return { label: '부동산 정책', bgClass: 'bg-red-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400 border border-red-100/50' };
    case 'INFRASTRUCTURE':
      return { label: '교통/개발', bgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/50' };
    case 'COMMERCIAL':
      return { label: '상권/기업', bgClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/50' };
    case 'COMMUNITY':
      return { label: '학군/주거', bgClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100/50' };
    default:
      return { label: '시장 동향', bgClass: 'bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400 border border-gray-100/50' };
  }
};

const LoungeContainerClient = React.memo(function LoungeContainerClient({ 
  initialPosts,
  initialNews = [],
  initialNotices = [],
  searchParams,
  onRequestLogin,
}: LoungeContainerClientProps) {
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();
  
  // Localize activeTab state to prevent Next.js server page transitions and Suspense skeletal flickering
  const [activeTab, setActiveTabState] = useState<'talk' | 'news' | 'notices'>('talk');

  // Sync tab state when search parameters change (back navigation, initial mount etc.)
  useEffect(() => {
    const tabParam = searchParamsHook?.get('tab');
    if (tabParam === 'talk' || tabParam === 'news' || tabParam === 'notices') {
      setActiveTabState(tabParam);
    } else {
      setActiveTabState('talk');
    }
  }, [searchParamsHook]);

  const handleTabClick = (tabId: 'talk' | 'news' | 'notices') => {
    setActiveTabState(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const noticeId = searchParamsHook.get('notice');

  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [visibleNewsCount, setVisibleNewsCount] = useState(12);
  const [visibleNoticesCount, setVisibleNoticesCount] = useState(12);
  const [activeNewsSubTab, setActiveNewsSubTab] = useState<'industry' | 'realestate'>('industry');

  // Client-side fetch fallback when initial data is not passed (e.g. when rendered on the main page)
  const { data: clientNoticesData } = useSWR<{ notices: NoticeItem[]; lastUpdated?: string }>('/api/local-notices', (url: string) => fetch(url).then(res => res.json()), {
    fallbackData: (initialNotices && initialNotices.length > 0) ? { notices: initialNotices } : undefined,
    revalidateOnFocus: false,
    dedupingInterval: 300000
  });

  const { data: clientNewsData } = useSWR<NewsItem[] | { data: NewsItem[] } | { news: NewsItem[] }>('/api/macro/news', (url: string) => fetch(url).then(res => res.json()), {
    fallbackData: (initialNews && initialNews.length > 0) ? initialNews : undefined,
    revalidateOnFocus: false,
    dedupingInterval: 300000
  });

  const notices = clientNoticesData?.notices || initialNotices || [];
  const news = useMemo(() => {
    if (Array.isArray(clientNewsData)) {
      return clientNewsData;
    }
    if (clientNewsData && typeof clientNewsData === 'object') {
      if ('data' in clientNewsData && Array.isArray(clientNewsData.data)) {
        return clientNewsData.data;
      }
      if ('news' in clientNewsData && Array.isArray(clientNewsData.news)) {
        return clientNewsData.news;
      }
    }
    return initialNews || [];
  }, [clientNewsData, initialNews]);

  const filteredNews = useMemo(() => {
    return news.filter((item: NewsItem) => {
      const isIndustry = item.category === 'COMMERCIAL' || 
        /(?:테크노밸리|지산|지식산업센터|기업|반도체|삼성전자|공장|산업|일자리|창업|스타트업|사무실|오피스|상가|상권|임대|공실|세제|과밀|이전|공동임차|소호|SOHO|금강|실리콘앨리|에이팩|skv1)/i.test(item.title) || 
        /(지산|오피스|반도체|삼성전자|현대|SK)/i.test(item.sub);
      
      return activeNewsSubTab === 'industry' ? isIndustry : !isIndustry;
    });
  }, [news, activeNewsSubTab]);

  const hotPosts = useMemo(() => {
    const now = Date.now();
    const postsWithScore = (initialPosts || []).map(post => {
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
      .slice(0, 3)
      .map(item => item.post);
  }, [initialPosts]);

  // Auto-open notice modal when noticeId query param is present
  useEffect(() => {
    if (noticeId && notices.length > 0) {
      const found = notices.find((n) => n.id === noticeId);
      if (found) {
        setSelectedNotice(found);
      }
    }
  }, [noticeId, notices]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!selectedNotice) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle === 'hidden' ? '' : originalStyle;
    };
  }, [selectedNotice]);

  useEffect(() => {
    let isMounted = true;
    let idleId: number | null = null;

    // Preload heavy lounge components on idle
    const preloadLoungeChunks = () => {
      if (!isMounted) return;
      import('@/components/LoungeFeedClient').catch(() => {});
      import('@/components/LoungeComposeClient').catch(() => {});
    };
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      if (window.requestIdleCallback) {
        idleId = window.requestIdleCallback(preloadLoungeChunks, { timeout: 3000 });
      } else {
        preloadTimeoutRef.current = setTimeout(preloadLoungeChunks, 2000);
      }
    }

    return () => {
      isMounted = false;
      if (idleId !== null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col w-full bg-transparent">
      {/* Standardized Hero Header */}
      <PageHeroHeader 
        title="D-VIEW 라운지"
        subtitleStrong="동탄 지역 부동산 커뮤니티"
        subtitleLight={
          <span className="flex items-center gap-1 flex-wrap">
            <span className="hidden sm:inline text-[#d1d6db] mr-1.5">—</span>
            <button 
              onClick={() => window.location.href = '/overview'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  window.location.href = '/overview';
                }
              }}
              className="bg-transparent border-none p-0 font-normal text-tertiary text-[13px] sm:text-[14.5px] leading-snug cursor-pointer hover:text-primary hover:underline hover:decoration-dashed transition-colors"
              title="아파트 랩 메인 지도로 이동"
            >
              현장 임장기
            </button>
            <span className="text-[#d1d6db] mx-1">·</span>
            <button 
              onClick={() => handleTabClick('news')}
              className="hover:text-primary hover:underline hover:decoration-dashed transition-colors cursor-pointer bg-transparent border-none p-0 font-normal text-tertiary text-[13px] sm:text-[14.5px] leading-snug cursor-pointer"
              title="실시간 뉴스 탭으로 이동"
            >
              부동산 뉴스
            </button>
            <span className="text-[#d1d6db] mx-1">·</span>
            <button 
              onClick={() => handleTabClick('talk')}
              className="hover:text-primary hover:underline hover:decoration-dashed transition-colors cursor-pointer bg-transparent border-none p-0 font-normal text-tertiary text-[13px] sm:text-[14.5px] leading-snug cursor-pointer"
              title="이웃 소통 탭으로 이동"
            >
              우리 동네 이야기
            </button>
          </span>
        }
      />

      <div className="max-w-[1100px] mx-auto w-full px-4 sm:px-6 pt-6 pb-16">
        {/* Segmented Tab control */}
        <div className="flex bg-body/80 p-1.5 rounded-[20px] w-full max-w-[480px] border border-border/40 mx-auto mb-8 shadow-sm backdrop-blur-md">
          {[
            { id: 'talk', label: '커뮤니티', icon: MessageSquare },
            { id: 'news', label: '실시간 뉴스', icon: Newspaper },
            { id: 'notices', label: '행정 고시공고', icon: Megaphone }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as 'talk' | 'news' | 'notices')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] text-[13px] font-extrabold transition-all duration-300 active:scale-[0.98] ${
                  isActive 
                    ? 'bg-surface text-[#c44d00] dark:text-[#ea6100] shadow-[0_4px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        {activeTab === 'talk' && (
          <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
            <div className="flex-1 w-full min-w-0">
              <LoungeFeedClient initialPosts={initialPosts} currentTab="모든 이야기" />
              <LoungeComposeClient currentTab="모든 이야기" onRequestLogin={onRequestLogin} />
            </div>
            <aside className="hidden lg:block lg:sticky lg:top-24 w-80 shrink-0 space-y-6">
              {/* 실시간 인기 토크 */}
              <div className="bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/60 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <h3 className="text-[13.5px] font-black text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                    실시간 인기 토크
                  </h3>
                </div>
                {hotPosts.length === 0 ? (
                  <p className="text-[12px] text-tertiary text-center py-4">인기 게시글이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {hotPosts.map((post) => (
                      <div
                        key={post.id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            window.location.hash = `post=${post.id}`;
                          }
                        }}
                        onClick={() => {
                          window.location.hash = `post=${post.id}`;
                        }}
                        className="w-full flex flex-col gap-1.5 p-3 bg-body hover:bg-body/85 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/60 border border-border/40 hover:border-rose-500/20 rounded-xl text-left cursor-pointer transition-all duration-300 group outline-none focus:ring-2 focus:ring-rose-500/30"
                      >
                        <span className="text-[10px] font-bold text-tertiary">
                          {post.category === '임장기' ? '동탄 임장/분석' : 
                           post.category === '부동산 고민상담' ? '부동산 고민상담' :
                           post.category === '정책자금 대출' ? '동탄 청약/대출' :
                           post.category === '인프라' ? '동탄 교통/상권' : 
                           (post.category || '기타')}
                        </span>
                        <h4 className="text-[13px] font-extrabold text-primary group-hover:text-[#c44d00] dark:group-hover:text-[#ea6100] transition-colors line-clamp-1 leading-snug">
                          {post.title}
                        </h4>
                        <span className="text-[10px] text-tertiary font-sans">
                          조회 {post.views} • 추천 {post.likes}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 오늘의 소호 매칭 현황 */}
              <div className="bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/60 rounded-3xl p-5 shadow-sm">
                <h3 className="text-[14px] font-black text-primary mb-3">오늘의 소호 매칭 현황</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-secondary font-medium">실시간 등록 공고</span>
                    <span className="text-[13px] font-black text-[#c44d00] dark:text-[#ea6100]">4건 진행 중</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-secondary font-medium">활동 중인 대표 빌딩</span>
                    <span className="text-[12px] text-tertiary">금강 IX, 현대 실리콘앨리 등</span>
                  </div>
                  <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-tertiary">
                    <span>평균 공실 해소 기간</span>
                    <span className="font-bold text-secondary">18.5일</span>
                  </div>
                </div>
              </div>

              {/* 부동산 계산기 바로가기 */}
              <div className="bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/60 rounded-3xl p-5 shadow-sm space-y-3">
                <h3 className="text-[14px] font-black text-primary">부동산 간편 계산기</h3>
                
                <a
                  href="/overview?calc=sell_timing"
                  className="flex items-center justify-between p-3 bg-body hover:bg-body/80 border border-border/40 rounded-xl transition-all duration-200 group text-left w-full outline-none focus:ring-1 focus:ring-[#c44d00]"
                >
                  <div className="flex flex-col">
                    <span className="text-[12px] font-extrabold text-secondary">AI 매도 적합성 계산기</span>
                    <span className="text-[9.5px] text-tertiary">매도 타이밍 & 적정 가격 시뮬레이션</span>
                  </div>
                  <ArrowUpRight size={14} className="text-tertiary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                <a
                  href="/overview?calc=jeonse"
                  className="flex items-center justify-between p-3 bg-body hover:bg-body/80 border border-border/40 rounded-xl transition-all duration-200 group text-left w-full outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <div className="flex flex-col">
                    <span className="text-[12px] font-extrabold text-secondary">전세 안전 진단 계산기</span>
                    <span className="text-[9.5px] text-tertiary">깡통전세 위험도 & 보증금 안전성 확인</span>
                  </div>
                  <ArrowUpRight size={14} className="text-tertiary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                <a
                  href="/overview?calc=mortgage"
                  className="flex items-center justify-between p-3 bg-body hover:bg-body/80 border border-border/40 rounded-xl transition-all duration-200 group text-left w-full outline-none focus:ring-1 focus:ring-[#004696]"
                >
                  <div className="flex flex-col">
                    <span className="text-[12px] font-extrabold text-secondary">주택 담보 대출 계산기</span>
                    <span className="text-[9.5px] text-tertiary">월 상환액 및 한도 상세 시뮬레이터</span>
                  </div>
                  <ArrowUpRight size={14} className="text-tertiary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="flex flex-col gap-2.5">
            {/* News Sub-Tabs */}
            <div className="flex justify-center mb-6 mt-1 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex bg-body/60 p-1 rounded-full border border-border/40 shadow-sm backdrop-blur-md">
                <button
                  onClick={() => {
                    setActiveNewsSubTab('industry');
                    setVisibleNewsCount(12);
                  }}
                  className={`px-5 py-1.5 rounded-full text-[12px] font-extrabold transition-all duration-300 active:scale-[0.98] ${
                    activeNewsSubTab === 'industry'
                      ? 'bg-surface text-[#c44d00] dark:text-[#ea6100] shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/5'
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  테크노밸리 & 산업
                </button>
                <button
                  onClick={() => {
                    setActiveNewsSubTab('realestate');
                    setVisibleNewsCount(12);
                  }}
                  className={`px-5 py-1.5 rounded-full text-[12px] font-extrabold transition-all duration-300 active:scale-[0.98] ${
                    activeNewsSubTab === 'realestate'
                      ? 'bg-surface text-[#c44d00] dark:text-[#ea6100] shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/5'
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  부동산 & 정책
                </button>
              </div>
            </div>

            {filteredNews.length === 0 ? (
              <div className="text-center py-16 text-tertiary font-bold text-[14px] bg-surface/40 rounded-2xl border border-dashed border-border">
                {activeNewsSubTab === 'industry' 
                  ? '등록된 동탄 테크노밸리 및 산업 관련 뉴스가 없습니다.' 
                  : '등록된 동탄 부동산 뉴스가 없습니다.'}
              </div>
            ) : (
              <>
                {filteredNews.slice(0, visibleNewsCount).map((item: NewsItem) => {
                  const cat = getNewsCategoryDetails(item.category);
                  return (
                    <a
                      key={item.id}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-5 border border-border/60 bg-surface/80 dark:bg-surface/60 backdrop-blur-md hover:bg-body/60 dark:hover:bg-body/40 hover:border-[#c44d00]/30 hover:shadow-[0_12px_24px_rgba(196,77,0,0.04)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] transition-all duration-300 transform hover:-translate-y-0.5 outline-none focus:ring-2 focus:ring-[#c44d00]/50 rounded-2xl shadow-sm relative overflow-hidden"
                    >
                      <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide ${cat.bgClass}`}>
                            {cat.label}
                          </span>
                          <span className="text-[11.5px] font-extrabold text-secondary tracking-tight">
                            {item.sub}
                          </span>
                          <span className="text-[11px] text-tertiary font-medium">
                            {formatDate(item.pubDate)}
                          </span>
                        </div>
                        <h3 className="text-[15.5px] sm:text-[17px] font-black text-primary group-hover:text-[#c44d00] dark:group-hover:text-[#ea6100] transition-colors line-clamp-2 md:line-clamp-1 leading-snug tracking-tight">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex items-center text-tertiary group-hover:text-[#c44d00] dark:group-hover:text-[#ea6100] shrink-0 self-end md:self-center">
                        <ArrowUpRight size={17} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                      </div>
                    </a>
                  );
                })}
                
                {filteredNews.length > visibleNewsCount && (
                  <button
                    onClick={() => setVisibleNewsCount(prev => prev + 12)}
                    className="w-full mt-2 py-3 text-[13px] font-extrabold text-secondary bg-surface/80 dark:bg-surface/60 border border-border/60 hover:bg-body/60 dark:hover:bg-body/40 rounded-2xl hover:border-emerald-500/20 transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
                  >
                    <span>더보기</span>
                    <span className="text-[11px] font-bold text-tertiary">
                      ({visibleNewsCount} / {filteredNews.length})
                    </span>
                    <ChevronDown size={14} className="text-secondary" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'notices' && (
          <LoungeFeedClient initialPosts={initialPosts} currentTab="동탄구 소식" />
        )}
      </div>

      {/* AI Analysis Markdown Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-sm transition-opacity duration-200 flex items-center justify-center p-4">
          <div 
            className="bg-surface border border-border/80 w-full max-w-[720px] max-h-[78vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-border/60">
              <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-[#ea6100]">
                    D-VIEW AI 데이터 랩
                  </span>
                  <span className="text-[11.5px] text-tertiary font-bold">
                    {selectedNotice.date}
                  </span>
                </div>
                <h2 className="text-[16px] sm:text-[18px] font-black text-primary leading-snug tracking-tight line-clamp-2">
                  {selectedNotice.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-secondary transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {selectedNotice.content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-[13.5px] text-secondary leading-relaxed font-medium space-y-4">
                  <MarkdownViewer content={selectedNotice.content} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center mb-4">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-[15px] font-extrabold text-primary mb-2">AI 분석 요약 준비 중</h3>
                  <p className="text-[12px] text-secondary font-medium max-w-[320px] mb-6 leading-relaxed">
                    본 공지사항의 상세 내용 및 AI 요약 정보가 아직 수집되거나 요약 분석되지 않았습니다. 아래의 원문 바로보기 버튼을 통해 원문을 확인하실 수 있습니다.
                  </p>
                  <a
                    href={selectedNotice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-[#ea6100] hover:bg-[#ff8f00] text-white text-[13px] font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    원문 고시 바로보기
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border/60 flex items-center justify-between gap-3 bg-neutral-50/40 dark:bg-zinc-900/10">
              <a
                href={selectedNotice.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#c44d00] dark:text-[#ea6100] hover:underline"
              >
                <ExternalLink size={15} />
                화성시 원문 고시 보기
              </a>
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-5 py-2 rounded-xl text-[13px] font-extrabold bg-[#cbd5e1] dark:bg-[#475569] hover:bg-[#b0b8c1] dark:hover:bg-[#334155] text-primary transition-colors animate-in"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

LoungeContainerClient.displayName = 'LoungeContainerClient';
export default LoungeContainerClient;
