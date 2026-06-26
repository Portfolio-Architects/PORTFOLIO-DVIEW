import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const FirebaseAdminCredentialsSchema = z.object({
  projectId: z.string().min(1).optional(),
  project_id: z.string().min(1).optional(),
  clientEmail: z.string().email().optional(),
  client_email: z.string().email().optional(),
  privateKey: z.string().min(10).optional(),
  private_key: z.string().min(10).optional(),
}).superRefine((data, ctx) => {
  const email = data.clientEmail || data.client_email;
  const key = data.privateKey || data.private_key;
  
  if (!email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one of clientEmail or client_email must be provided.",
      path: ["client_email"],
    });
  }
  
  if (!key) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one of privateKey or private_key must be provided.",
      path: ["private_key"],
    });
  }
});

export type FirebaseAdminCredentials = {
  projectId: string;
  project_id: string;
  clientEmail: string;
  client_email: string;
  privateKey: string;
  private_key: string;
};

// Helper to properly extract credentials across different environments (Local, Vercel JSON, Vercel split keys)
function getAdminCredentials(): FirebaseAdminCredentials | null {
  let credentials: Record<string, unknown> | null = null;

  // 1. Local Development (serviceAccountKey.json) 
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8')) as Record<string, unknown>;
    }
  } catch {
    // Ignore and fallback
  }

  // 2. Vercel Single JSON Object String
  if (!credentials && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as Record<string, unknown>;
    } catch (e: unknown) {
      logger.error('FirebaseAdmin', 'Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Is it valid JSON?', {}, e);
    }
  }

  // 3. Vercel Split Environment Variables
  if (!credentials) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';
    
    if (privateKey && clientEmail) {
      credentials = {
        projectId,
        clientEmail, 
        client_email: clientEmail, 
        privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
        private_key: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
      };
    }
  }

  if (!credentials) return null;

  const parsed = FirebaseAdminCredentialsSchema.safeParse(credentials);
  if (!parsed.success) {
    logger.error('FirebaseAdmin', 'Invalid Firebase Admin credentials schema detected', {}, parsed.error);
    return null;
  }

  const validated = parsed.data;
  const finalEmail = validated.clientEmail || validated.client_email || '';
  const finalKey = validated.privateKey || validated.private_key || '';
  const finalProjId = validated.projectId || validated.project_id || 'portfolio-dtdls';

  return {
    projectId: finalProjId,
    project_id: finalProjId,
    clientEmail: finalEmail,
    client_email: finalEmail,
    privateKey: finalKey,
    private_key: finalKey,
  };
}

if (!admin.apps.length) {
  const accountInfo = getAdminCredentials();
  
  if (accountInfo) {
    logger.info('FirebaseAdmin', 'Starting Firebase Admin initialization', {
      client_email: accountInfo.client_email
    });
    admin.initializeApp({
      credential: admin.credential.cert(accountInfo),
    });
  } else {
    logger.warn('FirebaseAdmin', 'Firebase Admin credential not found or validation failed. Admin features calling this module will fail.');
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;

// Fix for Serverless & Local Function 500 timeouts / gRPC latency (gRPC connection hangs)
const globalContext = globalThis as unknown as { __FIREBASE_REST_CONFIGURED?: boolean };

if (adminDb && !globalContext.__FIREBASE_REST_CONFIGURED) {
  try {
    globalContext.__FIREBASE_REST_CONFIGURED = true;
    const accountInfo = getAdminCredentials();
    
    if (accountInfo && accountInfo.client_email && accountInfo.private_key) {
      adminDb.settings({ 
        preferRest: true, 
        projectId: accountInfo.projectId || 'portfolio-dtdls',
        credentials: {
          client_email: accountInfo.client_email,
          private_key: accountInfo.private_key
        }
      });
    } else {
      adminDb.settings({ preferRest: true });
    }
    logger.info('FirebaseAdmin', 'Configured Firestore to use REST API protocol (preferRest: true)');
  } catch (e: unknown) {
    logger.error('FirebaseAdmin', 'Failed to configure Firestore Rest settings', {}, e);
  }
}
