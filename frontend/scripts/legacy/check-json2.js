const fs = require('fs');
const files = fs.readdirSync('public/tx-data').filter(f => f.includes('그린힐'));
if (files.length > 0) {
  const data = JSON.parse(fs.readFileSync('public/tx-data/' + files[0]));
  const gaengshin = data.filter(d => d.reqGb === '갱신');
  console.log(`Found ${gaengshin.length} items with 갱신 out of ${data.length} total items in ${files[0]}`);
  if (gaengshin.length > 0) console.dir(gaengshin.slice(0, 5));
}
