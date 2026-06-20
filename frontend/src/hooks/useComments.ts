import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { dashboardFacade, CommentData, FieldReportData } from '@/lib/DashboardFacade';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

const CommentSchema = z.object({
  id: z.string().catch(''),
  text: z.string().catch(''),
  authorUid: z.string().catch(''),
  authorName: z.string().catch('익명'),
  createdAt: z.any().optional(),
}).passthrough();

export interface UseCommentsReturn {
  commentsData: Record<string, CommentData[]>;
  commentInput: Record<string, string>;
  setCommentInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSubmitComment: (reportId: string) => Promise<void>;
}

export function useComments(
  selectedReport: FieldReportData | null,
  fullReportData: FieldReportData | null,
  user: User | null,
  requestLogin: () => void
): UseCommentsReturn {
  const [commentsData, setCommentsData] = useState<Record<string, CommentData[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Determine the actual ID to use for fetching comments.
    const actualReportId = fullReportData ? fullReportData.id : selectedReport?.id;
    if (!actualReportId || actualReportId.startsWith('stub-')) return;
    
    if (dashboardFacade.listenToComments) {
      const unsubscribe = dashboardFacade.listenToComments(actualReportId, (comments) => {
        const validatedComments = Array.isArray(comments)
          ? comments.map(c => {
              const parsed = CommentSchema.safeParse(c);
              if (!parsed.success) {
                logger.warn('useComments.listenToComments', 'Invalid comment record detected', { record: c });
              }
              return parsed.success ? parsed.data : c;
            })
          : [];
        setCommentsData(prev => ({ ...prev, [actualReportId]: validatedComments as CommentData[] }));
      });
      return () => unsubscribe();
    }
  }, [selectedReport?.id, fullReportData?.id]);

  // Keep commentInput in a ref to prevent handleSubmitComment from changing reference on every keystroke
  const commentInputRef = useRef(commentInput);
  useEffect(() => {
    commentInputRef.current = commentInput;
  }, [commentInput]);

  const handleSubmitComment = useCallback(async (reportId: string) => {
    if (!user) { 
      alert("로그인 후 댓글을 남길 수 있습니다."); 
      requestLogin(); 
      return; 
    }
    const text = commentInputRef.current[reportId];
    if (!text?.trim()) return;

    const apartmentName = fullReportData?.apartmentName || selectedReport?.apartmentName || '';

    try {
      if (dashboardFacade.addFieldReportComment) {
        await dashboardFacade.addFieldReportComment(reportId, text, user.uid, apartmentName);
      }
      
      // Trigger push notification to report author
      try {
        let profile = null;
        if (dashboardFacade.getUserProfile) {
          profile = await dashboardFacade.getUserProfile(user.uid);
        }
        const nickname = profile?.nickname || user.displayName || user.email || '익명';
        await fetch('/api/push/notify-comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            commentText: text,
            authorName: nickname,
            commentAuthorUid: user.uid
          }),
        });
      } catch (pushErr) {
        logger.warn('useComments.handleSubmitComment', 'Failed to send push notification trigger', {}, pushErr as Error);
      }

      if (isMountedRef.current) {
        setCommentInput(prev => ({ ...prev, [reportId]: '' }));
      }
    } catch (error) {
      console.error("Comment submission failed", error);
      alert("댓글 저장에 실패했습니다. (" + (error instanceof Error ? error.message : String(error)) + ")");
    }
  }, [user, fullReportData, selectedReport, requestLogin]);

  return {
    commentsData,
    commentInput,
    setCommentInput,
    handleSubmitComment
  };
}
