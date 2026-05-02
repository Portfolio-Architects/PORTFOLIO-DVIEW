import fs from 'fs';
import https from 'https';
import { TX_SUMMARY } from '../frontend/src/lib/transaction-summary';

const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=apartments&headers=1`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    let total = 0;
    let mapped = 0;
    let unmapped: any[] = [];
    
    // skip header (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim() === '') continue;
      
      const cols = line.split('","').map(c => c.replace(/^"|"$/g, ''));
      if (cols.length < 10) continue;
      
      const aptName = cols[1];
      const txKeyParam = cols[12] ? cols[12].trim() : undefined;
      
      total++;
      
      // Admin UI logic:
      // if (m?.txKey && TX_SUMMARY[m.txKey as keyof typeof TX_SUMMARY]) mapped++;
      // else unmapped++;
      if (txKeyParam && TX_SUMMARY[txKeyParam]) {
        mapped++;
      } else {
        unmapped.push({ aptName, txKeyParam });
      }
    }
    
    console.log(`Total Apartments: ${total}`);
    console.log(`Mapped: ${mapped}`);
    console.log(`Unmapped: ${total - mapped}`);
    console.log('\n--- Unmapped Apartments (Admin UI Logic) ---');
    unmapped.forEach(u => {
      console.log(`- ${u.aptName} (Sheet txKey: ${u.txKeyParam || 'none'})`);
    });
  });
});
