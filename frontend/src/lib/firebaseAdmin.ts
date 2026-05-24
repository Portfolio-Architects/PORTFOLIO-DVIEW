import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Helper to properly extract credentials across different environments (Local, Vercel JSON, Vercel split keys)
function getAdminCredentials() {
  // 1. Local Development (serviceAccountKey.json) 
  // THIS MUST BE FIRST. Otherwise, local .env.local variables like GOOGLE_PRIVATE_KEY (which are for Google Sheets)
  // will incorrectly override the primary Firebase Admin credentials.
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    }
  } catch {
    // Ignore and fallback
  }

  // 2. Vercel Single JSON Object String
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Is it valid JSON?');
    }
  }

  // 3. Vercel Split Environment Variables
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';
  
  if (privateKey && clientEmail) {
    return {
      projectId,
      clientEmail, // Firebase Admin SDK accepts both clientEmail and client_email
      client_email: clientEmail, 
      privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
      private_key: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
    };
  }

  return null;
}

if (!admin.apps.length) {
  const accountInfo = getAdminCredentials();
  
  if (accountInfo) {
    console.log('[DEBUG-FIREBASE] Starting init. client_email:', accountInfo.client_email || accountInfo.clientEmail);
    admin.initializeApp({
      credential: admin.credential.cert(accountInfo),
    });
  } else {
    console.warn('⚠️ Firebase Admin credential not found. Admin features calling this module will fail.');
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;

// Fix for Vercel Serverless Function 500 timeouts (gRPC connection hangs)
// Important: When using preferRest, the REST client ignores the `initializeApp` credentials
// and falls back to Application Default Credentials (which fails on Vercel unless explicitly provided).
const globalContext = globalThis as unknown as { __FIREBASE_REST_CONFIGURED?: boolean };

if (adminDb && process.env.VERCEL === '1' && !globalContext.__FIREBASE_REST_CONFIGURED) {
  try {
    globalContext.__FIREBASE_REST_CONFIGURED = true;
    const accountInfo = getAdminCredentials();
    
    if (accountInfo && accountInfo.client_email && accountInfo.private_key) {
      adminDb.settings({ 
        preferRest: true, 
        projectId: accountInfo.project_id || accountInfo.projectId || 'portfolio-dtdls',
        credentials: {
          client_email: accountInfo.client_email,
          private_key: accountInfo.private_key
        }
      });
    } else {
      // Fallback
      adminDb.settings({ preferRest: true });
    }
  } catch (e) {
    console.error('Failed to configure Firestore Rest settings', e);
  }
}
