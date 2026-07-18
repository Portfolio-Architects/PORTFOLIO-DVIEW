'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';

const MarkdownViewer = dynamic(() => import('@/components/ui/MarkdownViewer'), {
  ssr: true,
  loading: () => <div className="w-full h-24 bg-body/20 rounded-2xl animate-pulse" />
});
import { 
  Newspaper, 
  FileText, 
  Calendar, 
  Megaphone, 
  Train, 
  MapPin, 
  Sparkles, 
  X, 
  ArrowUpRight, 
  Building2,
  ExternalLink,
  LayoutDashboard,
  Home,
  Coins,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeroHeader from '@/components/PageHeroHeader';
import PullToRefresh from '@/components/pwa/PullToRefresh';
import FloatingUserBar from '@/components/FloatingUserBar';
import MobileDock from '@/components/pwa/MobileDock';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface NewsItem {
  id: number;
  category: string;
  sub: string; // Publisher
  title: string;
  link: string;
  pubDate: string;
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

interface NewsClientProps {
  initialNews?: NewsItem[];
  initialNotices?: NoticeItem[];
}

const NewsCard = React.memo(function NewsCard({
  item,
  getNewsCategoryDetails,
  formatDate,
}: {
  item: NewsItem;
  getNewsCategoryDetails: (category: string) => { label: string; bgClass: string };
  formatDate: (dateStr: string) => string;
}) {
  const cat = getNewsCategoryDetails(item.category);
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col md:flex-row md:items-center justify-between gap-3.5 py-3.5 px-4 sm:p-5 rounded-[20px] border border-border/40 dark:border-white/10 bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-300 transform shadow-sm"
    >
      <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cat.bgClass}`}>
            {cat.label}
          </span>
          <span className="text-[11.5px] font-extrabold text-secondary/80 dark:text-zinc-400 tracking-tight">
            {item.sub}
          </span>
          <span className="text-[11px] text-tertiary font-medium">
            {formatDate(item.pubDate)}
          </span>
        </div>
        <h3 className="text-[14px] sm:text-[15.5px] font-extrabold text-primary/90 dark:text-zinc-100 group-hover:text-[#c44d00] dark:group-hover:text-[#ea6100] transition-colors line-clamp-2 md:line-clamp-1 leading-snug tracking-tight">
          {item.title}
        </h3>
      </div>
      <div className="flex items-center text-tertiary group-hover:text-[#c44d00] dark:group-hover:text-[#ea6100] shrink-0 self-end md:self-center">
        <ArrowUpRight size={17} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
      </div>
    </a>
  );
});
NewsCard.displayName = 'NewsCard';

const NoticeItemCard = React.memo(function NoticeItemCard({
  item,
  getNoticeSourceDetails,
  hasDetails,
  onClick,
}: {
  item: NoticeItem;
  getNoticeSourceDetails: (source: string) => { label: string; icon: React.ComponentType<any>; bgClass: string };
  hasDetails: boolean;
  onClick: () => void;
}) {
  const src = getNoticeSourceDetails(item.source || 'bbs');
  const Icon = src.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left group flex flex-col md:flex-row md:items-center justify-between gap-3.5 py-3.5 px-4 sm:p-5 rounded-[20px] border border-border/40 dark:border-white/10 bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-300 transform shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      aria-label={`소식: ${item.title}, 부서: ${item.dept}`}
    >
      <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${src.bgClass}`}>
            <Icon size={11} />
            {src.label}
          </span>
          <span className="text-[11.5px] font-extrabold text-secondary/80 dark:text-zinc-400 tracking-tight">
            {item.dept}
          </span>
          <span className="text-[11px] text-tertiary font-medium">
            {item.date}
          </span>
          {hasDetails && (
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-[#ea6100] border border-teal-500/10 animate-pulse">
              AI 분석 완료
            </span>
          )}
        </div>
        <h3 className="text-[14px] sm:text-[15.5px] font-extrabold text-primary/90 dark:text-zinc-100 group-hover:text-[#c44d00] dark:group-hover:text-[#ea6100] transition-colors line-clamp-2 md:line-clamp-1 leading-snug tracking-tight">
          {item.title}
        </h3>
      </div>
      <div className="flex items-center text-tertiary group-hover:text-[#c44d00] dark:group-hover:text-[#ea6100] shrink-0 self-end md:self-center">
        <ArrowUpRight size={17} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
      </div>
    </button>
  );
});
NoticeItemCard.displayName = 'NoticeItemCard';

const NewsClient = React.memo(function NewsClient({ initialNews, initialNotices }: NewsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noticeId = searchParams.get('notice');
  const [activeTab, setActiveTab] = useState<'news' | 'notices'>('news');
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [visibleNewsCount, setVisibleNewsCount] = useState(12);
  const [visibleNoticesCount, setVisibleNoticesCount] = useState(12);
  const [activeNewsSubTab, setActiveNewsSubTab] = useState<'industry' | 'realestate'>('industry');

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

  // Fetch macro news
  const { data: newsRes, error: newsError, mutate: mutateNews } = useSWR(
    '/api/macro/news?limit=40',
    fetcher,
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 300000,
      fallbackData: initialNews ? { data: initialNews } : undefined
    }
  );

  // Fetch local notices
  const { data: noticesRes, error: noticesError, mutate: mutateNotices } = useSWR(
    '/api/local-notices?dongtan=true',
    fetcher,
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 300000,
      fallbackData: initialNotices ? { notices: initialNotices } : undefined
    }
  );

  const handleRefresh = useCallback(async () => {
    if (activeTab === 'news') {
      await mutateNews();
    } else {
      await mutateNotices();
    }
  }, [activeTab, mutateNews, mutateNotices]);

  const newsList: NewsItem[] = newsRes?.data || [];
  const noticesList: NoticeItem[] = noticesRes?.notices || [];

  const filteredNewsList = useMemo(() => {
    return newsList.filter((item: NewsItem) => {
      const isIndustry = item.category === 'COMMERCIAL' || 
        /(?:테크노밸리|지산|지식산업센터|기업|반도체|삼성전자|공장|산업|일자리|창업|스타트업|사무실|오피스|상가|상권|임대|공실|세제|과밀|이전|공동임차|소호|SOHO|금강|실리콘앨리|에이팩|skv1)/i.test(item.title) || 
        /(지산|오피스|반도체|삼성전자|현대|SK)/i.test(item.sub);
      
      return activeNewsSubTab === 'industry' ? isIndustry : !isIndustry;
    });
  }, [newsList, activeNewsSubTab]);

  // Auto-open notice modal when noticeId query param is present
  useEffect(() => {
    if (noticeId && noticesList.length > 0) {
      const found = noticesList.find((n) => n.id === noticeId);
      if (found) {
        setActiveTab('notices');
        setSelectedNotice(found);
      }
    }
  }, [noticeId, noticesList]);

  const isLoadingNews = !newsRes && !newsError;
  const isLoadingNotices = !noticesRes && !noticesError;

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
  const getNoticeSourceDetails = (source: string) => {
    switch (source) {
      case 'gosi':
        return {
          label: '고시공고',
          icon: FileText,
          bgClass: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30',
        };
      case 'rail':
        return {
          label: '교통/철도',
          icon: Train,
          bgClass: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30',
        };
      case 'dong':
        return {
          label: '동네행정',
          icon: MapPin,
          bgClass: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30',
        };
      case 'culture':
        return {
          label: '문화/축제',
          icon: Sparkles,
          bgClass: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30',
        };
      default:
        return {
          label: '시정소식',
          icon: Megaphone,
          bgClass: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border border-sky-500/20 dark:border-sky-500/30',
        };
    }
  };

  // Get category label & color for news
  const getNewsCategoryDetails = (category: string) => {
    switch (category) {
      case 'POLICY':
        return { label: '부동산 정책', bgClass: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30' };
      case 'INFRASTRUCTURE':
        return { label: '교통/개발', bgClass: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30' };
      case 'COMMERCIAL':
        return { label: '상권/기업', bgClass: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/30' };
      case 'COMMUNITY':
        return { label: '학군/주거', bgClass: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border border-teal-500/20 dark:border-teal-500/30' };
      default:
        return { label: '시장 동향', bgClass: 'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400 border border-zinc-500/20 dark:border-zinc-500/30' };
    }
  };

  return (
    <React.Fragment>
      <PullToRefresh onRefresh={handleRefresh}>
      {/* Main Header — Logo + Nav integrated */}
      <header className="hidden md:block shrink-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xl border-b border-border sticky top-0 z-50" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between h-[80px] gap-4 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs (Segmented Control Style) */}
            <nav className="hidden md:flex shrink-0 items-center gap-1 sm:gap-1.5 bg-body/80 p-2 rounded-[18px] overflow-x-auto no-scrollbar" aria-label="메인 메뉴">
              <button
                onClick={() => router.push('/overview?tab=overview')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5`}
              >
                <LayoutDashboard size={18} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>데이터 랩</span>
              </button>

              <button
                onClick={() => router.push('/explore')}
                onMouseEnter={() => router.prefetch('/explore')}
                onTouchStart={() => router.prefetch('/explore')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5`}
              >
                <Home size={18} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>아파트 탐색</span>
              </button>

              <button
                onClick={() => router.push('/overview?tab=lounge')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5`}
              >
                <MessageSquare size={18} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>커뮤니티</span>
              </button>
              
              <button
                onClick={() => router.push('/news')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10`}
              >
                <Newspaper size={18} className="text-primary" />
                <span>동탄 소식</span>
              </button>
              
              <button
                onClick={() => router.push('/overview?tab=office')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5`}
              >
                <Coins size={18} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>큐레이션</span>
              </button>
              
            </nav>

            {/* Right: Desktop Extra Nav & User Bar */}
            <div className="hidden md:flex items-center justify-end gap-4">
              <FloatingUserBar />
            </div>
            
          </div>
        </div>
      </header>

      <div className="w-full flex flex-col bg-transparent pb-16 min-h-screen">
        <PageHeroHeader
          title="D-VIEW 동탄 소식"
          subtitleStrong="동탄 소식 가장 빠르게 받아보기"
          subtitleLight="실시간 부동산 뉴스부터 화성시와 동탄구청의 주요 행정 고시공고까지 모아 드립니다"
        />

        <div className="flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 mt-6 w-full max-w-[1400px] mx-auto">
          {/* Segmented Tab control */}
          <div className="flex bg-body/80 p-2 rounded-[18px] w-fit border border-border/60 self-center md:self-start mb-8 shadow-sm">
            <button
              onClick={() => setActiveTab('news')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[14px] font-extrabold transition-all duration-300 ${
                activeTab === 'news'
                  ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Newspaper size={16} />
              부동산 뉴스
            </button>
            <button
              onClick={() => setActiveTab('notices')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[14px] font-extrabold transition-all duration-300 ${
                activeTab === 'notices'
                  ? 'bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Megaphone size={16} />
              구정 행정 소식
            </button>
          </div>

          {/* Tab Contents */}
          {/* Tab Contents */}
          {activeTab === 'news' ? (
            <div className="flex flex-col gap-2.5">
              {isLoadingNews ? (
                // Shimmer Loader for News
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="w-full h-[90px] bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/40 dark:border-white/10 rounded-[20px] animate-pulse" />
                ))
              ) : (
                <>
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

                  {filteredNewsList.length === 0 ? (
                    <div className="text-center py-16 text-tertiary font-bold text-[14px] bg-surface/40 rounded-2xl border border-dashed border-border">
                      {activeNewsSubTab === 'industry' 
                        ? '등록된 동탄 테크노밸리 및 산업 관련 뉴스가 없습니다.' 
                        : '등록된 동탄 부동산 뉴스가 없습니다.'}
                    </div>
                  ) : (
                    <>
                      {filteredNewsList.slice(0, visibleNewsCount).map((item) => (
                        <NewsCard
                          key={item.id}
                          item={item}
                          getNewsCategoryDetails={getNewsCategoryDetails}
                          formatDate={formatDate}
                        />
                      ))}
                      
                      {filteredNewsList.length > visibleNewsCount && (
                        <button
                          onClick={() => setVisibleNewsCount(prev => prev + 12)}
                          className="w-full mt-2 py-3 text-[13px] font-extrabold text-secondary bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/40 dark:border-white/10 hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] rounded-[14px] transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
                        >
                          <span>더보기</span>
                          <span className="text-[11px] font-bold text-tertiary">
                            ({visibleNewsCount} / {filteredNewsList.length})
                          </span>
                          <ChevronDown size={14} className="text-secondary" />
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {isLoadingNotices ? (
                // Shimmer Loader for Notices
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="w-full h-[90px] bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/40 dark:border-white/10 rounded-[20px] animate-pulse" />
                ))
              ) : noticesList.length === 0 ? (
                <div className="text-center py-16 text-tertiary font-bold text-[14px] bg-surface/40 rounded-2xl border border-dashed border-border">
                  등록된 동탄 구정 소식이 없습니다.
                </div>
              ) : (
                <>
                  {noticesList.slice(0, visibleNoticesCount).map((item) => (
                    <NoticeItemCard
                      key={item.id}
                      item={item}
                      getNoticeSourceDetails={getNoticeSourceDetails}
                      hasDetails={!!item.content}
                      onClick={() => {
                        if (item.content) {
                          setSelectedNotice(item);
                        } else {
                          window.open(item.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    />
                  ))}
                  
                  {noticesList.length > visibleNoticesCount && (
                    <button
                      onClick={() => setVisibleNoticesCount(prev => prev + 12)}
                      className="w-full mt-2 py-3 text-[13px] font-extrabold text-secondary bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/40 dark:border-white/10 hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] rounded-[14px] transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
                    >
                      <span>더보기</span>
                      <span className="text-[11px] font-bold text-tertiary">
                        ({visibleNoticesCount} / {noticesList.length})
                      </span>
                      <ChevronDown size={14} className="text-secondary" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </PullToRefresh>

    {/* AI Analysis Markdown Modal */}
    {selectedNotice && (
      <div className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-sm transition-opacity duration-200">
        <div 
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          className="bg-surface border border-border/80 w-[calc(100%-32px)] max-w-[720px] max-h-[78vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200"
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
              <h2 className="text-[16px] sm:text-[18px] font-black text-primary leading-snug tracking-tight">
                {selectedNotice.title}
              </h2>
            </div>
            <button
              onClick={() => setSelectedNotice(null)}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-secondary transition-colors"
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
              className="px-5 py-2 rounded-xl text-[13px] font-extrabold bg-[#cbd5e1] dark:bg-[#475569] hover:bg-[#b0b8c1] dark:hover:bg-[#334155] text-primary transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    )}

    <MobileDock activeTab="lounge" />
    </React.Fragment>
  );
});

NewsClient.displayName = 'NewsClient';

export default NewsClient;
