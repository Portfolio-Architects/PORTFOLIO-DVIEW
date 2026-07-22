/**
 * Preload ApartmentModal and its sub-components to achieve instant transitions
 */
export function preloadApartmentModal() {
  if (typeof window === 'undefined') return;
  
  // Preload main component
  import('@/components/ApartmentModal').catch(() => {});
  
  // Preload ApartmentModal sub-components as well for 0ms transition stutter
  import('@/components/CommentSection').catch(() => {});
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
}

/**
 * Preload other heavy dashboard client features
 */
export function preloadDashboardFeatures() {
  if (typeof window === 'undefined') return;
  import('@/components/GapInvestmentExplorer').catch(() => {});
  import('@/components/LoungeContainerClient').catch(() => {});
  import('@/components/MacroDashboardClient').catch(() => {});
  import('@/components/OfficeExplorerClient').catch(() => {});
}
