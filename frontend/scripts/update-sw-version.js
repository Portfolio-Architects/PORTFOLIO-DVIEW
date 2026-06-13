const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// Zod schemas for SW Configuration validation
const BuildIdSchema = z.string().regex(/^\d+$/, '빌드 ID는 숫자 형태여야 합니다.');
const CacheNameSchema = z.string().startsWith('dview-cache-v-', '캐시명 접두사가 올바르지 않습니다.');
const DynamicCacheNameSchema = z.string().startsWith('dview-dynamic-v-', '동적 캐시명 접두사가 올바르지 않습니다.');

const swPath = path.join(__dirname, '../public/sw.js');

try {
  let swContent = fs.readFileSync(swPath, 'utf8');
  const buildId = Date.now().toString();

  // Build ID 유효성 사전 검증
  const buildIdParsed = BuildIdSchema.safeParse(buildId);
  if (!buildIdParsed.success) {
    throw new Error(`유효하지 않은 Build ID: ${buildIdParsed.error.message}`);
  }

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

  // 치환된 swContent 캐시명 정합성 사후 검증
  const cacheNameMatch = swContent.match(/const CACHE_NAME = '([^']+)';/);
  const dynamicCacheNameMatch = swContent.match(/const DYNAMIC_CACHE_NAME = '([^']+)';/);
  
  if (!cacheNameMatch || !dynamicCacheNameMatch) {
    throw new Error('캐시 정의 구문을 sw.js에서 찾을 수 없습니다.');
  }

  const parsedCache = CacheNameSchema.safeParse(cacheNameMatch[1]);
  const parsedDynamicCache = DynamicCacheNameSchema.safeParse(dynamicCacheNameMatch[1]);

  if (!parsedCache.success || !parsedDynamicCache.success) {
    throw new Error(`치환된 캐시명이 유효하지 않습니다. CacheName: ${parsedCache.error?.message || 'OK'}, DynamicCacheName: ${parsedDynamicCache.error?.message || 'OK'}`);
  }

  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`[SW Update] Bumped service worker cache name to version v-${buildId}`);

  // Sync src/lib/build-version.ts
  const versionPath = path.join(__dirname, '../src/lib/build-version.ts');
  const newVersionContent = `export const BUILD_VERSION = '${buildId}';\n`;
  fs.writeFileSync(versionPath, newVersionContent, 'utf8');
  console.log(`[Version Update] Updated src/lib/build-version.ts to ${buildId}`);
} catch (error) {
  console.error('[SW Update] Failed to update service worker cache name:', error.message || error);
  process.exit(1);
}
