import { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { ZONES } from '@/lib/zones';
import { ALL_MBTI_TYPES } from '@/lib/data/mbtiData';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import {
  getTxSummaryData,
  getTechnoValleyJisanList,
} from '@/lib/services/apartmentPageService';

export const revalidate = 3600; // Revalidate sitemap every hour

/**
 * Generates unified programmatic sitemap for D-VIEW (280 URLs).
 * @complexity Time: O(N), Space: O(N) where N = 280 programmatic entities
 * @sideEffects Read-only file cache and optional Firestore metadata read
 */
export default async function sitemap(
  props: { id?: string | number | Promise<string | number> } = { id: 0 }
): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const rawId = props?.id !== undefined ? await props.id : 0;
  const targetId = rawId !== undefined ? Number(rawId) : 0;

  if (targetId !== 0) {
    return [];
  }

  const staticFixedDate = new Date('2026-06-26T00:00:00Z');
  const nowDate = new Date();
  const routes: MetadataRoute.Sitemap = [];

  // 0. Core Hub & Trust Compliance Static Routes (9 routes for AdSense & Search Crawler verification)
  const coreStaticRoutes: Array<{ path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }> = [
    { path: '', changeFrequency: 'daily', priority: 1.0 },
    { path: '/guide', changeFrequency: 'weekly', priority: 0.95 },
    { path: '/technovalley', changeFrequency: 'weekly', priority: 0.95 },
    { path: '/explore', changeFrequency: 'daily', priority: 0.9 },
    { path: '/news', changeFrequency: 'daily', priority: 0.85 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.6 },
  ];
  coreStaticRoutes.forEach((item) => {
    routes.push({
      url: `${baseUrl}${item.path}`,
      lastModified: nowDate,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    });
  });

  // 1. Guide Articles (8 programmatic long-form comparison & valuation articles)
  GUIDE_ARTICLES.forEach((article) => {
    routes.push({
      url: `${baseUrl}/guide/${article.slug}`,
      lastModified: article.updatedDate ? new Date(article.updatedDate) : nowDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    });
  });

  // 2. Zone Routes (7 Dongtan investment zones)
  ZONES.forEach((zone) => {
    routes.push({
      url: `${baseUrl}/zone/${zone.id}`,
      lastModified: nowDate,
      changeFrequency: 'daily',
      priority: 0.85,
    });
  });

  // 3. MBTI Routes (16 housing personality profiles)
  ALL_MBTI_TYPES.forEach((type) => {
    routes.push({
      url: `${baseUrl}/mbti/${type}`,
      lastModified: staticFixedDate,
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  });

  // 4. TechnoValley Knowledge Industry Center Detail Routes (all 56 B2B centers)
  try {
    const jisanList = await getTechnoValleyJisanList();
    jisanList.forEach((item) => {
      routes.push({
        url: `${baseUrl}/technovalley?jisan=${encodeURIComponent(item.name)}`,
        lastModified: staticFixedDate,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    });
  } catch (err) {
    logger.error('Sitemap.technovalley', 'Failed to load TechnoValley Jisan list for sitemap', {}, err as Error);
  }

  // 5. Apartment Routes (184 apartments from tx-summary.json)
  try {
    const txSummary = await getTxSummaryData();
    const aptNames = Object.keys(txSummary || {});

    const reportsMap = new Map<string, string[]>();
    if (adminDb) {
      try {
        const reportsSnap = await adminDb
          .collection('scoutingReports')
          .select('apartmentName', 'images')
          .get();
        reportsSnap.forEach((doc) => {
          const data = doc.data();
          if (
            data.apartmentName &&
            data.images &&
            Array.isArray(data.images) &&
            data.images.length > 0
          ) {
            reportsMap.set(
              data.apartmentName,
              (data.images as { url?: string }[])
                .map((img) => img?.url || '')
                .filter(Boolean)
            );
          }
        });
      } catch (err) {
        logger.error('Sitemap.apartmentSitemap', 'Failed to fetch scoutingReports for sitemap', {}, err as Error);
      }
    }

    aptNames.forEach((aptName) => {
      const images = reportsMap.get(aptName);
      const aptSummary = txSummary[aptName];

      let lastModified = nowDate;
      if (aptSummary && aptSummary.latestDate) {
        const dateStr = String(aptSummary.latestDate).trim();
        if (dateStr.length === 8) {
          const y = parseInt(dateStr.substring(0, 4), 10);
          const m = parseInt(dateStr.substring(4, 6), 10) - 1;
          const d = parseInt(dateStr.substring(6, 8), 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            lastModified = new Date(Date.UTC(y, m, d));
          }
        }
      }

      const routeData: MetadataRoute.Sitemap[number] & { images?: string[] } = {
        url: `${baseUrl}/apartment/${encodeURIComponent(aptName)}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.95,
      };

      if (images && images.length > 0) {
        routeData.images = images;
      }

      routes.push(routeData);
    });
  } catch (error) {
    logger.error('Sitemap.apartmentSitemap', 'Failed to generate apartment sitemap', {}, error as Error);
  }

  return routes;
}
