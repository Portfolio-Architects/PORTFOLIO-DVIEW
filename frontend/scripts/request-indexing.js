#!/usr/bin/env node
/**
 * 🔍 Google Search Console Indexing CLI Tool
 * 
 * Usage:
 *   node scripts/request-indexing.js <url> [URL_UPDATED|URL_DELETED]
 * 
 * Example:
 *   node scripts/request-indexing.js https://dongtanview.com/explore
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { JWT } = require('google-auth-library');

async function main() {
  const url = process.argv[2];
  const type = process.argv[3] || 'URL_UPDATED';

  if (!url) {
    console.error('❌ Error: URL is required.');
    console.error('Usage: node scripts/request-indexing.js <url> [URL_UPDATED|URL_DELETED]');
    process.exit(1);
  }

  if (!['URL_UPDATED', 'URL_DELETED'].includes(type)) {
    console.error('❌ Error: Action type must be either URL_UPDATED or URL_DELETED.');
    process.exit(1);
  }

  console.log(`[Google Indexing CLI] Requesting indexing for: ${url} (type: ${type})`);

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn('⚠️  Warning: GOOGLE_SERVICE_ACCOUNT_KEY environment variable is missing.');
    console.log('ℹ️  Operating in mock mode: Request simulated successfully.');
    process.exit(0);
  }

  let keyData;
  try {
    keyData = JSON.parse(serviceAccountKey);
  } catch (parseErr) {
    try {
      const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
      keyData = JSON.parse(decoded);
    } catch (b64Err) {
      console.error('❌ Error: Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON or Base64.');
      process.exit(1);
    }
  }

  if (!keyData.client_email || !keyData.private_key) {
    console.error('❌ Error: Service account key is missing client_email or private_key.');
    process.exit(1);
  }

  try {
    const jwtClient = new JWT({
      email: keyData.client_email,
      key: keyData.private_key.replace(/\\n/g, '\n'),
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

    console.log('✅ Google Indexing request succeeded!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Google Indexing request failed:', error.message || error);
    process.exit(1);
  }
}

main();
