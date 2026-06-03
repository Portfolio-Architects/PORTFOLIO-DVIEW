import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { redis } from '@/lib/redis';

// Keys for Redis caching
const PUBLIC_ANALYTICS_CACHE_KEY = 'dtdls:analytics:public:lkg';
const ADMIN_ANALYTICS_CACHE_KEY = 'dtdls:analytics:admin:lkg';

export interface PublicAnalyticsData {
  mau: number;
  dau: number;
  totalViews: number;
  avgSessionDuration: string;
}

export interface AdminAnalyticsRow {
  date: string;
  activeUsers: number;
  pageViews: number;
}

// TTLs in seconds
const PUBLIC_CACHE_TTL = 3600; // 1 hour
const ADMIN_CACHE_TTL = 600; // 10 minutes

/**
 * Returns formatted GA credentials or null if missing.
 */
function getGACredentials() {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GA_PROPERTY_ID } = process.env;
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GA_PROPERTY_ID) {
    return null;
  }
  const formattedKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
  return { email: GOOGLE_SERVICE_ACCOUNT_EMAIL, key: formattedKey, propertyId: GA_PROPERTY_ID };
}

/**
 * Fetch raw public analytics from Google Analytics API
 */
async function fetchPublicAnalyticsFromGA(): Promise<PublicAnalyticsData> {
  const creds = getGACredentials();
  if (!creds) {
    return { mau: 0, dau: 0, totalViews: 0, avgSessionDuration: '0m 0s' };
  }

  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: creds.email,
      private_key: creds.key,
    },
  });

  const [response] = await analyticsDataClient.runReport({
    property: `properties/${creds.propertyId}`,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }]
  });

  const [todayResponse] = await analyticsDataClient.runReport({
    property: `properties/${creds.propertyId}`,
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }]
  });

  const mau = parseInt(response?.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
  const totalViews = parseInt(response?.rows?.[0]?.metricValues?.[1]?.value || '0', 10);
  const avgDurationSeconds = parseInt(response?.rows?.[0]?.metricValues?.[2]?.value || '0', 10);
  const dau = parseInt(todayResponse?.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

  const minutes = Math.floor(avgDurationSeconds / 60);
  const seconds = avgDurationSeconds % 60;
  const avgSessionDuration = `${minutes}m ${seconds}s`;

  return { mau, dau, totalViews, avgSessionDuration };
}

/**
 * Get Public Analytics using LKG (Last Known Good) Strategy
 */
export async function getPublicAnalyticsLKG(): Promise<PublicAnalyticsData> {
  try {
    if (redis) {
      const cached = await redis.get<{ data: PublicAnalyticsData, timestamp: number }>(PUBLIC_ANALYTICS_CACHE_KEY);
      if (cached) {
        const isStale = (Date.now() - cached.timestamp) > (PUBLIC_CACHE_TTL * 1000);
        if (isStale) {
          // Stale-while-revalidate: Fetch in background
          fetchPublicAnalyticsFromGA().then(freshData => {
            redis?.set(PUBLIC_ANALYTICS_CACHE_KEY, { data: freshData, timestamp: Date.now() });
          }).catch(console.error);
        }
        return cached.data;
      }
    }

    // No cache or redis unavailable -> Fetch synchronously
    const freshData = await fetchPublicAnalyticsFromGA();
    if (redis) {
      // Save synchronously so next request gets it
      await redis.set(PUBLIC_ANALYTICS_CACHE_KEY, { data: freshData, timestamp: Date.now() });
    }
    return freshData;
  } catch (error) {
    console.error('[Public GA4 API LKG] Error:', error);
    return { mau: 0, dau: 0, totalViews: 0, avgSessionDuration: '0m 0s' };
  }
}

/**
 * Fetch raw admin analytics from Google Analytics API
 */
async function fetchAdminAnalyticsFromGA(): Promise<AdminAnalyticsRow[]> {
  const creds = getGACredentials();
  if (!creds) {
    return [];
  }

  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: creds.email,
      private_key: creds.key,
    },
  });

  const [response] = await analyticsDataClient.runReport({
    property: `properties/${creds.propertyId}`,
    dateRanges: [{ startDate: '14daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
  });

  if (!response || !response.rows) return [];

  return response.rows.map((row: any) => {
    const rawDate = row.dimensionValues?.[0]?.value || '';
    const formattedDate = rawDate.length === 8 
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` 
      : rawDate;

    return {
      date: formattedDate,
      activeUsers: parseInt(row.metricValues?.[0]?.value || '0', 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || '0', 10),
    };
  });
}

/**
 * Get Admin Analytics using LKG (Last Known Good) Strategy
 */
export async function getAdminAnalyticsLKG(): Promise<AdminAnalyticsRow[]> {
  try {
    if (redis) {
      const cached = await redis.get<{ data: AdminAnalyticsRow[], timestamp: number }>(ADMIN_ANALYTICS_CACHE_KEY);
      if (cached) {
        const isStale = (Date.now() - cached.timestamp) > (ADMIN_CACHE_TTL * 1000);
        if (isStale) {
          // Stale-while-revalidate: Fetch in background
          fetchAdminAnalyticsFromGA().then(freshData => {
            redis?.set(ADMIN_ANALYTICS_CACHE_KEY, { data: freshData, timestamp: Date.now() });
          }).catch(console.error);
        }
        return cached.data;
      }
    }

    // No cache or redis unavailable -> Fetch synchronously
    const freshData = await fetchAdminAnalyticsFromGA();
    if (redis) {
      await redis.set(ADMIN_ANALYTICS_CACHE_KEY, { data: freshData, timestamp: Date.now() });
    }
    return freshData;
  } catch (error) {
    console.error('[Admin GA4 API LKG] Error:', error);
    return [];
  }
}
