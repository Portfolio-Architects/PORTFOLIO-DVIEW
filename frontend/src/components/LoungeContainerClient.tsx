'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import PageHeroHeader from './PageHeroHeader';
import { safeReload } from '@/lib/utils/safeReload';

const LoungeFeedClient = dynamic(() => import('@/components/LoungeFeedClient').catch(err => {
  console.warn('LoungeFeedClient Chunk Load failure, initiating fallback reload', err);
  safeReload('LoungeFeedClient');
  return { default: () => null };
}), { ssr: false });

const LoungeComposeClient = dynamic(() => import('@/components/LoungeComposeClient').catch(err => {
  console.warn('LoungeComposeClient Chunk Load failure, initiating fallback reload', err);
  safeReload('LoungeComposeClient');
  return { default: () => null };
}), { ssr: false });

// Same Post interface needed for initial posts typing
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

const LoungeContainerClient = React.memo(function LoungeContainerClient({ 
  initialPosts,
  searchParams,
  onRequestLogin,
}: { 
  initialPosts: Post[];
  searchParams?: { notice?: string };
  onRequestLogin?: (message: string) => void;
}) {
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        <LoungeFeedClient initialPosts={initialPosts} currentTab="모든 이야기" />
        <LoungeComposeClient currentTab="모든 이야기" onRequestLogin={onRequestLogin} />
      </div>
    </div>
  );
});

LoungeContainerClient.displayName = 'LoungeContainerClient';
export default LoungeContainerClient;
