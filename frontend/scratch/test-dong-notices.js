const cheerio = require('cheerio');

async function testDept(deptName, deptCode) {
  const url = `https://www.hscity.go.kr/dongtan/user/bbs/BD_selectBbsList.do?q_bbsCode=1049&q_deptCode=${deptCode}`;
  console.log(`Testing ${deptName} (${deptCode})...`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      console.log(`- Fetch failed: HTTP ${res.status}`);
      return;
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const rows = $('table').first().find('tr');

    console.log(`- Found ${rows.length - 1} rows.`);
    if (rows.length > 1) {
      for (let i = 1; i <= Math.min(3, rows.length - 1); i++) {
        const row = $(rows[i]).find('td');
        if (row.length >= 5) {
          const originalId = $(row[0]).text().trim();
          const title = $(row[2]).text().trim().replace(/\s+/g, ' ');
          const dept = $(row[3]).text().trim();
          console.log(`  [#${originalId}] [${dept}] ${title}`);
        }
      }
    }
  } catch (err) {
    console.error(`- Error:`, err.message);
  }
}

async function main() {
  const depts = [
    { name: '동탄출장소', code: '57700010000' },
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

  for (const dept of depts) {
    await testDept(dept.name, dept.code);
    await new Promise(r => setTimeout(r, 500)); // avoid rate limit
  }
}

main().catch(console.error);

