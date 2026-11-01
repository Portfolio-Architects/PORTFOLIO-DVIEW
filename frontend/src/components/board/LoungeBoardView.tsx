'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PenSquare,
  Building2,
  Navigation,
  BadgeCheck,
  Lock,
  Sparkles,
  Flame,
  Clock,
} from 'lucide-react';
import {
  getToggleTrackClass,
  getToggleBtnClass,
} from '@/lib/design-system/controls';
import { BoardPostDto, BoardCommentDto, PostCreateInput } from '@/types/board';
import { useBoardAuthor } from '@/hooks/useBoardAuthor';
import { BoardPostList } from './BoardPostList';
import { BoardPostWriteModal } from './BoardPostWriteModal';
import { BoardPostDetailModal } from './BoardPostDetailModal';
import { ApartmentTitleSelectorModal } from './ApartmentTitleSelectorModal';
import { GpsVerificationModal } from './GpsVerificationModal';

export type SortType = 'latest' | 'popular';

export function LoungeBoardView() {
  const {
    authorToken,
    selectedTitle,
    dong,
    isLocked,
    daysRemaining,
    isGpsVerified,
    gpsVerifiedComplex,
    setLockedTitle,
    verifyLocation,
    refreshProfile,
  } = useBoardAuthor();

  const [sort, setSort] = useState<SortType>('latest');
  const [posts, setPosts] = useState<BoardPostDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);

  // Modal open states
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<BoardPostDto | null>(null);
  const [comments, setComments] = useState<BoardCommentDto[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // 1. Fetch Posts
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      const res = await fetch(`/api/board/posts?sort=${sort}&limit=30`, {
        headers: authorToken ? { 'x-author-token': authorToken } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPosts(json.data.posts || []);
          setTotalCount(json.data.total ?? (json.data.posts?.length || 0));
        }
      }
    } catch {
      // Ignore network errors gracefully
    } finally {
      setIsLoadingPosts(false);
    }
  }, [sort, authorToken]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 2. Fetch Comments for Detail Post
  const fetchComments = useCallback(
    async (postId: string) => {
      try {
        setIsLoadingComments(true);
        const res = await fetch(`/api/board/posts/${postId}`, {
          headers: authorToken ? { 'x-author-token': authorToken } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setDetailPost(json.data.post);
            setComments(json.data.comments || []);
          }
        }
      } catch {
        // Ignore
      } finally {
        setIsLoadingComments(false);
      }
    },
    [authorToken]
  );

  const handlePostClick = (post: BoardPostDto) => {
    setDetailPost(post);
    fetchComments(post.id);
  };

  // 3. Create Post
  const handleCreatePost = async (input: PostCreateInput) => {
    const res = await fetch('/api/board/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorToken ? { 'x-author-token': authorToken } : {}),
      },
      body: JSON.stringify({
        ...input,
        authorToken,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || '게시글 작성에 실패했습니다.');
    }

    await fetchPosts();
    await refreshProfile();
  };

  // 4. Delete Post
  const handleDeletePost = async (postId: string) => {
    const res = await fetch(`/api/board/posts/${postId}`, {
      method: 'DELETE',
      headers: authorToken ? { 'x-author-token': authorToken } : {},
    });

    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (detailPost?.id === postId) {
        setDetailPost(null);
      }
    }
  };

  // 5. Toggle Like
  const handleToggleLike = async (postId: string) => {
    const res = await fetch(`/api/board/posts/${postId}/like`, {
      method: 'POST',
      headers: authorToken ? { 'x-author-token': authorToken } : {},
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const { liked, likeCount } = json.data;
        // Update posts feed
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, isLiked: liked, likeCount } : p
          )
        );
        // Update detail post if open
        if (detailPost && detailPost.id === postId) {
          setDetailPost((prev) =>
            prev ? { ...prev, isLiked: liked, likeCount } : null
          );
        }
      }
    }
  };

  // 6. Create Comment
  const handleCreateComment = async (content: string) => {
    if (!detailPost || !selectedTitle) return;

    const res = await fetch(`/api/board/posts/${detailPost.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorToken ? { 'x-author-token': authorToken } : {}),
      },
      body: JSON.stringify({
        content,
        authorTitle: selectedTitle,
        authorDong: dong || undefined,
        isGpsVerified: Boolean(isGpsVerified && gpsVerifiedComplex === selectedTitle),
        authorToken,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || '댓글 작성에 실패했습니다.');
    }

    if (json.data) {
      setComments((prev) => [...prev, json.data]);
      // Update comment count on post
      setPosts((prev) =>
        prev.map((p) =>
          p.id === detailPost.id ? { ...p, commentCount: p.commentCount + 1 } : p
        )
      );
      setDetailPost((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : null
      );
    }
  };

  // 7. Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!detailPost) return;

    const res = await fetch(
      `/api/board/posts/${detailPost.id}/comments/${commentId}`,
      {
        method: 'DELETE',
        headers: authorToken ? { 'x-author-token': authorToken } : {},
      }
    );

    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === detailPost.id ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
        )
      );
      setDetailPost((prev) =>
        prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null
      );
    }
  };

  // 8. Select Title
  const handleSelectTitle = async (title: string) => {
    const res = await setLockedTitle(title);
    if (!res.success) {
      throw new Error(res.message || '단지 타이틀 설정에 실패했습니다.');
    }
  };

  // 9. Location Verification
  const handleVerifyLocation = async (
    complexName: string,
    lat: number,
    lng: number
  ) => {
    return await verifyLocation(complexName, lat, lng);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Container: Title, Participant Count, Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              동탄 입주민 라운지
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>익명 자유게시판</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            동탄 183개 아파트 단지 주민들과 생생한 동네 이야기와 정보를 나눠보세요.
          </p>
        </div>

        {/* Primary CTA: 글쓰기 */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="board-write-btn"
            onClick={() => setIsWriteModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <PenSquare className="w-4 h-4" />
            <span>글쓰기</span>
          </button>
        </div>
      </div>

      {/* Author Profile Status Pill Bar */}
      <div className="p-3.5 rounded-2xl bg-elevated dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-tertiary font-bold">내 작성 프로필:</span>
          {selectedTitle ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-primary bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-[6px]">
                {selectedTitle}
              </span>
              {isGpsVerified && gpsVerifiedComplex === selectedTitle ? (
                <span className="inline-flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>GPS 300m 인증 완료</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsGpsModalOpen(true)}
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>GPS 위치 인증하기</span>
                </button>
              )}

              {isLocked && (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded tabular-nums">
                  <Lock className="w-3 h-3" />
                  <span>30일 고정 D-{daysRemaining}</span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-secondary font-medium">
              아직 설정된 단지 타이틀이 없습니다.
            </span>
          )}
        </div>

        <button
          type="button"
          data-testid="author-profile-select-btn"
          onClick={() => setIsTitleModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto shrink-0"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{selectedTitle ? '단지 변경/확인' : '단지 타이틀 설정'}</span>
        </button>
      </div>

      {/* Filter Bar: Segmented Sort Tabs (최신순 vs 추천순) */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-extrabold text-primary">
            이야기 <span className="text-blue-600 dark:text-blue-400 tabular-nums">{totalCount}</span>개
          </span>
        </div>

        {/* SSOT Design System Segmented Controls */}
        <div className={getToggleTrackClass()} data-testid="board-sort-tabs">
          <button
            type="button"
            data-testid="sort-tab-latest"
            onClick={() => setSort('latest')}
            className={getToggleBtnClass({
              active: sort === 'latest',
              size: 'md',
              tone: 'blue',
            })}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>최신순</span>
          </button>
          <button
            type="button"
            data-testid="sort-tab-popular"
            onClick={() => setSort('popular')}
            className={getToggleBtnClass({
              active: sort === 'popular',
              size: 'md',
              tone: 'blue',
            })}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>추천순</span>
          </button>
        </div>
      </div>

      {/* Posts List & Feed with in-feed AdSlot */}
      <BoardPostList
        posts={posts}
        isLoading={isLoadingPosts}
        onPostClick={handlePostClick}
        onDeletePost={handleDeletePost}
        onOpenWriteModal={() => setIsWriteModalOpen(true)}
      />

      {/* Modals */}
      <BoardPostWriteModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        selectedTitle={selectedTitle}
        dong={dong}
        isGpsVerified={isGpsVerified}
        gpsVerifiedComplex={gpsVerifiedComplex}
        onOpenTitleSelector={() => setIsTitleModalOpen(true)}
        onOpenGpsModal={() => setIsGpsModalOpen(true)}
        onSubmit={handleCreatePost}
      />

      <BoardPostDetailModal
        isOpen={Boolean(detailPost)}
        onClose={() => setDetailPost(null)}
        post={detailPost}
        comments={comments}
        isLoadingComments={isLoadingComments}
        selectedAuthorTitle={selectedTitle}
        authorDong={dong}
        isAuthorGpsVerified={Boolean(isGpsVerified && gpsVerifiedComplex === selectedTitle)}
        onToggleLike={handleToggleLike}
        onDeletePost={handleDeletePost}
        onCreateComment={handleCreateComment}
        onDeleteComment={handleDeleteComment}
        onPromptSelectTitle={() => setIsTitleModalOpen(true)}
      />

      <ApartmentTitleSelectorModal
        isOpen={isTitleModalOpen}
        onClose={() => setIsTitleModalOpen(false)}
        currentTitle={selectedTitle}
        isLocked={isLocked}
        daysRemaining={daysRemaining}
        onSelectTitle={handleSelectTitle}
      />

      <GpsVerificationModal
        isOpen={isGpsModalOpen}
        onClose={() => setIsGpsModalOpen(false)}
        selectedComplex={selectedTitle}
        isGpsVerified={isGpsVerified}
        gpsVerifiedComplex={gpsVerifiedComplex}
        onVerify={handleVerifyLocation}
      />
    </div>
  );
}

export default LoungeBoardView;
