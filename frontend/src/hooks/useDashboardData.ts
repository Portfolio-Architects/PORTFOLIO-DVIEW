import { useSyncExternalStore, useCallback } from 'react';
import { dashboardFacade } from '@/lib/DashboardFacade';
import type { KPIData, NewsItemData } from '@/lib/types/dashboard.types';
import type { FieldReportData } from '@/lib/types/report.types';
import type { UserReview } from '@/lib/types/review.types';

const EMPTY_ARRAY: any[] = [];

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

  return {
    kpis,
    newsFeed,
    fieldReports,
    userReviews,
    dongtanApartments,
    adBanner: dashboardFacade.getAdBanner(),
  };
}
