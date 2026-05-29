require('dotenv').config({ path: '.env.local', override: true });
const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function getAdminCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
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
    console.error('No service account found!');
    process.exit(1);
  }
}

const db = admin.firestore();

const BOARD_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019';
const DONGTAN_KEYWORDS = [
  '동탄', '출장소', '호수공원', '청계', '영천', '오산동', '신동', '목동', 
  '산척', '장지', '송동', '방교', '반송', '능동', '여울'
];

function checkIfDongtan(title, dept) {
  const t = title || '';
  const d = dept || '';
  return DONGTAN_KEYWORDS.some(k => t.includes(k) || d.includes(k));
}

async function run() {
  console.log('Starting sync test...');
  const notices = [];
  const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  for (const page of pages) {
    const url = `${BOARD_URL}&q_currPage=${page}`;
    console.log('Fetching', url);
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    if (res.status !== 200) {
      console.error(`Page ${page} failed: ${res.status}`);
      continue;
    }

    const $ = cheerio.load(res.data);
    const rows = $('table').first().find('tr');

    rows.each((idx, tr) => {
      if (idx === 0) return;
      const tds = $(tr).find('td');
      if (tds.length < 5) return;

      const id = $(tds[0]).text().trim();
      const titleEl = $(tds[2]);
      const title = titleEl.text().trim().replace(/\s+/g, ' ');
      const link = titleEl.find('a').attr('href') || '';
      const dept = $(tds[3]).text().trim();
      const date = $(tds[4]).text().trim();

      if (id && title && link) {
        const isDongtan = checkIfDongtan(title, dept);
        const absoluteUrl = link.startsWith('http') 
          ? link 
          : `https://www.hscity.go.kr${link}`;

        notices.push({
          id,
          title,
          url: absoluteUrl,
          dept,
          date,
          isDongtan,
          createdAt: new Date().toISOString()
        });
      }
    });
  }

  console.log(`Found ${notices.length} notices total.`);
  const dongtanNotices = notices.filter(n => n.isDongtan);
  console.log(`Dongtan-related: ${dongtanNotices.length} notices.`);
  dongtanNotices.forEach(n => {
    console.log(` - [${n.dept}] ${n.title} (${n.date})`);
  });

  console.log('Writing to Firestore...');
  const collRef = db.collection('local_notices');
  const batch = db.batch();
  let written = 0;

  for (const item of notices) {
    const docRef = collRef.doc(item.id);
    batch.set(docRef, item, { merge: true });
    written++;
  }

  await batch.commit();
  console.log(`Successfully synced ${written} notices to Firestore!`);
}

run().catch(console.error);
