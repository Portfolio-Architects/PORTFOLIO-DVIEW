const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\ocs56\\OneDrive\\바탕 화면\\PORTFOLIO\\PORTFOLIO - DVIEW';
const apiDir = path.join(root, 'frontend', 'src', 'app', 'api');
let files = [];

function findRoutes(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      findRoutes(full);
    } else if (item.isFile() && (item.name === 'route.ts' || item.name === 'route.tsx' || item.name === 'route.js')) {
      files.push(full);
    }
  }
}
findRoutes(apiDir);

console.log('Total API route files found:', files.length);
let missingRuntime = [];
let missingDynamic = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const hasRuntime = /export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(content);
  const hasDynamic = /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(content);
  if (!hasRuntime) missingRuntime.push(path.relative(root, f));
  if (!hasDynamic) missingDynamic.push(path.relative(root, f));
}

console.log('Missing runtime nodejs count:', missingRuntime.length, missingRuntime);
console.log('Missing dynamic force-dynamic count:', missingDynamic.length, missingDynamic);

// Also check feed.xml
const feedFile = path.join(root, 'frontend', 'src', 'app', 'feed.xml', 'route.ts');
const feedContent = fs.readFileSync(feedFile, 'utf8');
const feedHasRuntime = /export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(feedContent);
console.log('feed.xml has runtime nodejs:', feedHasRuntime);
