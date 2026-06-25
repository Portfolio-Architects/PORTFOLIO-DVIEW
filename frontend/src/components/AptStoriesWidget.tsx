'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { MessageSquare, Sparkles, ChevronRight, Home } from 'lucide-react';
import { formatRelativeTime } from '@/components/LoungeFeedClient'; // Re-use relative time helper if needed, or implement locally
import { logger } from '@/lib/services/logger';

interface AptStory {
  id: string;
  text: string;
  authorName: string;
  authorUid: string;
  apartmentName: string;
  reportId: string;
  createdAt: any;
}

export default function AptStoriesWidget() {
  const [stories, setStories] = useState<AptStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const q = query(
      collection(db, 'lounge_apt_stories'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!active) return;
      const list: AptStory[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          text: data.text || '',
          authorName: data.authorName || '익명',
          authorUid: data.authorUid || '',
          apartmentName: data.apartmentName || '',
          reportId: data.reportId || '',
          createdAt: data.createdAt,
        });
      });
      setStories(list);
      setLoading(false);
    }, (error) => {
      logger.error('AptStoriesWidget', 'Failed to listen to lounge_apt_stories', undefined, error);
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleCardClick = (aptName: string) => {
    if (!aptName) return;
    // Redirect to home page with apt hash to open detail modal
    window.location.assign(`/#apt=${encodeURIComponent(aptName)}`);
  };

  if (loading) {
    return (
      <div className="w-full bg-surface border border-border/60 rounded-3xl p-5 mb-4 animate-pulse">
        <div className="h-4 bg-body/40 rounded w-1/4 mb-4"></div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[280px] w-[280px] h-[100px] bg-body/20 rounded-2xl shrink-0"></div>
          ))}
        </div>
      </div>
    );
  }

  const jsonLd = useMemo(() => {
    if (stories.length === 0) return null;
    
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "실시간 아파트 이야기 한줄평 피드 목록",
      "description": "동탄 입주민 및 실거주 유저들이 남긴 생생한 아파트 단지별 실시간 한줄평 및 거주 후기 목록입니다.",
      "numberOfItems": stories.length,
      "itemListElement": stories.map((story, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "item": {
          "@type": "Review",
          "itemReviewed": {
            "@type": "Place",
            "name": story.apartmentName,
            "description": `${story.apartmentName} 아파트 단지`
          },
          "reviewBody": story.text,
          "author": {
            "@type": "Person",
            "name": story.authorName
          }
        }
      }))
    };
  }, [stories]);

  if (stories.length === 0) {
    return null; // Don't render widget if there are no stories yet
  }

  return (
    <div className="w-full bg-gradient-to-br from-[#eafaf1] to-emerald-500/5 dark:from-[#05281f] dark:to-emerald-500/10 border border-emerald-500/15 rounded-3xl p-5 mb-4 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a06c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00a06c]"></span>
          </span>
          <span className="text-[13.5px] font-black text-[#008262] dark:text-[#00d29d] flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#00a06c] dark:text-[#00d29d] animate-pulse" />
            실시간 아파트 이야기 한줄평
          </span>
        </div>
        <span className="text-[11px] text-[#008262]/70 dark:text-[#00d29d]/70 font-semibold flex items-center">
          실시간 피드
        </span>
      </div>

      {/* Horizontal Scrollable Container */}
      <div className="flex gap-3.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-emerald-500/10 hover:scrollbar-thumb-emerald-500/20 dark:scrollbar-thumb-emerald-500/5 dark:hover:scrollbar-thumb-emerald-500/10">
        {stories.map((story) => {
          // Convert firestore timestamp to string safely
          let timeText = '방금 전';
          if (story.createdAt) {
            const date = story.createdAt.toDate ? story.createdAt.toDate() : new Date(story.createdAt);
            const now = Date.now();
            const diffMs = now - date.getTime();
            const diffMin = Math.floor(diffMs / (1000 * 60));
            const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffMin < 1) timeText = '방금 전';
            else if (diffMin < 60) timeText = `${diffMin}분 전`;
            else if (diffHour < 24) timeText = `${diffHour}시간 전`;
            else timeText = `${date.getMonth() + 1}월 ${date.getDate()}일`;
          }

          return (
            <div
              key={story.id}
              onClick={() => handleCardClick(story.apartmentName)}
              className="min-w-[280px] max-w-[280px] flex flex-col justify-between p-4 bg-surface hover:bg-body border border-border/60 hover:border-emerald-500/30 rounded-2xl cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-[0_8px_16px_rgba(0,130,98,0.06)] dark:hover:shadow-[0_8px_16px_rgba(0,0,0,0.3)] shrink-0"
            >
              <div>
                {/* Header: Apartment Name & Icon */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-900/20 group-hover:bg-[#008262] transition-colors">
                    <Home size={12} className="text-[#008262] dark:text-[#00d29d] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[12.5px] font-extrabold text-primary truncate flex-1 group-hover:text-[#008262] dark:group-hover:text-[#00d29d] transition-colors">
                    {story.apartmentName}
                  </span>
                  <ChevronRight size={14} className="text-tertiary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>

                {/* Content: Comment Text */}
                <p className="text-[13px] font-semibold text-secondary line-clamp-2 leading-relaxed mb-3 break-all">
                  &quot;{story.text}&quot;
                </p>
              </div>

              {/* Footer: Author Name & Time */}
              <div className="flex justify-between items-center text-[10.5px] text-tertiary border-t border-border/30 pt-2 shrink-0">
                <span className="font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"></span>
                  {story.authorName}
                </span>
                <span className="font-medium font-sans">{timeText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
