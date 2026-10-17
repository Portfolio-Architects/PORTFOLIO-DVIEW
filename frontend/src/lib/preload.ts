/**
 * @module preload
 * @description Non-blocking, prioritized asset and component preloader using requestIdleCallback.
 * Architecture Layer: Core Library / Utilities
 */

/**
 * Safely schedule a callback to run during browser idle time, or fallback to setTimeout.
 */
export function scheduleIdle(callback: () => void, timeoutMs: number = 2000): void {
  if (typeof window === 'undefined') return;
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => callback(), { timeout: timeoutMs });
  } else {
    setTimeout(callback, Math.min(timeoutMs, 200));
  }
}

/**
 * Generic helper to preload a dynamic component chunk during browser idle time.
 */
export function preloadComponent(importer: () => Promise<unknown>, timeoutMs: number = 2000): void {
  if (typeof window === 'undefined') return;
  scheduleIdle(() => {
    importer().catch(() => {});
  }, timeoutMs);
}

/**
 * Preload ApartmentModal and its sub-components to achieve instant transitions.
 * Supports immediate loading for user interaction (hover/touch) or non-blocking idle scheduling.
 */
export function preloadApartmentModal(immediate: boolean = false): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV === 'development' && !immediate) return;

  const load = () => {
    // Preload canonical main component
    import('@/components/apartment/ApartmentModal').catch(() => {});

    // Preload ApartmentModal sub-components for 0ms transition stutter
    import('@/components/apartment-modal/ViralPaywallGate').catch(() => {});
    import('@/components/apartment-modal/JeonseSafetyReport').catch(() => {});
    import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
    import('@/components/apartment-modal/PhotoUploadModal').catch(() => {});
    import('@/components/apartment-modal/BuyOrWaitVote').catch(() => {});
    import('@/components/apartment-modal/EducationAnalysisSection').catch(() => {});
    import('@/components/apartment-modal/InfraAnalysisSection').catch(() => {});
    import('@/components/apartment-modal/ScoutingReportDetailSection').catch(() => {});
    import('@/components/consumer/AdvancedValuationMetrics').catch(() => {});
    import('@/components/consumer/AnchorTenantCard').catch(() => {});
  };

  if (immediate) {
    load();
  } else {
    scheduleIdle(load, 1500);
  }
}

/**
 * Preload heavy dashboard client features.
 */
export function preloadDashboardFeatures(immediate: boolean = false): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV === 'development' && !immediate) return;

  const load = () => {
    import('@/components/GapInvestmentExplorer').catch(() => {});
    import('@/components/MacroDashboardClient').catch(() => {});
    import('@/components/OfficeExplorerClient').catch(() => {});
  };

  if (immediate) {
    load();
  } else {
    scheduleIdle(load, 2500);
  }
}
