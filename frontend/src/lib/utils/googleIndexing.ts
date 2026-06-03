import { JWT } from 'google-auth-library';

/**
 * Request Google Search Console Indexing for a specific URL
 * @param url The absolute URL of the page (e.g. https://dview.kr/lounge/123)
 * @param type Action type: 'URL_UPDATED' (create/modify) or 'URL_DELETED' (delete)
 */
export async function requestGoogleIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.warn(`[GoogleIndexing-Mock] GOOGLE_SERVICE_ACCOUNT_KEY is missing. Skipping API call for URL: ${url} (Action: ${type})`);
    return { success: true, message: 'Mock mode: success without api call', mock: true };
  }

  try {
    let keyData;
    try {
      keyData = JSON.parse(serviceAccountKey);
    } catch (parseErr) {
      // Handle base64 encoded keys if applicable
      const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
      keyData = JSON.parse(decoded);
    }

    if (!keyData.client_email || !keyData.private_key) {
      throw new Error('Required fields (client_email, private_key) are missing in the credentials');
    }

    const jwtClient = new JWT({
      email: keyData.client_email,
      key: keyData.private_key.replace(/\\n/g, '\n'), // Ensure correct newline formatting in private key
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    await jwtClient.authorize();

    const response = await jwtClient.request({
      url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
      method: 'POST',
      data: {
        url,
        type,
      },
    });

    console.log(`[GoogleIndexing-Success] Requested indexing for ${url}. Response status:`, response.status);
    return { success: true, status: response.status, data: response.data };
  } catch (error: any) {
    console.error(`[GoogleIndexing-Error] Failed indexing request for ${url}:`, error.message || error);
    // Graceful error fallback to avoid breaking parent workflow
    return { success: false, error: error.message || String(error) };
  }
}
