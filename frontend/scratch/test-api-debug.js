const fs = require('fs');
const path = require('path');

async function main() {
  const url = "http://localhost:5000/api/apartments-by-dong";
  console.log(`Fetching from ${url}...`);
  const res = await fetch(url);
  const data = await res.json();
  
  // Find "동탄역 시범 한화꿈에그린 프레스티지"
  let target = null;
  const byDong = data.byDong || data;
  for (const [dong, apts] of Object.entries(byDong)) {
    const found = apts.find(a => a.name.includes('한화꿈에그린'));
    if (found) {
      target = found;
      break;
    }
  }

  if (target) {
    console.log('✅ Found in API response!');
    console.log(JSON.stringify(target, null, 2));
  } else {
    console.log('❌ NOT found in API response!');
  }
}

main().catch(console.error);
