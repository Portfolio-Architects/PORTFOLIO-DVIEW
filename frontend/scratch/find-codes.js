const axios = require('axios');
const cheerio = require('cheerio');

async function checkCode(code) {
  const url = `https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=${code}`;
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 3000
    });
    if (res.status !== 200) return;
    const $ = cheerio.load(res.data);
    const title = $('title').text().trim();
    const rows = $('table').first().find('tr');
    if (rows.length > 1) {
      const firstRowTitle = $(rows[1]).find('td').eq(2).text().trim().replace(/\s+/g, ' ');
      console.log(`Code ${code}: Title="${title}", First Row Title="${firstRowTitle}"`);
    } else {
      console.log(`Code ${code}: Title="${title}", empty table`);
    }
  } catch (err) {
    // ignore
  }
}

async function main() {
  console.log('Scanning board codes...');
  // Let's scan from 1010 to 1045
  for (let code = 1010; code <= 1045; code++) {
    await checkCode(code);
  }
  console.log('Scan completed.');
}

main();
