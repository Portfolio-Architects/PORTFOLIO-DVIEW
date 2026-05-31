const axios = require('axios');
const cheerio = require('cheerio');

const TARGET_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1131';

async function test() {
  try {
    console.log('Fetching:', TARGET_URL);
    const res = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    console.log('Status:', res.status);
    const $ = cheerio.load(res.data);
    
    // Find page title
    const titleText = $('title').text().trim() || $('h1, h2, h3').first().text().trim();
    console.log('Page Title/Heading:', titleText);

    // Analyze tables
    console.log('Tables found:', $('table').length);
    $('table').each((i, table) => {
      console.log(`Table ${i} class:`, $(table).attr('class'), 'summary:', $(table).attr('summary'));
      
      const rows = $(table).find('tr');
      console.log(`Table ${i} rows count:`, rows.length);
      
      rows.slice(0, 5).each((idx, tr) => {
        const ths = $(tr).find('th');
        if (ths.length > 0) {
          const headers = [];
          ths.each((_, th) => headers.push($(th).text().trim()));
          console.log(`  Row ${idx} (Header):`, headers.join(' | '));
        } else {
          const tds = $(tr).find('td');
          const cells = [];
          tds.each((_, td) => cells.push($(td).text().trim().replace(/\s+/g, ' ')));
          console.log(`  Row ${idx} (Data):`, cells.slice(0, 6).join(' | '));
          if (tds.length > 0) {
            console.log(`    Link in td:`, $(tr).find('a').attr('href') || 'No link');
          }
        }
      });
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
