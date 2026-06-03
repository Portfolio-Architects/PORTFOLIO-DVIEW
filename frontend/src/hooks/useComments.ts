import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { dashboardFacade, CommentData, FieldReportData } from '@/lib/DashboardFacade';

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

  useEffect(() => {
    // Determine the actual ID to use for fetching comments.
    const actualReportId = fullReportData ? fullReportData.id : selectedReport?.id;
    
    if (actualReportId && !actualReportId.startsWith('stub-') && !commentsData[actualReportId]) {
      if (dashboardFacade.listenToComments) {
        const unsubscribe = dashboardFacade.listenToComments(actualReportId, (comments) => {
          setCommentsData(prev => ({ ...prev, [actualReportId]: comments }));
        });
        return () => unsubscribe();
      }
    }
  }, [selectedReport, fullReportData, commentsData]);

  const handleSubmitComment = async (reportId: string) => {
    if (!user) { 
      alert("로그인 후 댓글을 남길 수 있습니다."); 
      requestLogin(); 
      return; 
    }
    const text = commentInput[reportId];
    if (!text?.trim()) return;

    if (dashboardFacade.addFieldReportComment) {
      await dashboardFacade.addFieldReportComment(reportId, text, user.uid);
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
      console.warn('Failed to send push notification trigger:', pushErr);
    }

    setCommentInput(prev => ({ ...prev, [reportId]: '' }));
  };

  return {
    commentsData,
    commentInput,
    setCommentInput,
    handleSubmitComment
  };
}
