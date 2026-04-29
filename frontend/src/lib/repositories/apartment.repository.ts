/**
 * @module apartment.repository
 * @description Data Access Layer for Dongtan apartment list.
 * Architecture Layer: Repository (data access)
 * 
 * Uses /api/apartments-by-dong (Google Sheets) as single source of truth
 * for all apartment lists: 동네리뷰 선택, 입주민 인증, 임장기 작성 등
 */
import { logger } from '@/lib/services/logger';

/**
 * Fetches full apartment list from /api/apartments-by-dong (Google Sheets).
 * Returns in "[법정동] 아파트명" format for WriteReviewModal, resident verification, etc.
 */
export async function fetchApartmentNames(): Promise<string[]> {
  try {
    const response = await fetch('/api/apartments-by-dong', {
      cache: 'no-store', // force fresh data
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    const byDong: Record<string, { name: string }[]> = result.byDong || {};
    
    const apartments: string[] = [];
    for (const [dong, apts] of Object.entries(byDong)) {
      for (const apt of apts) {
        apartments.push(`[${dong}] ${apt.name}`);
      }
    }
    
    apartments.sort();
    logger.info('ApartmentRepository.fetch', `Loaded ${apartments.length} apartments from Google Sheets`);
    return apartments;
  } catch (error) {
    logger.warn('ApartmentRepository.fetch', '/api/apartments-by-dong failed', undefined, error);
    return [];
  }
}
