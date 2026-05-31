const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE_1_BBS_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019';
// '석우' 추가한 키워드 목록
const DONGTAN_KEYWORDS = [
  '동탄', '출장소', '호수공원', '청계', '영천', '오산동', '신동', '목동', 
  '산척', '장지', '송동', '방교', '반송', '능동', '여울', '석우'
];

function checkIfDongtan(title, dept) {
  const t = title || '';
  const d = dept || '';
  return DONGTAN_KEYWORDS.some(k => t.includes(k) || d.includes(k));
}

async function test() {
  let matchedCount = 0;
  for (let page = 1; page <= 10; page++) {
    const url = `${SOURCE_1_BBS_URL}&q_currPage=${page}`;
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 8000
      });

      const $ = cheerio.load(res.data);
      const rows = $('table').first().find('tr');

      rows.each((idx, tr) => {
        if (idx === 0) return;

        const tds = $(tr).find('td');
        if (tds.length < 5) return;

        const originalId = $(tds[0]).text().trim();
        const titleEl = $(tds[2]);
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const dept = $(tds[3]).text().trim();
        const date = $(tds[4]).text().trim();

        const isDongtan = checkIfDongtan(title, dept);
        if (isDongtan) {
          matchedCount++;
          console.log(`[MATCH] Page ${page} | ID: ${originalId} | Date: ${date} | Dept: ${dept} | Title: ${title}`);
        }
      });
    } catch (err) {
      console.error(`Error page ${page}:`, err.message);
    }
  }
  console.log(`Total matched with '석우': ${matchedCount}`);
}

test();
