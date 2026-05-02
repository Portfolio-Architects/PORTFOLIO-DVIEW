const https = require('https');
const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=apartments&headers=1`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    lines.forEach(line => {
      if (line.includes('우남퍼스트빌') || line.includes('더샵 센트럴시티')) {
        console.log(line);
      }
    });
  });
});
