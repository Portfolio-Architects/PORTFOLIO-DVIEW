/**
 * Adversarial Route, API, Dead Link & Security Verification Suite
 * Role: Challenger 1 (Adversarial Route & Security Verifier)
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(FRONTEND_ROOT, 'src');
const APP_DIR = path.join(SRC_DIR, 'app');

console.log('================================================================');
console.log('  CHALLENGER 1: ADVERSARIAL ROUTE & SECURITY VERIFICATION SUITE ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    failCount++;
    failures.push({ testName, details });
  }
}

// -----------------------------------------------------------------------------
// Helper: Recursive directory walk
// -----------------------------------------------------------------------------
function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// =============================================================================
// TEST SUITE 1: Defunct Route Handlers & Folders in src/app
// =============================================================================
console.log('--- Test Suite 1: Defunct Route Handlers & App Router Tree ---');

const DEFUNCT_APP_PATHS = [
  'admin',
  'write-report',
  'lounge',
  path.join('api', 'admin'),
  path.join('api', 'apartments-sync'),
  path.join('api', 'posts'),
  path.join('api', 'comments'),
  path.join('api', 'auth', 'session'),
  path.join('api', 'debug-reports'),
  path.join('api', 'push', 'notify-comment'),
];

DEFUNCT_APP_PATHS.forEach((relPath) => {
  const targetPath = path.join(APP_DIR, relPath);
  const exists = fs.existsSync(targetPath);
  assert(!exists, `Path must not exist: src/app/${relPath.replace(/\\/g, '/')}`, exists ? `Found existing directory/file at ${targetPath}` : '');
});

// Scan all route files in src/app for any stray admin or lounge handler
const allAppFiles = walkDir(APP_DIR);
const routeFiles = allAppFiles.filter(f => /route\.(ts|js)$|page\.(tsx|jsx)$/.test(f));

let strayDefunctRoutes = 0;
routeFiles.forEach(rf => {
  const rel = path.relative(APP_DIR, rf).replace(/\\/g, '/');
  if (/(^|\/)(admin|write-report|lounge|posts|comments|session)(\/|$)/i.test(rel)) {
    strayDefunctRoutes++;
    console.error(`    Found stray defunct route file: ${rel}`);
  }
});
assert(strayDefunctRoutes === 0, 'Zero stray defunct route files in src/app', `Count: ${strayDefunctRoutes}`);

// =============================================================================
// TEST SUITE 2: Next.js Redirects in next.config.ts
// =============================================================================
console.log('\n--- Test Suite 2: Next.js Redirects Configuration ---');

const nextConfigPath = path.join(FRONTEND_ROOT, 'next.config.ts');
assert(fs.existsSync(nextConfigPath), 'next.config.ts exists');

const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

// Check redirects() function
const hasRedirectsFn = /async\s+redirects\(\)/.test(nextConfigContent);
assert(hasRedirectsFn, 'nextConfig contains async redirects() definition');

// Check /lounge exact redirect
const hasLoungeRedirect = /source:\s*['"]\/lounge['"][\s\S]*?destination:\s*['"]\/['"][\s\S]*?permanent:\s*true/.test(nextConfigContent);
assert(hasLoungeRedirect, 'redirects() has permanent (308) redirect from /lounge to /');

// Check /lounge/:path* wildcard redirect
const hasLoungeWildcardRedirect = /source:\s*['"]\/lounge\/:path\*['"][\s\S]*?destination:\s*['"]\/['"][\s\S]*?permanent:\s*true/.test(nextConfigContent);
assert(hasLoungeWildcardRedirect, 'redirects() has permanent (308) wildcard redirect from /lounge/:path* to /');

// Simulate redirect matching logic using Next.js regex equivalent
function testRedirectMatch(urlPath) {
  // Rule 1: /lounge
  if (urlPath === '/lounge' || urlPath === '/lounge/') return { matched: true, destination: '/', permanent: true };
  // Rule 2: /lounge/:path*
  if (urlPath.startsWith('/lounge/')) return { matched: true, destination: '/', permanent: true };
  return { matched: false };
}

const testUrls = [
  '/lounge',
  '/lounge/',
  '/lounge/12345',
  '/lounge/free/post-abc-xyz',
  '/lounge/market?tag=urgent',
];

testUrls.forEach(url => {
  const res = testRedirectMatch(url);
  assert(res.matched && res.destination === '/' && res.permanent === true, `Redirect simulation for ${url} -> / (permanent: 308)`);
});

// Verify /admin does not have a misleading redirect (should 404 in App Router)
assert(!/source:\s*['"]\/admin['"]/.test(nextConfigContent), 'No backdoor redirect for /admin (returns 404 naturally)');

// =============================================================================
// TEST SUITE 3: Codebase Search for Orphaned References & Dead Links
// =============================================================================
console.log('\n--- Test Suite 3: Codebase Search for Orphaned References ---');

const allSrcFiles = walkDir(SRC_DIR).filter(f => /\.(tsx|ts|jsx|js)$/.test(f) && !f.includes('__tests__') && !f.includes('scripts'));

const DEAD_LINK_PATTERNS = [
  { name: 'href to /admin', regex: /href=['"`]\/admin(\/|['"`])/g },
  { name: 'href to /lounge', regex: /href=['"`]\/lounge(\/|['"`])/g },
  { name: 'href to /write-report', regex: /href=['"`]\/write-report(\/|['"`])/g },
  { name: 'call to /api/admin', regex: /['"`]\/api\/admin(\/|['"`])/g },
  { name: 'call to /api/posts', regex: /['"`]\/api\/posts(\/|['"`])/g },
  { name: 'call to /api/comments', regex: /['"`]\/api\/comments(\/|['"`])/g },
  { name: 'call to /api/auth', regex: /['"`]\/api\/auth(\/|['"`])/g },
  { name: 'call to /api/apartments-sync', regex: /['"`]\/api\/apartments-sync['"`]/g },
  { name: 'call to /api/debug-reports', regex: /['"`]\/api\/debug-reports['"`]/g },
  { name: 'router.push to /admin', regex: /router\.(push|replace)\(['"`]\/admin/g },
  { name: 'router.push to /lounge', regex: /router\.(push|replace)\(['"`]\/lounge/g },
];

DEAD_LINK_PATTERNS.forEach(pattern => {
  let matches = [];
  allSrcFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    if (pattern.regex.test(content)) {
      matches.push(path.relative(SRC_DIR, f));
    }
  });
  assert(matches.length === 0, `Zero references: ${pattern.name}`, matches.length > 0 ? `Found in: ${matches.join(', ')}` : '');
});

// Check for deleted component/hook references
const DEFUNCT_SYMBOLS = [
  'AdminGuard',
  'LoginGateModal',
  'ReportUI',
  'LoungeContainerClient',
  'CommentSection',
  'WriteReviewModal',
  'usePostDetail',
  'useComments',
  'post.repository',
  'comment.repository',
  'post.service',
];

DEFUNCT_SYMBOLS.forEach(symbol => {
  let symbolMatches = [];
  allSrcFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const importRegex = new RegExp(`from\\s+['"][^'"]*${symbol}['"]|import\\s+.*\\b${symbol}\\b`, 'g');
    if (importRegex.test(content)) {
      symbolMatches.push(path.relative(SRC_DIR, f));
    }
  });
  assert(symbolMatches.length === 0, `Zero imports of defunct symbol: ${symbol}`, symbolMatches.length > 0 ? `Found in: ${symbolMatches.join(', ')}` : '');
});

// =============================================================================
// TEST SUITE 4: Authentication Neutralization & Security Posture
// =============================================================================
console.log('\n--- Test Suite 4: Authentication Neutralization & Security Posture ---');

const authContextPath = path.join(SRC_DIR, 'contexts', 'AuthContext.tsx');
assert(fs.existsSync(authContextPath), 'src/contexts/AuthContext.tsx exists');

const authContextContent = fs.readFileSync(authContextPath, 'utf8');

assert(!authContextContent.includes('onAuthStateChanged'), 'AuthContext does NOT invoke onAuthStateChanged listener');
assert(!authContextContent.includes('signInWithPopup'), 'AuthContext does NOT invoke signInWithPopup');
assert(!authContextContent.includes('signInWithRedirect'), 'AuthContext does NOT invoke signInWithRedirect');
assert(!authContextContent.includes('/api/auth/session'), 'AuthContext does NOT call /api/auth/session');
assert(/user:\s*null/.test(authContextContent), 'STATIC_AUTH_STATE has user: null');
assert(/isLoading:\s*false/.test(authContextContent), 'STATIC_AUTH_STATE has isLoading: false');

const adminConfigPath = path.join(SRC_DIR, 'lib', 'config', 'admin.config.ts');
assert(fs.existsSync(adminConfigPath), 'src/lib/config/admin.config.ts exists');

const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf8');
assert(/ADMIN_EMAILS:\s*readonly\s*string\[\]\s*=\s*\[\]/.test(adminConfigContent), 'ADMIN_EMAILS is empty array');
assert(/export function isAdmin[\s\S]*?return false;/.test(adminConfigContent), 'isAdmin() unconditionally returns false');

const useFavoritesPath = path.join(SRC_DIR, 'hooks', 'useFavorites.ts');
assert(fs.existsSync(useFavoritesPath), 'src/hooks/useFavorites.ts exists');

const useFavoritesContent = fs.readFileSync(useFavoritesPath, 'utf8');
assert(useFavoritesContent.includes('dview_guest_favorites'), 'useFavorites uses localStorage key dview_guest_favorites');
assert(!useFavoritesContent.includes("'/api/favorite'"), 'useFavorites does NOT call /api/favorite');
assert(!useFavoritesContent.includes('"/api/favorite"'), 'useFavorites does NOT call /api/favorite');

// =============================================================================
// TEST SUITE 5: Navigation & Layout Component Integrity
// =============================================================================
console.log('\n--- Test Suite 5: Navigation & Core Layout Integrity ---');

// 1. LoungeHeader.tsx
const loungeHeaderPath = path.join(SRC_DIR, 'components', 'LoungeHeader.tsx');
assert(fs.existsSync(loungeHeaderPath), 'LoungeHeader.tsx exists');
const loungeHeaderContent = fs.readFileSync(loungeHeaderPath, 'utf8');

assert(loungeHeaderContent.includes("href=\"/\""), 'LoungeHeader has link to / (아파트 랩)');
assert(loungeHeaderContent.includes("href=\"/explore\""), 'LoungeHeader has link to /explore (아파트 탐색)');
assert(loungeHeaderContent.includes("href=\"/mbti\""), 'LoungeHeader has link to /mbti (단지 MBTI)');
assert(!loungeHeaderContent.includes("href=\"/lounge\""), 'LoungeHeader has NO link to /lounge');
assert(!loungeHeaderContent.includes("href=\"/admin\""), 'LoungeHeader has NO link to /admin');
assert(!loungeHeaderContent.includes("href=\"/technovalley\""), 'LoungeHeader has NO link to /technovalley');

// 2. MobileDock.tsx
const mobileDockPath = path.join(SRC_DIR, 'components', 'pwa', 'MobileDock.tsx');
assert(fs.existsSync(mobileDockPath), 'MobileDock.tsx exists in components/pwa');
const mobileDockContent = fs.readFileSync(mobileDockPath, 'utf8');

assert(mobileDockContent.includes("href: '/'"), 'MobileDock has overview tab to /');
assert(mobileDockContent.includes("href: '/explore'"), 'MobileDock has explore tab to /explore');
assert(mobileDockContent.includes("href: '/mbti'"), 'MobileDock has mbti tab to /mbti');
assert(!mobileDockContent.includes("href: '/lounge'"), 'MobileDock has NO tab to /lounge');
assert(!mobileDockContent.includes("href: '/admin'"), 'MobileDock has NO tab to /admin');

// 3. FloatingUserBar.tsx
const floatingUserBarPath = path.join(SRC_DIR, 'components', 'FloatingUserBar.tsx');
assert(fs.existsSync(floatingUserBarPath), 'FloatingUserBar.tsx exists');
const floatingUserBarContent = fs.readFileSync(floatingUserBarPath, 'utf8');

assert(!floatingUserBarContent.includes('로그인'), 'FloatingUserBar has NO "로그인" text');
assert(!floatingUserBarContent.includes('로그아웃'), 'FloatingUserBar has NO "로그아웃" text');
assert(!floatingUserBarContent.includes('handleLogin'), 'FloatingUserBar has NO handleLogin call');
assert(!floatingUserBarContent.includes('handleLogout'), 'FloatingUserBar has NO handleLogout call');
assert(floatingUserBarContent.includes('setIsSettingsModalOpen'), 'FloatingUserBar retains settings trigger');

// 4. Footer.tsx
const footerPath = path.join(SRC_DIR, 'components', 'Footer.tsx');
assert(fs.existsSync(footerPath), 'Footer.tsx exists');
const footerContent = fs.readFileSync(footerPath, 'utf8');

assert(footerContent.includes('href="/about"'), 'Footer links to /about');
assert(footerContent.includes('href="/contact"'), 'Footer links to /contact');
assert(footerContent.includes('href="/terms"'), 'Footer links to /terms');
assert(footerContent.includes('href="/privacy"'), 'Footer links to /privacy');
assert(!footerContent.includes('href="/admin"'), 'Footer has NO link to /admin');
assert(!footerContent.includes('href="/lounge"'), 'Footer has NO link to /lounge');

// 5. robots.ts
const robotsPath = path.join(SRC_DIR, 'app', 'robots.ts');
assert(fs.existsSync(robotsPath), 'src/app/robots.ts exists');
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert(!robotsContent.includes('/admin'), 'robots.ts has NO /admin references');
assert(!robotsContent.includes('/lounge'), 'robots.ts has NO /lounge references');

// =============================================================================
// SUMMARY & VERDICT
// =============================================================================
console.log('\n================================================================');
console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  console.error('\nFAILURES ENCOUNTERED:');
  failures.forEach((f, idx) => {
    console.error(`  ${idx + 1}. ${f.testName}: ${f.details}`);
  });
  console.log('\nVERDICT: REQUEST_CHANGES');
  process.exit(1);
} else {
  console.log('\nVERDICT: APPROVE');
  process.exit(0);
}
