/**
 * @module usePostDetail
 * @description Application hook for retrieving and managing single post details,
 * comments, likes, and views with race-condition guards and cancellation lifecycle management.
 * Architecture Layer: Application / Hooks (`src/hooks/`)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PostDetail, PostComment } from '@/types/lounge';
import * as PostRepo from '@/lib/repositories/post.repository';
import { logger } from '@/lib/services/logger';

export interface UsePostDetailReturn {
  post: PostDetail | null;
  comments: PostComment[];
  isLoading: boolean;
  error: Error | null;
  likes: number;
  views: number;
  toggleLike: (userUid?: string) => Promise<void>;
  addComment: (text: string, authorName: string, authorUid: string) => Promise<void>;
  deleteComment: (commentId: string, authorUid: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePostDetail(postId?: string | null): UsePostDetailReturn {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [likes, setLikes] = useState<number>(0);
  const [views, setViews] = useState<number>(0);

  const isMountedRef = useRef(true);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPostData = useCallback(async (targetPostId: string, requestId: number) => {
    if (!targetPostId) return;

    setIsLoading(true);
    setError(null);

    try {
      const postData = await PostRepo.getPost(targetPostId);

      if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }

      if (!postData) {
        setPost(null);
        setError(new Error(`Post not found: ${targetPostId}`));
        return;
      }

      const canonicalPost: PostDetail = {
        id: postData.id,
        title: postData.title,
        content: postData.content,
        category: postData.category,
        author: postData.author,
        authorUid: postData.authorUid || undefined,
        verifiedApartment: postData.verifiedApartment || undefined,
        verificationLevel: postData.verificationLevel || undefined,
        likes: postData.likes,
        views: postData.views,
        commentCount: 0,
        createdAt: postData.createdAt ?? undefined,
      };

      setPost(canonicalPost);
      setLikes(postData.likes);
      setViews(postData.views);
    } catch (err) {
      if (!isMountedRef.current || activeRequestIdRef.current !== requestId) return;
      const errorObj = err instanceof Error ? err : new Error(String(err));
      logger.error('usePostDetail.fetchPostData', 'Failed to fetch post detail', { targetPostId }, errorObj);
      setError(errorObj);
    } finally {
      if (isMountedRef.current && activeRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!postId) {
      activeRequestIdRef.current += 1;
      setPost(null);
      setComments([]);
      setIsLoading(false);
      setError(null);
      setLikes(0);
      setViews(0);
      return;
    }

    const currentRequestId = ++activeRequestIdRef.current;
    fetchPostData(postId, currentRequestId);

    // Subscribe to post comments
    const unsubscribe = PostRepo.listenToComments(postId, (incomingComments) => {
      if (!isMountedRef.current || activeRequestIdRef.current !== currentRequestId) return;
      setComments(incomingComments as unknown as PostComment[]);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [postId, fetchPostData]);

  const toggleLike = useCallback(
    async (_userUid?: string) => {
      if (!postId || !post) return;
      try {
        setLikes((prev) => prev + 1);
        await PostRepo.likePost(postId);
      } catch (err) {
        setLikes((prev) => Math.max(0, prev - 1));
        logger.warn('usePostDetail.toggleLike', 'Failed to like post', { postId }, err as Error);
      }
    },
    [postId, post]
  );

  const addComment = useCallback(
    async (text: string, authorName: string, authorUid: string) => {
      if (!postId || !text.trim()) return;
      try {
        await PostRepo.addComment(postId, text, authorName, authorUid);
      } catch (err) {
        logger.error('usePostDetail.addComment', 'Failed to add comment', { postId }, err as Error);
        throw err;
      }
    },
    [postId]
  );

  const deleteComment = useCallback(
    async (commentId: string, authorUid: string) => {
      if (!postId || !commentId) return;
      try {
        await PostRepo.deleteComment(postId, commentId, authorUid);
      } catch (err) {
        logger.error('usePostDetail.deleteComment', 'Failed to delete comment', { postId, commentId }, err as Error);
        throw err;
      }
    },
    [postId]
  );

  const refetch = useCallback(async () => {
    if (postId) {
      const currentRequestId = ++activeRequestIdRef.current;
      await fetchPostData(postId, currentRequestId);
    }
  }, [postId, fetchPostData]);

  return {
    post,
    comments,
    isLoading,
    error,
    likes,
    views,
    toggleLike,
    addComment,
    deleteComment,
    refetch,
  };
}
