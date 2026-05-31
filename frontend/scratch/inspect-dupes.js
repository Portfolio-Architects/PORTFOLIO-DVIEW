const cheerio = require('cheerio');

const SOURCE_1_BBS_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019';
const SOURCE_2_GOSI_URL = 'https://www.hscity.go.kr/www/gosi/BD_notice.do';
const SOURCE_3_RAIL_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1131';

const DONGTAN_KEYWORDS = [
  '동탄', '출장소', '호수공원', '청계', '영천', '오산동', '신동', '목동', 
  '산척', '장지', '송동', '방교', '반송', '능동', '여울', '석우',
  'GTX', '인덕원', '트램', '동인선'
];

function checkIfDongtan(title, dept) {
  const t = title || '';
  const d = dept || '';
  return DONGTAN_KEYWORDS.some(k => t.includes(k) || d.includes(k));
}

async function scrapeSource1() {
  const notices = [];
  for (const page of [1, 2]) {
    const url = `${SOURCE_1_BBS_URL}&q_currPage=${page}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const arrayBuffer = await res.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(arrayBuffer);
    const $ = cheerio.load(html);
    const rows = $('table').first().find('tr');

    rows.each((idx, tr) => {
      if (idx === 0) return;
      const tds = $(tr).find('td');
      if (tds.length < 5) return;
      const originalId = $(tds[0]).text().trim();
      const titleEl = $(tds[2]);
      const title = titleEl.text().trim().replace(/\s+/g, ' ');
      const link = titleEl.find('a').attr('href') || '';
      const dept = $(tds[3]).text().trim();
      const date = $(tds[4]).text().trim();

      if (originalId && title && link) {
        if (checkIfDongtan(title, dept)) {
          notices.push({ id: `bbs_${originalId}`, title, dept, date, source: 'bbs' });
        }
      }
    });
  }
  return notices;
}

async function scrapeSource2() {
  const notices = [];
  for (const page of [1, 2]) {
    const url = `${SOURCE_2_GOSI_URL}?q_currPage=${page}&q_cp=${page}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const arrayBuffer = await res.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(arrayBuffer);
    const $ = cheerio.load(html);
    const rows = $('table tr');

    rows.each((idx, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 4) return;
      const titleEl = $(tds[1]);
      const aTag = titleEl.find('a');
      if (aTag.length === 0) return;
      const onclick = aTag.attr('onclick') || '';
      const idMatch = onclick.match(/opGosiView\('([^']+)'\)/);
      if (!idMatch) return;
      const originalId = idMatch[1];
      const title = titleEl.text().trim().replace(/\s+/g, ' ');
      const dept = $(tds[2]).text().trim();
      const date = $(tds[3]).text().trim();

      if (originalId && title) {
        if (checkIfDongtan(title, dept)) {
          notices.push({ id: `gosi_${originalId}`, title, dept, date, source: 'gosi' });
        }
      }
    });
  }
  return notices;
}

async function main() {
  console.log('Scraping sources to check for duplicates...');
  const bbsNotices = await scrapeSource1();
  const gosiNotices = await scrapeSource2();

  console.log(`Scraped BBS (Source 1): ${bbsNotices.length} items`);
  console.log(`Scraped Gosi (Source 2): ${gosiNotices.length} items`);

  const allNotices = [...bbsNotices, ...gosiNotices];

  // Find duplicates by title
  const titleMap = {};
  allNotices.forEach(n => {
    if (!titleMap[n.title]) titleMap[n.title] = [];
    titleMap[n.title].push(n);
  });

  console.log('\n--- Duplicate Titles Found ---');
  let hasDupes = false;
  Object.keys(titleMap).forEach(title => {
    const list = titleMap[title];
    if (list.length > 1) {
      hasDupes = true;
      console.log(`\nTitle: "${title}"`);
      list.forEach(item => {
        console.log(`  -> Source: ${item.source}, ID: ${item.id}, Dept: ${item.dept}, Date: ${item.date}`);
      });
    }
  });

  if (!hasDupes) {
    console.log('No duplicates found.');
  }
}

main().catch(console.error);
