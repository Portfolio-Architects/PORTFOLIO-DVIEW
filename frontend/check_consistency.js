const fs = require('fs');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

async function check() {
  const url = 'https://docs.google.com/spreadsheets/d/1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE/gviz/tq?tqx=out:csv&sheet=apartments';
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  
  const nameIdx = headers.findIndex(h => h.includes('아파트명') || h.includes('name'));
  const txKeyIdx = headers.findIndex(h => h.toLowerCase() === 'txkey');
  const hhIdx = headers.findIndex(h => h.includes('세대수') || h.includes('세대'));

  const txKeys = new Set(JSON.parse(fs.readFileSync('public/tx-data/_index.json', 'utf8')));
  
  let totalHh = 0;
  let missingHh = 0;
  let missing = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length <= nameIdx || !cols[nameIdx]) continue;
    
    const name = cols[nameIdx];
    let txKey = txKeyIdx !== -1 ? cols[txKeyIdx] : '';
    const normName = name.replace(/\[.*?\]\s*/g, '').replace(/\s+/g, '').replace(/[()（）]/g, '').trim();
    if (!txKey) txKey = normName;
    
    const hhStr = hhIdx !== -1 ? cols[hhIdx] : '0';
    const hh = parseInt(hhStr.replace(/,/g, '')) || 0;
    
    totalHh += hh;
    
    const indexHasKey = txKeys.has(txKey) || txKeys.has(normName);
    
    // Check if the physical JSON file exists and is valid
    const detailFile = `public/tx-data/${encodeURIComponent(txKey)}.json`;
    const detailFileAlt = `public/tx-data/${encodeURIComponent(normName)}.json`;
    let fileExists = false;
    let fileCorrupted = false;
    let fileEmpty = false;
    
    const targetPath = fs.existsSync(detailFile) ? detailFile : (fs.existsSync(detailFileAlt) ? detailFileAlt : null);
    
    if (targetPath) {
      fileExists = true;
      try {
        const fileContent = fs.readFileSync(targetPath, 'utf8').trim();
        if (!fileContent) {
          fileEmpty = true;
        } else {
          JSON.parse(fileContent); // check if valid JSON
        }
      } catch (err) {
        fileCorrupted = true;
      }
    }
    
    if (!indexHasKey || !fileExists || fileCorrupted || fileEmpty) {
      missing.push({
        name,
        txKey,
        hh,
        inIndex: indexHasKey,
        fileExists,
        fileCorrupted,
        fileEmpty
      });
      missingHh += hh;
    }
  }

  let report = `=========================================\n`;
  report += `📊 DVIEW DATA CONSISTENCY INTEGRITY REPORT\n`;
  report += `=========================================\n`;
  report += `Generated At: ${new Date().toISOString()}\n\n`;
  report += `Sheet count: ${lines.length - 1}\n`;
  report += `TX_SUMMARY index count: ${txKeys.size}\n`;
  report += `Total Households in Sheet: ${totalHh}\n`;
  report += `Households missing/corrupted: ${missingHh} (${((missingHh / totalHh) * 100).toFixed(2)}% of total)\n`;
  report += `Total Issues Found: ${missing.length}\n\n`;
  
  report += `=========================================\n`;
  report += `❌ DETAILED ISSUES LIST\n`;
  report += `=========================================\n`;
  missing.forEach((m, idx) => {
    let status = [];
    if (!m.inIndex) status.push('Missing from _index.json');
    if (!m.fileExists) status.push('Physical JSON file not found');
    if (m.fileCorrupted) status.push('JSON file corrupted (Syntax Error)');
    if (m.fileEmpty) status.push('JSON file is empty');
    
    report += `${idx + 1}. ${m.name}\n`;
    report += `   - txKey: ${m.txKey}\n`;
    report += `   - Households: ${m.hh}\n`;
    report += `   - Status: ${status.join(', ')}\n\n`;
  });

  fs.writeFileSync('missing_report.txt', report, 'utf8');
  console.log('Integrity check completed. Report written to missing_report.txt');
}

check().catch(console.error);
