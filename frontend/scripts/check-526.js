require('dotenv').config({ path: '.env.local', override: true });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function getAdminCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
    }
  }
  return null;
}

const accountInfo = getAdminCredentials();
if (!admin.apps.length) {
  if (accountInfo) {
    admin.initializeApp({
      credential: admin.credential.cert(accountInfo),
    });
  } else {
    admin.initializeApp({
      projectId: 'portfolio-dtdls'
    });
  }
}

const db = admin.firestore();

async function check() {
  console.log("Checking local public/data/tx-summary.json for maxPriceByArea...");
  const txDataPath = path.resolve(__dirname, '../public/data/tx-summary.json');
  if (!fs.existsSync(txDataPath)) {
    console.error("Local tx-summary.json not found!");
    return;
  }
  const fileContent = fs.readFileSync(txDataPath, 'utf8');
  const data = JSON.parse(fileContent);
  
  const targetApts = ['동탄역신안인스빌리베라2차', '푸른마을모아미래도'];
  targetApts.forEach(name => {
    const aptKey = Object.keys(data.summary).find(k => k.includes(name));
    if (aptKey) {
      const apt = data.summary[aptKey];
      console.log(`\n=== ${aptKey} ===`);
      console.log("Max Price:", apt.maxPrice);
      console.log("Max Price By Area:", JSON.stringify(apt.maxPriceByArea, null, 2));
    } else {
      console.log(`${name} not found in summary!`);
    }
  });
}

check().catch(console.error);
