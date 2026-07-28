const path = require('path');
const fs = require('fs');

// We can read transactionChartTransform.ts and run tests on its logic using ts-node or transpiled execution
const transformPath = path.join('c:', 'Users', 'ocs56', 'OneDrive', '바탕 화면', 'PORTFOLIO', 'PORTFOLIO - DVIEW', 'frontend', 'src', 'lib', 'utils', 'transactionChartTransform.ts');
const code = fs.readFileSync(transformPath, 'utf8');

console.log('--- Inspecting transactionChartTransform.ts ---');
console.log('File exists:', fs.existsSync(transformPath));
console.log('MAX_CACHE_SIZE check:', /MAX_CACHE_SIZE\s*=\s*250/.test(code));
console.log('sharedSecondaryByMonth Map reuse:', /sharedSecondaryByMonth\s*=\s*new Map/.test(code));
console.log('sharedSecondaryMonthly Map reuse:', /sharedSecondaryMonthly\s*=\s*new Map/.test(code));
console.log('sharedSecondaryByMonth clear on start/end:', (code.match(/sharedSecondaryByMonth\.clear\(\)/g) || []).length);
console.log('sharedSecondaryMonthly clear on start/end:', (code.match(/sharedSecondaryMonthly\.clear\(\)/g) || []).length);

// Check LRU logic implementation details
console.log('LRU eviction loop check:', /globalTsCache\.size\s*>=\s*MAX_CACHE_SIZE/.test(code));
console.log('LRU hit order refresh check:', /globalTsCache\.delete\(key\)/.test(code) && /globalTsCache\.set\(key,\s*ts\)/.test(code));
