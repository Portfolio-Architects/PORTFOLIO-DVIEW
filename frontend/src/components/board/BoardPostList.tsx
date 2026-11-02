'use client';

import React from 'react';
import { PenSquare, MessageSquareDashed } from 'lucide-react';
import { BoardPostDto } from '@/types/board';
import { BoardPostCard } from './BoardPostCard';
import { AdSlot } from '@/components/ads/AdSlot';

export interface BoardPostListProps {
  posts: BoardPostDto[];
  isLoading: boolean;
  onPostClick: (post: BoardPostDto) => void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onOpenWriteModal?: () => void;
}

export function BoardPostList({
  posts,
  isLoading,
  onPostClick,
  onDeletePost,
  onOpenWriteModal,
}: BoardPostListProps) {
  // Skeleton loading view
  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-3.5" data-testid="board-post-list-skeleton">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-full bg-elevated dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/40 dark:border-slate-800/40 animate-pulse space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="flex items-center gap-4 pt-2">
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state view
  if (!isLoading && posts.length === 0) {
    return (
      <div
        data-testid="board-post-list-empty"
        className="w-full min-h-[260px] bg-elevated dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-3.5"
      >
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <MessageSquareDashed className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm sm:text-base font-black text-primary">
            아직 등록된 이야기가 없습니다.
          </h4>
          <p className="text-xs sm:text-sm text-secondary">
            우리 단지와 동탄 이웃에게 첫 번째 글을 작성해 보세요!
          </p>
        </div>
        {onOpenWriteModal && (
          <button
            type="button"
            onClick={onOpenWriteModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
          >
            <PenSquare className="w-4 h-4" />
            <span>첫 이야기 쓰기</span>
          </button>
        )}
      </div>
    );
  }

  // Regular Feed with in-feed AdSlot inserted after 3rd post (or end)
  const AD_INSERT_INDEX = 3;

  return (
    <div className="space-y-3.5" data-testid="board-post-list">
      {posts.map((post, idx) => {
        const showInFeedAd = idx === AD_INSERT_INDEX;

        return (
          <React.Fragment key={post.id}>
            {showInFeedAd && (
              <div
                data-testid="in-feed-ad-slot-container"
                className="my-3 w-full rounded-2xl overflow-hidden bg-elevated dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 min-h-[140px]"
              >
                <AdSlot
                  refreshSlotId="board_list_infeed"
                  format="in-feed"
                  minHeightClass="min-h-[140px]"
                />
              </div>
            )}
            <BoardPostCard
              post={post}
              onClick={onPostClick}
              onDelete={onDeletePost}
            />
          </React.Fragment>
        );
      })}

      {/* If fewer than AD_INSERT_INDEX posts, render ad slot at the end */}
      {posts.length < AD_INSERT_INDEX && (
        <div
          data-testid="in-feed-ad-slot-container-trailing"
          className="mt-4 w-full rounded-2xl overflow-hidden bg-elevated dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 min-h-[140px]"
        >
          <AdSlot
            refreshSlotId="board_list_trailing_infeed"
            format="in-feed"
            minHeightClass="min-h-[140px]"
          />
        </div>
      )}
    </div>
  );
}

export default BoardPostList;
