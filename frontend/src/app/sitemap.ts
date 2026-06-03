import { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';

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
    const routes: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'always',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/lounge`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 0.9,
      },
    ];

    // Apartment Routes
    try {
      const { buildInitialApartments } = await import('@/lib/dong-apartments');
      const apts = buildInitialApartments();
      const allApts = Object.values(apts).flat();
      
      // Fetch all scouting reports to get image URLs for SEO
      const reportsMap = new Map<string, string[]>();
      if (adminDb) {
        try {
          const reportsSnap = await adminDb.collection('scoutingReports').get();
          reportsSnap.forEach(doc => {
            const data = doc.data();
            if (data.apartmentName && data.images && Array.isArray(data.images) && data.images.length > 0) {
              reportsMap.set(data.apartmentName, data.images.map((img: any) => img.url).filter(Boolean));
            }
          });
        } catch (err) {
          console.error('Failed to fetch scoutingReports for sitemap', err);
        }
      }
      
      allApts.forEach((apt) => {
        const images = reportsMap.get(apt.name);
        
        const routeData: any = {
          url: `${baseUrl}/apartment/${encodeURIComponent(apt.name)}`,
          lastModified: new Date(),
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
      console.error('Failed to generate apartment sitemap', error);
    }

    return routes;
  }

  // 2. LOUNGE dynamic posts
  if (targetId === 1) {
    const routes: MetadataRoute.Sitemap = [];

    if (adminDb) {
      try {
        const postsSnapshot = await adminDb
          .collection('posts')
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
        console.error('Failed to fetch posts for sitemap', error);
      }
    }

    return routes;
  }

  return [];
}
