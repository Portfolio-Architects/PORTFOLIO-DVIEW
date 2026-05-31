const axios = require('axios');

const TARGET_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1131';

async function test() {
  try {
    const res = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    console.log('Headers:', res.headers);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
