import { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { ZONES } from '@/lib/zones';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import {
  getTxSummaryData,
  getTechnoValleyJisanList,
  formatTechnoValleyJisanSlug,
} from '@/lib/services/apartmentPageService';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';

export const revalidate = 3600; // Revalidate sitemap every hour

export function parseSitemapDate(
  raw: string | undefined | null,
  fallback: Date,
  nowDate: Date = new Date()
): Date {
  if (!raw) return fallback;
  const trimmed = String(raw).trim();
  if (!trimmed) return fallback;

  if (/^\d{4}[-./]?\d{2}[-./]?\d{2}$/.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    const y = parseInt(digits.substring(0, 4), 10);
    const m = parseInt(digits.substring(4, 6), 10) - 1;
    const d = parseInt(digits.substring(6, 8), 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const parsed = new Date(Date.UTC(y, m, d));
      if (
        !isNaN(parsed.getTime()) &&
        parsed.getUTCFullYear() === y &&
        parsed.getUTCMonth() === m &&
        parsed.getUTCDate() === d &&
        parsed <= nowDate
      ) {
        return parsed;
      }
    }
    return fallback;
  }

  const isoParsed = new Date(trimmed);
  if (!isNaN(isoParsed.getTime()) && isoParsed <= nowDate) {
    return isoParsed;
  }

  return fallback;
}

/**
 * Generates unified programmatic sitemap for D-VIEW (277 URLs).
 * @complexity Time: O(N), Space: O(N) where N = 277 programmatic entities
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
    { path: '/stats', changeFrequency: 'daily', priority: 0.85 },
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

  // 1. Guide Articles (20 programmatic long-form comparison & valuation articles)
  GUIDE_ARTICLES.forEach((article) => {
    routes.push({
      url: `${baseUrl}/guide/${article.slug}`,
      lastModified: parseSitemapDate(article.updatedDate || article.date, staticFixedDate, nowDate),
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

  // 3. TechnoValley Knowledge Industry Center Detail Routes (all 56 B2B centers via clean static paths)
  try {
    const jisanList = await getTechnoValleyJisanList();
    jisanList.forEach((item) => {
      const slug = formatTechnoValleyJisanSlug(item.name);
      const rawJisanDate = item.completionDate || item.approvalDate || item.initialApprovalDate;
      routes.push({
        url: `${baseUrl}/technovalley/${encodeURIComponent(slug)}`,
        lastModified: parseSitemapDate(rawJisanDate, staticFixedDate, nowDate),
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    });
  } catch (err) {
    logger.error('Sitemap.technovalley', 'Failed to load TechnoValley Jisan list for sitemap', {}, err as Error);
  }

  // 5. Apartment Routes (185 canonical apartments from tx-summary.json)
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

    const seenCanonicalSlugs = new Set<string>();
    aptNames.forEach((aptName) => {
      const aptSummary = txSummary[aptName];
      const canonicalSlug =
        resolveCanonicalAptSlug(aptName, {
          txMap: txSummary,
          dong: aptSummary?.dong,
        }) || aptName;
      if (seenCanonicalSlugs.has(canonicalSlug)) {
        return;
      }
      seenCanonicalSlugs.add(canonicalSlug);

      const images = reportsMap.get(canonicalSlug) || reportsMap.get(aptName);
      const lastModified = parseSitemapDate(aptSummary?.latestDate, nowDate);

      const routeData: MetadataRoute.Sitemap[number] & { images?: string[] } = {
        url: `${baseUrl}/apartment/${encodeURIComponent(canonicalSlug)}`,
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
