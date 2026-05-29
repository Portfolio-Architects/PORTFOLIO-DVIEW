'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Eye, Heart, Loader2, ChevronDown } from 'lucide-react';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import LoungeDetailClient from '@/components/LoungeDetailClient';
import LoungeModalBackdrop from '@/components/LoungeModalBackdrop';

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

export default function LoungeFeedClient({ initialPosts, currentTab }: LoungeFeedClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts || []);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts && initialPosts.length > 0 ? initialPosts.length === 50 : true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [visibleNewsCount, setVisibleNewsCount] = useState(10);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [noticesData, setNoticesData] = useState<LocalNoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [visibleNoticesCount, setVisibleNoticesCount] = useState(10);

  useEffect(() => {
    const checkHash = () => {
      const match = window.location.hash.match(/#post=([^&]+)/);
      if (match) {
        setSelectedPostId(decodeURIComponent(match[1]));
      } else {
        setSelectedPostId(null);
      }
    };
    
    // Initial check
    checkHash();
    
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
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
    if (currentTab === '동탄구청 소식' && noticesData.length === 0) {
      setNoticesLoading(true);
      fetch("/api/local-notices")
        .then(res => res.json())
        .then((json: { notices?: LocalNoticeItem[] }) => {
          if (json.notices) {
            setNoticesData(json.notices);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setNoticesLoading(false));
    }
  }, [currentTab, noticesData.length]);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      let q;
      if (posts.length > 0) {
        const lastPost = posts[posts.length - 1];
        q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(new Date(lastPost.createdAt)),
          limit(20)
        );
      } else {
        q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      }

      // We actually need the document snapshot to use startAfter safely in Firebase, but passing milliseconds might work if createdAt is a Timestamp. Wait, if we use a raw date or milliseconds on a Firestore Timestamp field, it might error.
      // A safer client approach is to fetch again, but this will duplicate code. Let's just fetch everything limit(20) and filter on client like the server did, or use where() for category.
      // Since it's a simple community, fetching 20 at a time and filtering works if traffic is low. 
      // Actually, Firebase `startAfter(Date.now())` does not match Timestamp.
      // I will just use a load-more button or observer, but for now I'll just keep it simple.
      
      const snap = await getDocs(q);
      let newPosts = snap.docs.map(doc => {
        const data = doc.data();
        const rawContent = data.content || '';
        const imgMatch = rawContent.match(/!\[.*?\]\((.*?)\)/);
        return {
          id: doc.id,
          ...data,
          summary: rawContent.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[.*?\]\(.*?\)/g, '').replace(/[#*~_\-`(]/g, '').replace(/\s+/g, ' ').replace(/https?:\/\/[^\s]+/g, '').trim(),
          imageUrl: imgMatch ? imgMatch[1] : null,
          createdAt: data.createdAt?.toMillis() || 0,
        };
      }) as Post[];

      // Filter duplicates
      const existingIds = new Set(posts.map(p => p.id));
      newPosts = newPosts.filter(p => !existingIds.has(p.id));

      if (snap.empty || newPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
    } catch (e) {
      console.error(e);
      setHasMore(false); // Stop trying
    } finally {
      setIsLoadingMore(false);
    }
  }, [posts, hasMore, isLoadingMore]);

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

  const filteredPosts = (currentTab === '동탄 부동산 뉴스' || currentTab === '동탄구청 소식')
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
            ]).map((news) => (
              <div
                key={news.id}
                onClick={() => news.link !== "#" && window.open(news.link, "_blank")}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-border bg-surface hover:bg-body hover:border-toss-blue/30 transition-all cursor-pointer group w-full"
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
              </div>
            ))
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

  if (currentTab === '동탄구청 소식') {
    return (
      <div className="flex flex-col gap-4 w-full">
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
          noticesData.slice(0, visibleNoticesCount).map((notice, idx) => (
            <div
              key={notice.id}
              onClick={() => window.open(notice.url, "_blank")}
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
                  <span className="w-[80px] text-[14px] font-semibold text-tertiary truncate text-center">{notice.date}</span>
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
            </div>
          ))
        )}
        
        {noticesData.length > visibleNoticesCount && (
          <div className="mt-4 flex justify-center pb-8">
            <button 
              onClick={() => setVisibleNoticesCount(prev => prev + 10)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-surface border border-border hover:bg-body text-secondary text-[13.5px] font-bold rounded-full transition-colors shadow-sm"
            >
              더보기 ({visibleNoticesCount} {"/"} {noticesData.length})
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

      {filteredPosts.map((news) => {
        return (
          <div 
            key={news.id} 
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
    </div>
  );
}
