import { useSyncExternalStore, useCallback, useState, useEffect } from 'react';
import { dashboardFacade } from '@/lib/DashboardFacade';
import type { KPIData, NewsItemData } from '@/lib/types/dashboard.types';
import type { FieldReportData } from '@/lib/types/report.types';
import type { UserReview } from '@/lib/types/review.types';
import { localCache } from '@/lib/utils/localCache';
import { ViewedAptsSchema, QuizAnswerSchema } from '@/lib/validation/facade.schemas';
import { z } from 'zod';

export type QuizAnswers = z.infer<typeof QuizAnswerSchema>;

const EMPTY_ARRAY: never[] = [];

/**
 * React hook providing reactive dashboard data via useSyncExternalStore.
 * Avoids global array spread deep-copies and triggers re-renders ONLY when specific data references change.
 */
export function useDashboardData() {
  const kpis = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('kpis', cb), []),
    () => dashboardFacade.getKPIs(),
    () => EMPTY_ARRAY as KPIData[]
  );

  const newsFeed = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('newsFeed', cb), []),
    () => dashboardFacade.getNewsFeed(),
    () => EMPTY_ARRAY as NewsItemData[]
  );

  const fieldReports = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('fieldReports', cb), []),
    () => dashboardFacade.getFieldReports(),
    () => EMPTY_ARRAY as FieldReportData[]
  );

  const userReviews = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('userReviews', cb), []),
    () => dashboardFacade.getUserReviews(),
    () => EMPTY_ARRAY as UserReview[]
  );

  const dongtanApartments = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('dongtanApartments', cb), []),
    () => dashboardFacade.getDongtanApartments(),
    () => EMPTY_ARRAY as string[]
  );

  // Load viewed apartments history and lifestyle quiz answers from local cache
  const [viewedApts, setViewedApts] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadCachedData = () => {
      const apts = localCache.get('dview_viewed_apts', ViewedAptsSchema, []);
      const answers = localCache.get('drive_quiz_answers', QuizAnswerSchema, null);
      setViewedApts(apts);
      setQuizAnswers(answers);
    };

    loadCachedData();

    window.addEventListener('dview_viewed_apts_changed', loadCachedData);
    window.addEventListener('drive_quiz_answers_changed', loadCachedData);
    return () => {
      window.removeEventListener('dview_viewed_apts_changed', loadCachedData);
      window.removeEventListener('drive_quiz_answers_changed', loadCachedData);
    };
  }, []);

  return {
    kpis,
    newsFeed,
    fieldReports,
    userReviews,
    dongtanApartments,
    adBanner: dashboardFacade.getAdBanner(),
    viewedApts,
    quizAnswers,
  };
}
