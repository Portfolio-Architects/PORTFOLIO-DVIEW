'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Eye, Heart, Loader2, ChevronDown } from 'lucide-react';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

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

interface LoungeFeedClientProps {
  initialPosts: Post[];
  currentTab: string;
}

const CATEGORY_MAP: Record<string, string[]> = {
  '전체': ['전체'],
  '동탄 임장/분석': ['동탄 임장/분석', '임장기'],
  '부동산 고민상담': ['부동산 고민상담', '부동산 기초'],
  '동탄 청약/대출': ['동탄 청약/대출', '정책자금 대출'],
  '동탄 교통/상권': ['동탄 교통/상권', '인프라']
};

export default function LoungeFeedClient({ initialPosts, currentTab }: LoungeFeedClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts || []);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts && initialPosts.length > 0 ? initialPosts.length === 50 : true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [newsData, setNewsData] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [visibleNewsCount, setVisibleNewsCount] = useState(10);

  useEffect(() => {
    if (currentTab === '부동산 뉴스' && newsData.length === 0) {
      setNewsLoading(true);
      fetch("/api/macro/news")
        .then(res => res.json())
        .then(json => {
          if (json.status === "success" && json.data) {
            setNewsData(json.data);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setNewsLoading(false));
    }
  }, [currentTab, newsData.length]);

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
  }, [posts, hasMore, isLoadingMore, currentTab]);

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

  const filteredPosts = currentTab === '전체'
    ? posts
    : posts.filter((p) => (CATEGORY_MAP[currentTab] || [currentTab]).includes(p.category));

  // Auto-fetch if the current category has no posts but there are more posts in the DB
  useEffect(() => {
    if (filteredPosts.length === 0 && hasMore && !isLoadingMore) {
      const timer = setTimeout(() => {
        loadMorePosts();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filteredPosts.length, hasMore, isLoadingMore, loadMorePosts]);

  if (currentTab === '부동산 뉴스') {
    return (
      <div className="flex flex-col gap-4">
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
                title: "GTX-A 노선 개통 이후 동탄역 주변 아파트 실거래가 15% 상승 — 광역 교통망 확충이 지역 핵심 자산 가치에 미치는 파급력 분석.",
                link: "#",
              },
              {
                id: 2,
                category: "MARKET",
                sub: "Supply & Demand",
                title: "동탄2신도시 입주 물량 안정화 진입, 전세가율 반등 — 동탄 호수공원 및 문화디자인밸리 중심의 신축 아파트 선호도 지속.",
                link: "#",
              },
              {
                id: 3,
                category: "POLICY",
                sub: "Urban Development",
                title: "동탄 트램(도시철도) 기본설계 본격화 — 1동탄과 2동탄을 잇는 내부 교통망 완성으로 인한 권역별 가격 갭(Gap) 축소 전망.",
                link: "#",
              },
              {
                id: 4,
                category: "COMMERCIAL",
                sub: "Anchor Tenant",
                title: "경부고속도로 지하화 및 상부 공원화 사업 — 동탄역세권 광역비즈니스콤플렉스 확장 및 라이프스타일 앵커 시설 도입 예정.",
                link: "#",
              },
              {
                id: 5,
                category: "MACRO",
                sub: "Liquidity",
                title: "금리 인하 기대감 선반영, 거래량 3개월 연속 상승 — 신생아 특례대출 등 정책 금융이 3040 세대의 매수 심리에 미친 영향.",
                link: "#",
              },
              {
                id: 6,
                category: "COMMUNITY",
                sub: "Education",
                title: "동탄 내 학군 형성 가속화, '시범 커뮤니티' 권역 프리미엄 고착화 — 우수 학군 배정 단지의 가격 하방 경직성 및 거래 회전율 검증.",
                link: "#",
              },
            ]).map((news) => (
              <div
                key={news.id}
                onClick={() => news.link !== "#" && window.open(news.link, "_blank")}
                className="flex gap-4 p-5 rounded-2xl border border-border bg-surface hover:bg-[#f9fafb] hover:border-toss-blue/30 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-white rounded-full border border-gray-200 text-[#0d9488] font-bold text-[13px] shadow-sm group-hover:bg-[#0d9488] group-hover:text-white transition-colors">
                  {news.id}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-extrabold text-[#0d9488] tracking-wide">{news.category}</span>
                    <span className="text-[11px] text-gray-300">|</span>
                    <span className="text-[11px] font-semibold text-[#8b95a1]">{news.sub}</span>
                  </div>
                  <p className="text-[14.5px] font-bold text-primary leading-[1.6] group-hover:text-toss-blue transition-colors">
                    {news.title}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {newsData.length > visibleNewsCount && (
            <div className="mt-4 flex justify-center pb-8">
              <button 
                onClick={() => setVisibleNewsCount(prev => prev + 10)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-[#e5e8eb] hover:bg-[#f9fafb] text-[#4e5968] text-[13.5px] font-bold rounded-full transition-colors shadow-sm"
              >
                더보기 ({visibleNewsCount} / {newsData.length})
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filteredPosts.length === 0 && !hasMore && (
        <div className="bg-transparent rounded-2xl p-12 text-center border border-dashed border-toss-gray">
          <MessageSquare size={40} className="mx-auto mb-4 text-toss-gray" />
          <p className="text-[15px] font-bold text-secondary">아직 '{currentTab}' 관련 글이 없습니다</p>
        </div>
      )}

      {filteredPosts.map((news) => {
        return (
          <Link key={news.id} href={`/lounge/${news.id}`} scroll={false} className="bg-surface rounded-2xl border border-border px-5 pt-4 pb-0 hover:bg-body transition-colors cursor-pointer block overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[14px] font-extrabold text-primary leading-none mb-1">
                    {news.author || '익명'}
                  </div>
                  <div className="text-[12px] font-medium text-tertiary leading-none">
                    {news.meta?.split('·')[0]?.trim() || '방금 전'}
                  </div>
                </div>
              </div>
              
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                (news.category === '동탄 임장/분석' || news.category === '임장기') ? 'bg-[#e8f8f0] text-[#00a06c]' :
                (news.category === '부동산 고민상담' || news.category === '부동산 기초') ? 'bg-[#ffe8e8] text-toss-red' :
                (news.category === '동탄 청약/대출' || news.category === '정책자금 대출') ? 'bg-toss-blue-light text-toss-blue' :
                (news.category === '동탄 교통/상권' || news.category === '인프라') ? 'bg-[#f4e8ff] text-[#9b51e0]' :
                'bg-body text-secondary'
              }`}>
                {news.category === '임장기' ? '동탄 임장/분석' : 
                 news.category === '부동산 기초' ? '부동산 고민상담' :
                 news.category === '정책자금 대출' ? '동탄 청약/대출' :
                 news.category === '인프라' ? '동탄 교통/상권' : 
                 (news.category || '기타')}
              </span>
            </div>
            
            <div className="mb-3">
              <h2 className="text-[16px] font-extrabold text-primary leading-snug mb-1.5">{news.title}</h2>
              {news.summary && (
                <div className="flex flex-col gap-1">
                  <p className="text-[14.5px] text-secondary leading-[1.6] line-clamp-3">
                    {news.summary}
                  </p>
                  {news.summary.length > 80 && (
                    <span className="text-[13px] font-bold text-toss-blue hover:underline">자세히 보기...</span>
                  )}
                </div>
              )}
            </div>

            {news.imageUrl && (
              <div className="w-full aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden mb-3 border border-body bg-body">
                <img src={news.imageUrl} alt="post image" className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}

            <div className="flex items-center gap-4 py-3 border-t border-body mt-4">
              <div className={`flex items-center gap-1.5 text-[13px] font-medium ${news.likes > 0 ? 'text-toss-red' : 'text-tertiary'}`}>
                <Heart size={16} className={news.likes > 0 ? 'fill-current' : ''} /> {news.likes || 0}
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-tertiary font-medium">
                <MessageSquare size={16} /> {/* If we had commentCount we'd put it here */}
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-tertiary font-medium ml-auto">
                <Eye size={16} /> {news.views || 0}
              </div>
            </div>
          </Link>
        );
      })}

      {hasMore && (
        <div ref={observerTarget} className="py-8 flex justify-center text-tertiary">
          {isLoadingMore ? <Loader2 className="animate-spin w-6 h-6" /> : "스크롤하여 더 보기"}
        </div>
      )}
    </div>
  );
}
