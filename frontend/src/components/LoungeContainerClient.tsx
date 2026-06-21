'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeroHeader from './PageHeroHeader';
import { safeReload } from '@/lib/utils/safeReload';
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
  console.warn('LoungeFeedClient Chunk Load failure, initiating fallback reload', err);
  safeReload('LoungeFeedClient');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <LoungeFeedSkeleton />
});

const LoungeComposeClient = dynamic(() => import('@/components/LoungeComposeClient').catch(err => {
  console.warn('LoungeComposeClient Chunk Load failure, initiating fallback reload', err);
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
  createdAt: number;
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
  initialNews?: any[];
  initialNotices?: any[];
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
const getNoticeSourceDetails = (source: string) => {
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
  
  const activeTab = searchParamsHook.get('tab') || 'talk';
  const noticeId = searchParamsHook.get('notice');

  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [visibleNewsCount, setVisibleNewsCount] = useState(12);
  const [visibleNoticesCount, setVisibleNoticesCount] = useState(12);

  // Auto-open notice modal when noticeId query param is present
  useEffect(() => {
    if (noticeId && initialNotices.length > 0) {
      const found = initialNotices.find((n) => n.id === noticeId);
      if (found) {
        setSelectedNotice(found);
      }
    }
  }, [noticeId, initialNotices]);

  // Prevent background scroll when modal is open
  useEffect(() => {
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
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        idleId = (window as any).requestIdleCallback(preloadLoungeChunks, { timeout: 3000 });
      } else {
        preloadTimeoutRef.current = setTimeout(preloadLoungeChunks, 2000);
      }
    }

    return () => {
      isMounted = false;
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
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
        subtitleLight="현장 임장기, 부동산 뉴스, 우리 동네 이야기"
      />

      <div className="max-w-[1000px] mx-auto w-full px-4 sm:px-6 pt-6 pb-16">
        {/* Segmented Tab control */}
        <div className="flex bg-body/80 p-1.5 rounded-[20px] w-full max-w-[480px] border border-border/40 mx-auto mb-8 shadow-sm backdrop-blur-md">
          {[
            { id: 'talk', label: '이웃 소통', icon: MessageSquare },
            { id: 'news', label: '실시간 뉴스', icon: Newspaper },
            { id: 'notices', label: '행정 고시공고', icon: Megaphone }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => router.push(`/lounge?tab=${tab.id}`, { scroll: false })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] text-[13px] font-extrabold transition-all duration-300 active:scale-[0.98] ${
                  isActive 
                    ? 'bg-surface text-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10'
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
          <>
            <LoungeFeedClient initialPosts={initialPosts} currentTab="모든 이야기" />
            <LoungeComposeClient currentTab="모든 이야기" onRequestLogin={onRequestLogin} />
          </>
        )}

        {activeTab === 'news' && (
          <div className="flex flex-col gap-2.5">
            {initialNews.length === 0 ? (
              <div className="text-center py-16 text-tertiary font-bold text-[14px] bg-surface/40 rounded-2xl border border-dashed border-border">
                등록된 동탄 부동산 뉴스가 없습니다.
              </div>
            ) : (
              <>
                {initialNews.slice(0, visibleNewsCount).map((item: NewsItem) => {
                  const cat = getNewsCategoryDetails(item.category);
                  return (
                    <a
                      key={item.id}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col md:flex-row md:items-center justify-between gap-3.5 py-3.5 px-4 sm:p-5 rounded-2xl border border-border/60 bg-surface/80 dark:bg-surface/60 backdrop-blur-md hover:bg-body/60 dark:hover:bg-body/40 hover:border-emerald-500/20 dark:hover:border-emerald-500/30 hover:shadow-[0_12px_24px_rgba(0,130,98,0.04)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm"
                    >
                      <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cat.bgClass}`}>
                            {cat.label}
                          </span>
                          <span className="text-[11.5px] font-extrabold text-secondary tracking-tight">
                            {item.sub}
                          </span>
                          <span className="text-[11px] text-tertiary font-medium">
                            {formatDate(item.pubDate)}
                          </span>
                        </div>
                        <h3 className="text-[14px] sm:text-[15.5px] font-extrabold text-primary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors line-clamp-2 md:line-clamp-1 leading-snug tracking-tight">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex items-center text-tertiary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] shrink-0 self-end md:self-center">
                        <ArrowUpRight size={17} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                      </div>
                    </a>
                  );
                })}
                
                {initialNews.length > visibleNewsCount && (
                  <button
                    onClick={() => setVisibleNewsCount(prev => prev + 12)}
                    className="w-full mt-2 py-3 text-[13px] font-extrabold text-secondary bg-surface/80 dark:bg-surface/60 border border-border/60 hover:bg-body/60 dark:hover:bg-body/40 rounded-2xl hover:border-emerald-500/20 transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
                  >
                    <span>더보기</span>
                    <span className="text-[11px] font-bold text-tertiary">
                      ({visibleNewsCount} / {initialNews.length})
                    </span>
                    <ChevronDown size={14} className="text-secondary" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'notices' && (
          <div className="flex flex-col gap-2.5">
            {initialNotices.length === 0 ? (
              <div className="text-center py-16 text-tertiary font-bold text-[14px] bg-surface/40 rounded-2xl border border-dashed border-border">
                등록된 동탄 구정 소식이 없습니다.
              </div>
            ) : (
              <>
                {initialNotices.slice(0, visibleNoticesCount).map((item: NoticeItem) => {
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
                      className="group flex flex-col md:flex-row md:items-center justify-between gap-3.5 py-3.5 px-4 sm:p-5 rounded-2xl border border-border/60 bg-surface/80 dark:bg-surface/60 backdrop-blur-md hover:bg-body/60 dark:hover:bg-body/40 hover:border-emerald-500/20 dark:hover:border-emerald-500/30 hover:shadow-[0_12px_24px_rgba(0,130,98,0.04)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer shadow-sm"
                    >
                      <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${src.bgClass}`}>
                            <Icon size={11} />
                            {src.label}
                          </span>
                          <span className="text-[11.5px] font-extrabold text-secondary tracking-tight">
                            {item.dept}
                          </span>
                          <span className="text-[11px] text-tertiary font-medium">
                            {item.date}
                          </span>
                          {hasDetails && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-[#00d29d] border border-teal-500/10 animate-pulse">
                              AI 분석 완료
                            </span>
                          )}
                        </div>
                        <h3 className="text-[14px] sm:text-[15.5px] font-extrabold text-primary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors line-clamp-2 md:line-clamp-1 leading-snug tracking-tight">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex items-center text-tertiary group-hover:text-[#008262] dark:group-hover:text-[#00d29d] shrink-0 self-end md:self-center">
                        <ArrowUpRight size={17} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                      </div>
                    </div>
                  );
                })}
                
                {initialNotices.length > visibleNoticesCount && (
                  <button
                    onClick={() => setVisibleNoticesCount(prev => prev + 12)}
                    className="w-full mt-2 py-3 text-[13px] font-extrabold text-secondary bg-surface/80 dark:bg-surface/60 border border-border/60 hover:bg-body/60 dark:hover:bg-body/40 rounded-2xl hover:border-emerald-500/20 transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
                  >
                    <span>더보기</span>
                    <span className="text-[11px] font-bold text-tertiary">
                      ({visibleNoticesCount} / {initialNotices.length})
                    </span>
                    <ChevronDown size={14} className="text-secondary" />
                  </button>
                )}
              </>
            )}
          </div>
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
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-[#00d29d]">
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
                    className="px-5 py-2.5 bg-[#00d29d] hover:bg-[#00b386] text-white text-[13px] font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
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
                className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#008262] dark:text-[#00d29d] hover:underline"
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
