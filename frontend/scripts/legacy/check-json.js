const fs = require('fs');
const files = fs.readdirSync('public/tx-data').filter(f => f.includes('그린힐'));
if (files.length > 0) {
  const data = JSON.parse(fs.readFileSync('public/tx-data/' + files[0]));
  const tgts = data.filter(d => d.reqGb || d.rnuYn);
  console.log(`Found ${tgts.length} items with reqGb or rnuYn out of ${data.length} total items in ${files[0]}`);
  if (tgts.length > 0) console.log(tgts[0]);
} else {
  console.log('No greenhill files found');
}
