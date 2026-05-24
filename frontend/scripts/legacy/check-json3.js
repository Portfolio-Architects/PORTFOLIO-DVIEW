const fs = require('fs');
const files = fs.readdirSync('public/tx-data').filter(f => f.includes('그린힐'));
if (files.length > 0) {
  const data = JSON.parse(fs.readFileSync('public/tx-data/' + files[0]));
  const recent = data.filter(d => d.contractYm.startsWith('202603'));
  console.dir(recent);
}
