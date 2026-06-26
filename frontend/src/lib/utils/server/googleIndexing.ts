import { JWT } from 'google-auth-library';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// Zod schemas for Google Search Console Indexing parameters and service account keys
export const GoogleIndexingParamsSchema = z.object({
  url: z.string().url('Invalid absolute URL format for indexing'),
  type: z.enum(['URL_UPDATED', 'URL_DELETED']).catch('URL_UPDATED'),
});

export const GoogleServiceAccountKeySchema = z.object({
  client_email: z.string().email('Invalid service account client email'),
  private_key: z.string().min(1, 'Private key cannot be empty'),
});

/**
 * Request Google Search Console Indexing for a specific URL
 * @param url The absolute URL of the page (e.g. https://dview.kr/lounge/123)
 * @param type Action type: 'URL_UPDATED' (create/modify) or 'URL_DELETED' (delete)
 */
export async function requestGoogleIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  // 1. Validate Input parameters using Zod
  const paramsValidation = GoogleIndexingParamsSchema.safeParse({ url, type });
  if (!paramsValidation.success) {
    logger.warn('googleIndexing.requestGoogleIndexing', 'Invalid parameters provided for indexing', {
      error: String(paramsValidation.error),
      url,
      type
    });
    // Return graceful error response to prevent crash in caller
    return { success: false, error: paramsValidation.error.message };
  }

  const validatedParams = paramsValidation.data;
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    logger.warn('googleIndexing.requestGoogleIndexing', 'GOOGLE_SERVICE_ACCOUNT_KEY is missing. Skipping API call', {
      url: validatedParams.url,
      type: validatedParams.type
    });
    return { success: true, message: 'Mock mode: success without api call', mock: true };
  }

  try {
    let keyData;
    try {
      keyData = JSON.parse(serviceAccountKey);
    } catch (parseErr: unknown) {
      // Handle base64 encoded keys if applicable
      const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
      keyData = JSON.parse(decoded);
    }

    // 2. Validate Google service account key configuration using Zod
    const keyValidation = GoogleServiceAccountKeySchema.safeParse(keyData);
    if (!keyValidation.success) {
      throw new Error(`Google service account configuration validation failed: ${keyValidation.error.message}`);
    }

    const validatedKey = keyValidation.data;

    const jwtClient = new JWT({
      email: validatedKey.client_email,
      key: validatedKey.private_key.replace(/\\n/g, '\n'), // Ensure correct newline formatting in private key
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    await jwtClient.authorize();

    const response = await jwtClient.request({
      url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
      method: 'POST',
      data: {
        url: validatedParams.url,
        type: validatedParams.type,
      },
    });

    logger.info('googleIndexing.requestGoogleIndexing', 'Requested indexing successfully', {
      url: validatedParams.url,
      status: response.status
    });
    return { success: true, status: response.status, data: response.data };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('googleIndexing.requestGoogleIndexing', 'Failed indexing request', {
      url: validatedParams.url,
      error: errorMessage
    });
    // Graceful error fallback to avoid breaking parent workflow
    return { success: false, error: errorMessage };
  }
}
