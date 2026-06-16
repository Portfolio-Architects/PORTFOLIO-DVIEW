'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  MessageSquare
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
  createdAt?: string;
  content?: string;
}

const NewsClient = React.memo(function NewsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'news' | 'notices'>('news');
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
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
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // Fetch local notices
  const { data: noticesRes, error: noticesError, mutate: mutateNotices } = useSWR(
    '/api/local-notices?dongtan=true',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const handleRefresh = async () => {
    if (activeTab === 'news') {
      await mutateNews();
    } else {
      await mutateNotices();
    }
  };

  const newsList: NewsItem[] = newsRes?.data || [];
  const noticesList: NoticeItem[] = noticesRes?.notices || [];

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
          bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15',
        };
      case 'rail':
        return {
          label: '교통/철도',
          icon: Train,
          bgClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15',
        };
      case 'dong':
        return {
          label: '동네행정',
          icon: MapPin,
          bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15',
        };
      case 'culture':
        return {
          label: '문화/축제',
          icon: Sparkles,
          bgClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/15',
        };
      default:
        return {
          label: '시정소식',
          icon: Megaphone,
          bgClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/15',
        };
    }
  };

  // Get category label & color for news
  const getNewsCategoryDetails = (category: string) => {
    switch (category) {
      case 'POLICY':
        return { label: '부동산 정책', bgClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/15' };
      case 'INFRASTRUCTURE':
        return { label: '교통/개발', bgClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15' };
      case 'COMMERCIAL':
        return { label: '상권/기업', bgClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/15' };
      case 'COMMUNITY':
        return { label: '학군/주거', bgClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/15' };
      default:
        return { label: '시장 동향', bgClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/15' };
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {/* Main Header — Logo + Nav integrated */}
      <header className="hidden md:block shrink-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xl border-b border-border sticky top-0 z-50" role="banner">
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between h-[68px] gap-4 md:gap-0">
            
            {/* Mobile: Top Bar */}
            <div className="md:hidden flex items-center justify-end w-full">
              <FloatingUserBar />
            </div>

            {/* Center: Nav Tabs (Segmented Control Style) */}
            <nav className="hidden md:flex shrink-0 items-center gap-1 sm:gap-1.5 bg-body/80 p-2 rounded-[18px] overflow-x-auto no-scrollbar" aria-label="메인 메뉴">
              <button
                onClick={() => router.push('/#overview')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5`}
              >
                <LayoutDashboard size={18} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>데이터 랩</span>
              </button>
              
              <button
                onClick={() => router.push('/explore')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5`}
              >
                <Home size={18} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>아파트 탐색</span>
              </button>
              
              <button
                onClick={() => router.push('/news')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] bg-surface text-primary shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10`}
              >
                <Newspaper size={18} className="text-primary" />
                <span>동탄 소식</span>
              </button>
              
              <button
                onClick={() => router.push('/#gap')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5`}
              >
                <Coins size={18} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>큐레이션</span>
              </button>

              <button
                onClick={() => router.push('/#lounge')}
                className={`flex items-center justify-center min-w-[88px] sm:min-w-[100px] gap-1.5 px-3.5 py-2 text-[13px] font-extrabold transition-all duration-300 rounded-[12px] text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-surface/5`}
              >
                <MessageSquare size={18} className="text-tertiary group-hover:scale-110 transition-transform duration-200" />
                <span>커뮤니티</span>
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
          title="동탄 소식"
          subtitleLight="동탄 부동산 최신 뉴스 및 화성시·동탄구청의 주요 행정 고시공고를 실시간으로 전해드립니다."
          subtitleStrong=""
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
          {activeTab === 'news' ? (
            <div className="flex flex-col gap-3.5">
              {isLoadingNews ? (
                // Shimmer Loader for News
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="w-full h-[110px] bg-surface/60 border border-border/40 rounded-2xl animate-pulse" />
                ))
              ) : newsList.length === 0 ? (
                <div className="text-center py-16 text-tertiary font-bold text-[14px] bg-surface/40 rounded-2xl border border-dashed border-border">
                  등록된 동탄 부동산 뉴스가 없습니다.
                </div>
              ) : (
                newsList.map((item) => {
                  const cat = getNewsCategoryDetails(item.category);
                  return (
                    <a
                      key={item.id}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-surface hover:bg-neutral-50/50 dark:hover:bg-zinc-900/10 border border-border/70 hover:border-[#0d9488]/30 rounded-2xl shadow-sm hover:shadow-[0_8px_30px_rgba(13,148,136,0.04)] hover:scale-[1.005] transition-all duration-200"
                    >
                      <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${cat.bgClass}`}>
                            {cat.label}
                          </span>
                          <span className="text-[12px] font-extrabold text-secondary tracking-tight">
                            {item.sub}
                          </span>
                          <span className="text-[11.5px] text-tertiary font-medium">
                            {formatDate(item.pubDate)}
                          </span>
                        </div>
                        <h3 className="text-[14.5px] sm:text-[15.5px] font-extrabold text-primary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors line-clamp-2 md:line-clamp-1 leading-snug tracking-tight">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex items-center text-tertiary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] shrink-0 self-end md:self-center">
                        <ArrowUpRight size={18} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {isLoadingNotices ? (
                // Shimmer Loader for Notices
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="w-full h-[110px] bg-surface/60 border border-border/40 rounded-2xl animate-pulse" />
                ))
              ) : noticesList.length === 0 ? (
                <div className="text-center py-16 text-tertiary font-bold text-[14px] bg-surface/40 rounded-2xl border border-dashed border-border">
                  등록된 동탄 구정 소식이 없습니다.
                </div>
              ) : (
                noticesList.map((item) => {
                  const src = getNoticeSourceDetails(item.source);
                  const Icon = src.icon;
                  const hasDetails = !!item.content;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (hasDetails) {
                          setSelectedNotice(item);
                        } else {
                          window.open(item.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-surface hover:bg-neutral-50/50 dark:hover:bg-zinc-900/10 border border-border/70 hover:border-[#0d9488]/30 rounded-2xl shadow-sm hover:shadow-[0_8px_30px_rgba(13,148,136,0.04)] hover:scale-[1.005] cursor-pointer transition-all duration-200"
                    >
                      <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${src.bgClass}`}>
                            <Icon size={12} />
                            {src.label}
                          </span>
                          <span className="text-[12px] font-extrabold text-secondary tracking-tight">
                            {item.dept}
                          </span>
                          <span className="text-[11.5px] text-tertiary font-medium">
                            {item.date}
                          </span>
                          {hasDetails && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-[#00d29d] border border-teal-500/10 animate-pulse">
                              AI 분석 완료
                            </span>
                          )}
                        </div>
                        <h3 className="text-[14.5px] sm:text-[15.5px] font-extrabold text-primary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors line-clamp-2 md:line-clamp-1 leading-snug tracking-tight">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex items-center text-tertiary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] shrink-0 self-end md:self-center">
                        <ArrowUpRight size={18} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* AI Analysis Markdown Modal */}
        {selectedNotice && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-border/80 w-full max-w-[720px] max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b border-border/60">
                <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-[#00d29d]">
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
                <div className="prose prose-sm dark:prose-invert max-w-none text-[13.5px] text-secondary leading-relaxed font-medium space-y-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedNotice.content || ''}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-border/60 flex items-center justify-between gap-3 bg-neutral-50/40 dark:bg-zinc-900/10">
                <a
                  href={selectedNotice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#008262] dark:text-[#00d29d] hover:underline"
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
      </div>
      <MobileDock activeTab="news" />
    </PullToRefresh>
  );
});

NewsClient.displayName = 'NewsClient';

export default NewsClient;
