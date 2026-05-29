const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1033&q_currPage=2';
  console.log('Fetching', url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Response status:', res.status);
    const $ = cheerio.load(res.data);
    
    // Let's print tables
    console.log('Tables found:', $('table').length);
    $('table').each((i, table) => {
      console.log(`Table ${i} class:`, $(table).attr('class'));
    });

    // Let's print some headers
    console.log('Th headers:');
    $('table th').each((i, el) => {
      console.log(`Th ${i}:`, $(el).text().trim());
    });

    // Let's print first few rows of the first table
    console.log('Rows in table 0:');
    $('table').first().find('tr').slice(0, 10).each((i, tr) => {
      console.log(`Row ${i}:`);
      $(tr).find('td, th').each((j, td) => {
        console.log(`  Col ${j} (class: ${$(td).attr('class') || 'none'}):`, $(td).text().trim().replace(/\s+/g, ' '));
        const link = $(td).find('a').attr('href');
        if (link) console.log(`    Link:`, link);
      });
    });
  } catch (err) {
    console.error('Error fetching or parsing:', err.message);
  }
}

main();
