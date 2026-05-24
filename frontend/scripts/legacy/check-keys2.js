const fs = require('fs');
const content = fs.readFileSync('src/lib/transaction-summary.ts', 'utf8');
content.split('\n').forEach(line => {
  if (line.includes('힐스테이트')) console.log(line);
});
