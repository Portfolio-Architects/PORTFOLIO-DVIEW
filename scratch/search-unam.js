const fs = require('fs');
const content = fs.readFileSync('frontend/src/lib/transaction-summary.ts', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('우남퍼스트빌') || lines[i].includes('우남') || lines[i].includes('더샵센트럴')) {
    console.log(lines[i]);
  }
}
