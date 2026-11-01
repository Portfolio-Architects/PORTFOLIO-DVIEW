'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  BadgeCheck,
  ThumbsUp,
  MessageSquare,
  Trash2,
  AlertTriangle,
  Send,
  Loader2,
  Eye,
} from 'lucide-react';
import { BoardPostDto, BoardCommentDto } from '@/types/board';
import { formatRelativeTime, formatDateTime } from '@/lib/board/boardFormatters';
import { AdSlot } from '@/components/ads/AdSlot';

export interface BoardPostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BoardPostDto | null;
  comments: BoardCommentDto[];
  isLoadingComments?: boolean;
  selectedAuthorTitle: string | null;
  authorDong?: string | null;
  isAuthorGpsVerified: boolean;
  onToggleLike: (postId: string) => Promise<boolean | void>;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onCreateComment: (content: string) => Promise<boolean | void>;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  onPromptSelectTitle?: () => void;
}

export function BoardPostDetailModal({
  isOpen,
  onClose,
  post,
  comments,
  isLoadingComments = false,
  selectedAuthorTitle,
  authorDong,
  isAuthorGpsVerified,
  onToggleLike,
  onDeletePost,
  onCreateComment,
  onDeleteComment,
  onPromptSelectTitle,
}: BoardPostDetailModalProps) {
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean>(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState<number>(0);
  const [showConfirmDeletePost, setShowConfirmDeletePost] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (post) {
      setOptimisticLiked(Boolean(post.isLiked));
      setOptimisticLikeCount(post.likeCount);
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleLikeClick = async () => {
    if (isLiking) return;
    try {
      setIsLiking(true);
      const nextLiked = !optimisticLiked;
      setOptimisticLiked(nextLiked);
      setOptimisticLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

      await onToggleLike(post.id);
    } catch {
      // Rollback on failure
      setOptimisticLiked(post.isLiked ?? false);
      setOptimisticLikeCount(post.likeCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handlePostDeleteConfirm = async () => {
    if (!onDeletePost) return;
    try {
      setIsDeletingPost(true);
      await onDeletePost(post.id);
      setShowConfirmDeletePost(false);
      onClose();
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentContent.trim();
    if (!trimmed || isSubmittingComment) return;

    if (!selectedAuthorTitle) {
      if (onPromptSelectTitle) {
        onPromptSelectTitle();
      }
      return;
    }

    try {
      setIsSubmittingComment(true);
      setCommentError(null);
      await onCreateComment(trimmed);
      setCommentContent('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '댓글 작성에 실패했습니다.';
      setCommentError(msg);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!onDeleteComment) return;
    try {
      setDeletingCommentId(commentId);
      await onDeleteComment(commentId);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const canDeletePost = Boolean(post.canDelete || post.isMine);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-detail-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-surface dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-primary max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-secondary">
            <span>게시글 상세</span>
            {post.isMine && (
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                내 작성글
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1 rounded-lg text-tertiary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Post Header: Title, Author, Date, Delete Button */}
          <div className="space-y-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <h1
                id="post-detail-modal-heading"
                className="text-lg sm:text-xl font-black text-primary leading-snug"
              >
                {post.title}
              </h1>

              {canDeletePost && (
                <button
                  type="button"
                  data-testid="detail-delete-post-btn"
                  onClick={() => setShowConfirmDeletePost(true)}
                  aria-label="게시글 삭제"
                  className="shrink-0 p-1.5 rounded-lg text-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-secondary">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-primary bg-slate-200/80 dark:bg-slate-800 px-2.5 py-1 rounded-[6px]">
                  {post.authorTitle}
                </span>

                {post.isGpsVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>입주민 인증</span>
                  </span>
                )}

                {post.authorDong && (
                  <span className="text-[11px] font-bold text-tertiary">
                    {post.authorDong}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-tertiary font-semibold tabular-nums">
                <span>{formatDateTime(post.createdAt)}</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {post.viewCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Post Body Content */}
          <div className="text-sm sm:text-base text-primary leading-relaxed whitespace-pre-wrap py-2 min-h-[80px]">
            {post.content}
          </div>

          {/* Live Recommendation (Like) Button */}
          <div className="flex justify-center py-2">
            <button
              type="button"
              data-testid="detail-like-btn"
              onClick={handleLikeClick}
              disabled={isLiking}
              className={`h-[44px] px-6 rounded-2xl flex items-center gap-2 font-extrabold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer ${
                optimisticLiked
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-elevated hover:bg-slate-200/80 dark:hover:bg-slate-800 text-primary'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${optimisticLiked ? 'fill-current' : ''}`} />
              <span>추천</span>
              <span className="tabular-nums font-black ml-0.5">{optimisticLikeCount}</span>
            </button>
          </div>

          {/* In-feed AdSlot with Zero-CLS */}
          <div
            data-testid="detail-ad-slot-container"
            className="w-full my-4 rounded-2xl overflow-hidden bg-elevated dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 min-h-[140px]"
          >
            <AdSlot
              slotId="1000000003"
              format="in-feed"
              minHeightClass="min-h-[140px]"
            />
          </div>

          {/* Comments Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm sm:text-base font-black text-primary">
                댓글 <span className="tabular-nums text-blue-600 dark:text-blue-400">{comments.length}</span>
              </h3>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-secondary">
                <div className="flex items-center gap-1.5">
                  <span>작성자:</span>
                  {selectedAuthorTitle ? (
                    <span className="text-primary font-black">
                      [{selectedAuthorTitle}]
                      {isAuthorGpsVerified && (
                        <span className="text-emerald-600 font-extrabold ml-1">인증</span>
                      )}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={onPromptSelectTitle}
                      className="text-blue-600 dark:text-blue-400 underline font-extrabold"
                    >
                      단지 타이틀 선택 필요
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  data-testid="detail-comment-input"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="동탄 이웃을 존중하는 따뜻한 댓글을 남겨주세요."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-elevated dark:bg-slate-800 text-xs sm:text-sm font-medium text-primary placeholder:text-tertiary outline-none focus:ring-2 focus:ring-blue-600/30 transition-all resize-none leading-relaxed"
                />
              </div>

              {commentError && (
                <div className="text-xs text-red-500 font-bold">
                  {commentError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-tertiary tabular-nums">
                  {commentContent.length}/500
                </span>
                <button
                  type="submit"
                  data-testid="detail-comment-submit-btn"
                  disabled={!commentContent.trim() || isSubmittingComment}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>댓글 등록</span>
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3 pt-2">
              {isLoadingComments ? (
                <div className="py-6 text-center text-xs text-tertiary flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>댓글을 불러오는 중...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-xs text-tertiary font-medium">
                  등록된 댓글이 없습니다. 첫 댓글을 남겨보세요!
                </div>
              ) : (
                comments.map((c) => {
                  const canDeleteComment = Boolean(c.canDelete || c.isMine);
                  const isAuthorOfPost = c.authorTitle === post.authorTitle;

                  return (
                    <div
                      key={c.id}
                      data-testid={`comment-item-${c.id}`}
                      className="p-3.5 rounded-xl bg-elevated dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="font-extrabold text-primary">
                            {c.authorTitle}
                          </span>
                          {c.isGpsVerified && (
                            <span className="inline-flex items-center gap-0.5 text-[10.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded">
                              <BadgeCheck className="w-3 h-3" /> 인증
                            </span>
                          )}
                          {isAuthorOfPost && (
                            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                              글쓴이
                            </span>
                          )}
                          {c.isMine && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                              내 댓글
                            </span>
                          )}
                          <span className="text-[11px] text-tertiary font-medium tabular-nums ml-1">
                            {formatRelativeTime(c.createdAt)}
                          </span>
                        </div>

                        {canDeleteComment && (
                          <button
                            type="button"
                            data-testid={`delete-comment-btn-${c.id}`}
                            onClick={() => handleCommentDelete(c.id)}
                            disabled={deletingCommentId === c.id}
                            className="p-1 rounded text-tertiary hover:text-red-500 transition-colors"
                            aria-label="댓글 삭제"
                          >
                            {deletingCommentId === c.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-primary leading-relaxed whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Sub-modal */}
        {showConfirmDeletePost && (
          <div
            data-testid="detail-delete-confirm-dialog"
            className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          >
            <div className="w-full max-w-xs text-center space-y-3 bg-surface dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-primary">게시글 삭제</h4>
                <p className="text-xs text-secondary">
                  작성하신 게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDeletePost(false)}
                  disabled={isDeletingPost}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-secondary"
                >
                  취소
                </button>
                <button
                  type="button"
                  data-testid="detail-confirm-delete-action-btn"
                  onClick={handlePostDeleteConfirm}
                  disabled={isDeletingPost}
                  className="flex-1 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeletingPost ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BoardPostDetailModal;
