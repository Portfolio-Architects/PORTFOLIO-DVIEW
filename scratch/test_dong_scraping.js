const cheerio = require('cheerio');

const DONG_DEPTS = [
  { name: '동탄1동', code: '57700100000' },
  { name: '동탄2동', code: '57700110000' },
  { name: '동탄3동', code: '57700120000' },
  { name: '동탄4동', code: '57700130000' },
  { name: '동탄5동', code: '57700140000' },
  { name: '동탄6동', code: '57700150000' },
  { name: '동탄7동', code: '57700160000' },
  { name: '동탄8동', code: '57700170000' },
  { name: '동탄9동', code: '57700180000' }
];

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

async function testScraping() {
  for (const deptItem of DONG_DEPTS) {
    const url = `https://www.hscity.go.kr/dongtan/user/bbs/BD_selectBbsList.do?q_bbsCode=1049&q_deptCode=${deptItem.code}&q_currPage=1`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) {
        console.log(`Failed for ${deptItem.name}: HTTP ${res.status}`);
        continue;
      }
      const buffer = await res.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const html = decoder.decode(buffer);
      const $ = cheerio.load(html);
      const rows = $('table').first().find('tr');
      
      console.log(`\n=== ${deptItem.name} (Code: ${deptItem.code}) ===`);
      let foundCount = 0;
      let matchedCount = 0;

      rows.each((idx, tr) => {
        if (idx === 0) return;
        const tds = $(tr).find('td');
        if (tds.length < 5) return;

        const originalId = $(tds[0]).text().trim();
        const titleEl = $(tds[2]);
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const dept = $(tds[3]).text().trim();
        const date = $(tds[4]).text().trim();

        if (originalId && title) {
          foundCount++;
          const matched = checkIfDongtan(title, dept);
          if (matched) matchedCount++;
          console.log(`  [${originalId}] Title: "${title.substring(0, 30)}..." | Dept: "${dept}" | Matched: ${matched}`);
        }
      });
      console.log(`Summary for ${deptItem.name}: Scraped ${foundCount} items, Matched ${matchedCount} items`);
    } catch (e) {
      console.error(`Error for ${deptItem.name}:`, e.message);
    }
  }
}

testScraping();
