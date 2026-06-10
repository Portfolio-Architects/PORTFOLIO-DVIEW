const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');

try {
  let swContent = fs.readFileSync(swPath, 'utf8');
  const buildId = Date.now().toString();

  // Replace CACHE_NAME and DYNAMIC_CACHE_NAME using regex
  const newCacheName = `const CACHE_NAME = 'dview-cache-v-${buildId}';`;
  const newDynamicCacheName = `const DYNAMIC_CACHE_NAME = 'dview-dynamic-v-${buildId}';`;

  swContent = swContent.replace(
    /const CACHE_NAME = 'dview-cache-[^']+';/g,
    newCacheName
  );
  swContent = swContent.replace(
    /const DYNAMIC_CACHE_NAME = 'dview-dynamic-[^']+';/g,
    newDynamicCacheName
  );

  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`[SW Update] Bumped service worker cache name to version v-${buildId}`);

  // Sync src/lib/build-version.ts
  const versionPath = path.join(__dirname, '../src/lib/build-version.ts');
  const newVersionContent = `export const BUILD_VERSION = '${buildId}';\n`;
  fs.writeFileSync(versionPath, newVersionContent, 'utf8');
  console.log(`[Version Update] Updated src/lib/build-version.ts to ${buildId}`);
} catch (error) {
  console.error('[SW Update] Failed to update service worker cache name:', error);
  process.exit(1);
}
