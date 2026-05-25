const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function getAdminCredentials() {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    }
  } catch {
    // ignore
  }

  // Load from local .env.local if exists
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      const env = {};
      lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          // Strip both single and double quotes at the start and end of values
          const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          env[key] = val;
        }
      });
      
      // PRIORITIZE FIREBASE_SERVICE_ACCOUNT_JSON (contains correct Firebase admin credentials)
      if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
        } catch (e) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
        }
      }
      
      const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY || env.GOOGLE_PRIVATE_KEY;
      const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL || env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';
      
      if (privateKey && clientEmail) {
        return {
          projectId,
          clientEmail,
          client_email: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          private_key: privateKey.replace(/\\n/g, '\n')
        };
      }
    }
  } catch (e) {
    console.error('Env load error:', e);
  }

  return null;
}

const creds = getAdminCredentials();
if (!creds) {
  console.error('Credentials not found!');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(creds)
});

const db = admin.firestore();

async function main() {
  const collRef = db.collection('apartmentVotes');
  const snap = await collRef.get();
  console.log(`Found ${snap.size} documents in apartmentVotes collection.`);
  
  if (snap.size === 0) {
    console.log('No documents to clean.');
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(`Doc ID: ${doc.id}, aptName: ${data.aptName}, buyCount: ${data.buyCount}, waitCount: ${data.waitCount}`);
    
    await doc.ref.delete();
    console.log(`Deleted doc: ${doc.id}`);
  }
  
  console.log('Reset complete!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
