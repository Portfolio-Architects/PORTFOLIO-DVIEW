'use client';

import React, { useState } from 'react';
import {
  BadgeCheck,
  ThumbsUp,
  MessageSquare,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { BoardPostDto } from '@/types/board';
import { formatRelativeTime } from '@/lib/board/boardFormatters';

export interface BoardPostCardProps {
  post: BoardPostDto;
  onClick?: (post: BoardPostDto) => void;
  onDelete?: (postId: string) => Promise<void> | void;
}

export function BoardPostCard({ post, onClick, onDelete }: BoardPostCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(post.id);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(false);
  };

  const canShowDelete = Boolean(post.canDelete || post.isMine);

  return (
    <article
      data-testid={`board-post-card-${post.id}`}
      onClick={() => onClick && onClick(post)}
      className="group relative w-full bg-elevated hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] rounded-2xl p-4 sm:p-5 transition-colors cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-slate-800"
    >
      {/* Header Row: Complex badge, GPS mark, relative time, delete button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="bg-slate-200/80 dark:bg-slate-800 text-primary font-bold text-xs px-2.5 py-1 rounded-[6px] truncate max-w-[200px]">
            {post.authorTitle}
          </span>

          {post.isGpsVerified && (
            <span
              data-testid="gps-verified-badge"
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-[4px]"
            >
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>인증</span>
            </span>
          )}

          {post.isMine && (
            <span
              data-testid="my-post-badge"
              className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full"
            >
              내 글
            </span>
          )}

          <span className="text-xs text-tertiary font-semibold tabular-nums ml-1">
            {formatRelativeTime(post.createdAt)}
          </span>
        </div>

        {/* Author-only Delete Button */}
        {canShowDelete && (
          <div className="relative shrink-0">
            <button
              type="button"
              data-testid={`delete-post-btn-${post.id}`}
              onClick={handleDeleteClick}
              aria-label="게시글 삭제"
              className="p-1.5 rounded-lg text-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Title & Content Preview */}
      <div className="space-y-1.5">
        <h3 className="text-base font-extrabold text-primary line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-secondary line-clamp-2 leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Footer Row: Metrics (Views, Likes, Comments) */}
      <div className="flex items-center gap-4 mt-3 pt-2 text-xs text-tertiary font-semibold border-t border-slate-200/40 dark:border-slate-800/40">
        <div className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          <span className="tabular-nums">{post.viewCount ?? 0}</span>
        </div>

        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <ThumbsUp className="w-3.5 h-3.5" />
          <span className="tabular-nums font-bold">{post.likeCount}</span>
        </div>

        <div className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="tabular-nums font-bold">{post.commentCount}</span>
        </div>
      </div>

      {/* Passwordless Confirmation Modal for Author Delete */}
      {showConfirmDelete && (
        <div
          data-testid="delete-confirm-dialog"
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-xs rounded-2xl flex items-center justify-center p-4 animate-in fade-in duration-100"
        >
          <div className="w-full max-w-xs text-center space-y-3 bg-surface dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="w-9 h-9 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-primary">게시글 삭제</h4>
              <p className="text-xs text-secondary">
                작성하신 게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-secondary"
              >
                취소
              </button>
              <button
                type="button"
                data-testid="confirm-delete-action-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-1.5 rounded-lg text-xs font-black bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default BoardPostCard;
