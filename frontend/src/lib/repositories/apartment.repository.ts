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
    let byDong: Record<string, { name: string }[]> = {};

    if (typeof window === 'undefined') {
      // Server-side: read directly from the static file to avoid relative URL fetch failures
      try {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.resolve(process.cwd(), 'public/data/apartments-by-dong.json');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const result = JSON.parse(content);
          byDong = result.byDong || {};
        }
      } catch (fsError) {
        logger.warn('ApartmentRepository.fetch', 'Failed to read apartments-by-dong.json from filesystem', undefined, fsError);
      }
    }

    // Fallback/Client-side: Fetch via HTTP API
    if (Object.keys(byDong).length === 0) {
      const response = await fetch('/api/apartments-by-dong', {
        cache: 'no-store', // force fresh data
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      byDong = result.byDong || {};
    }
    
    const apartments: string[] = [];
    for (const [dong, apts] of Object.entries(byDong)) {
      for (const apt of apts) {
        apartments.push(`[${dong}] ${apt.name}`);
      }
    }
    
    apartments.sort();
    logger.info('ApartmentRepository.fetch', `Loaded ${apartments.length} apartments successfully`);
    return apartments;
  } catch (error) {
    logger.warn('ApartmentRepository.fetch', '/api/apartments-by-dong failed', undefined, error);
    return [];
  }
}
