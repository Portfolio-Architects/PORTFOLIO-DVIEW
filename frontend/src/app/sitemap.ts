import { MetadataRoute } from 'next';
import { AptTxSummary } from '@/lib/types/transaction';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { ZONES } from '@/lib/zones';

export const revalidate = 3600; // Revalidate sitemap every hour

export async function generateSitemaps() {
  // Split sitemaps:
  // id: 0 -> Main static pages and 127 apartment detail pages
  // id: 1 -> Lounge posts
  return [
    { id: 0 },
    { id: 1 }
  ];
}

export default async function sitemap({ id }: { id: string | number }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const targetId = Number(id);

  // 1. MAIN static pages and apartment pages
  if (targetId === 0) {
    let latestLoungeDate = new Date();
    let latestNewsDate = new Date();

    if (adminDb) {
      try {
        const latestPostSnap = await adminDb.collection('posts')
          .select('createdAt')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
          
        if (!latestPostSnap.empty) {
          const doc = latestPostSnap.docs[0].data();
          if (doc.createdAt) {
            if (typeof doc.createdAt.toDate === 'function') {
              latestLoungeDate = doc.createdAt.toDate();
            } else if (doc.createdAt._seconds) {
              latestLoungeDate = new Date(doc.createdAt._seconds * 1000);
            }
          }
        }
      } catch (err) {
        logger.error('Sitemap.lounge', 'Failed to fetch latest post for sitemap', {}, err as Error);
      }

      try {
        const latestNoticeSnap = await adminDb.collection('localNotices')
          .select('createdAt')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        if (!latestNoticeSnap.empty) {
          const doc = latestNoticeSnap.docs[0].data();
          if (doc.createdAt) {
            if (typeof doc.createdAt.toDate === 'function') {
              latestNewsDate = doc.createdAt.toDate();
            } else if (doc.createdAt._seconds) {
              latestNewsDate = new Date(doc.createdAt._seconds * 1000);
            }
          }
        }
      } catch (err) {
        logger.error('Sitemap.news', 'Failed to fetch latest notice for sitemap', {}, err as Error);
      }
    }

    const staticFixedDate = new Date('2026-06-26T00:00:00Z');
    const homeLastModified = latestLoungeDate > latestNewsDate ? latestLoungeDate : latestNewsDate;

    const routes: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: homeLastModified,
        changeFrequency: 'always',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/explore`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/lounge`,
        lastModified: latestLoungeDate,
        changeFrequency: 'hourly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/news`,
        lastModified: latestNewsDate,
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/technovalley`,
        lastModified: staticFixedDate,
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: staticFixedDate,
        changeFrequency: 'weekly',
        priority: 0.85,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: staticFixedDate,
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: staticFixedDate,
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: staticFixedDate,
        changeFrequency: 'monthly',
        priority: 0.5,
      },
    ];

    // Add Zone Routes dynamically from ZONES config
    ZONES.forEach((zone) => {
      routes.push({
        url: `${baseUrl}/zone/${zone.id}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.85,
      });
    });


    // Apartment Routes
    try {
      const { buildInitialApartments } = await import('@/lib/dong-apartments');
      const apts = buildInitialApartments();
      const allApts = Object.values(apts).flat();
      
      const { readJsonFileCached } = await import('@/lib/utils/server/fileReader');
      const txSummary = await readJsonFileCached<Record<string, AptTxSummary>>('public/data/tx-summary.json', {});
      
      // Fetch all scouting reports to get image URLs for SEO
      const reportsMap = new Map<string, string[]>();
      if (adminDb) {
        try {
          // Use projection select() to only fetch required fields, saving firestore read costs
          const reportsSnap = await adminDb.collection('scoutingReports').select('apartmentName', 'images').get();
          reportsSnap.forEach(doc => {
            const data = doc.data();
            if (data.apartmentName && data.images && Array.isArray(data.images) && data.images.length > 0) {
              reportsMap.set(data.apartmentName, (data.images as { url?: string }[]).map((img) => img?.url || '').filter(Boolean));
            }
          });
        } catch (err) {
          logger.error('Sitemap.apartmentSitemap', 'Failed to fetch scoutingReports for sitemap', {}, err as Error);
        }
      }
      
      allApts.forEach((apt) => {
        const images = reportsMap.get(apt.name);
        const aptSummary = txSummary[apt.name];
        
        let lastModified = new Date();
        if (aptSummary && aptSummary.latestDate) {
          const dateStr = String(aptSummary.latestDate).trim();
          if (dateStr.length === 8) {
            const y = parseInt(dateStr.substring(0, 4), 10);
            const m = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-indexed month
            const d = parseInt(dateStr.substring(6, 8), 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
              lastModified = new Date(Date.UTC(y, m, d));
            }
          }
        }
        
        const routeData: MetadataRoute.Sitemap[number] & { images?: string[] } = {
          url: `${baseUrl}/apartment/${encodeURIComponent(apt.name)}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.95,
        };
        
        // If Next.js sitemap supports images, attach them
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

  // 2. LOUNGE dynamic posts
  if (targetId === 1) {
    const routes: MetadataRoute.Sitemap = [];

    if (adminDb) {
      try {
        // Use projection select() to only fetch createdAt field, optimizing query payload size
        const postsSnapshot = await adminDb
          .collection('posts')
          .select('createdAt')
          .orderBy('createdAt', 'desc')
          .limit(1000) // limit for safety in sitemap
          .get();

        postsSnapshot.forEach((doc) => {
          const post = doc.data();
          let lastModified = new Date();
          
          if (post.createdAt) {
            try {
              // Check if it's a Firestore Timestamp explicitly to call .toDate() safely
              if (typeof post.createdAt.toDate === 'function') {
                lastModified = post.createdAt.toDate();
              } else if (post.createdAt._seconds) {
                lastModified = new Date(post.createdAt._seconds * 1000);
              }
            } catch(e) { /* ignore */ }
          }

          routes.push({
            url: `${baseUrl}/lounge/${doc.id}`,
            lastModified,
            changeFrequency: 'daily',
            priority: 0.8,
          });
        });
      } catch (error) {
        logger.error('Sitemap.postsSitemap', 'Failed to fetch posts for sitemap', {}, error as Error);
      }
    }

    return routes;
  }

  return [];
}
