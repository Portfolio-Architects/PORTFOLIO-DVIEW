const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const TARGET_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1131';

async function test() {
  try {
    console.log('Fetching with arraybuffer and euc-kr decoding:', TARGET_URL);
    const res = await axios.get(TARGET_URL, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    console.log('Original status:', res.status);
    
    // Decode with euc-kr
    const decodedHtml = iconv.decode(Buffer.from(res.data), 'euc-kr');
    
    const $ = cheerio.load(decodedHtml);
    const titleText = $('title').text().trim();
    console.log('Decoded Page Title:', titleText);

    const rows = $('table').first().find('tr');
    console.log('Decoded Rows count:', rows.length);

    rows.slice(0, 5).each((idx, tr) => {
      const tds = $(tr).find('td');
      if (tds.length >= 5) {
        const originalId = $(tds[0]).text().trim();
        const titleEl = $(tds[2]);
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const dept = $(tds[3]).text().trim();
        const date = $(tds[4]).text().trim();
        console.log(`  Row ${idx} | ID: ${originalId} | Dept: ${dept} | Date: ${date} | Title: ${title}`);
      }
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
