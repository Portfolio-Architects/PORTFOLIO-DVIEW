const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.hscity.go.kr/dongtan/user/bbs/BD_selectBbsList.do?q_bbsCode=1049&q_deptCode=57700100000';
  console.log(`Fetching ${url}...`);
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    console.error(`Fetch failed: HTTP ${res.status}`);
    return;
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const rows = $('table').first().find('tr');
  
  console.log(`Found ${rows.length} rows including header.`);
  
  rows.each((idx, tr) => {
    if (idx === 0) return; // Skip header
    const tds = $(tr).find('td');
    if (tds.length < 5) return;
    
    const originalId = $(tds[0]).text().trim();
    const titleEl = $(tds[2]);
    const title = titleEl.text().trim().replace(/\s+/g, ' ');
    const link = titleEl.find('a').attr('href') || '';
    const dept = $(tds[3]).text().trim();
    const date = $(tds[4]).text().trim();
    
    console.log(`[Row ${idx}]`);
    console.log(`- ID: ${originalId}`);
    console.log(`- Title: ${title}`);
    console.log(`- Link: ${link}`);
    console.log(`- Dept: ${dept}`);
    console.log(`- Date: ${date}`);
    console.log('---');
  });
}

main().catch(console.error);
