/**
 * @file scripts/audit-adsense-readiness.ts
 * @description Live production & Google Search Console (GSC) pre-submission readiness gate
 * for Google AdSense review. Run via `npm run adsense:audit` before clicking [검토 요청].
 */
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import { ADSENSE_AND_GOOGLE_REVIEW_BOTS, ALLOWED_REVENUE_SEARCH_BOTS } from '@/lib/seo/robotsPolicy';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com').replace(/\/+$/, '');
const EXPECTED_PUB_ID = 'pub-1103228112872356';
const REQUIRED_INDEXED_PATHS = [
  '/',
  '/guide',
  '/privacy',
  '/contact',
  '/about',
  '/terms',
  '/explore',
  '/stats',
  '/technovalley',
  '/guide/dongtan-1-vs-2-comparison',
  '/guide/dongtan-budget-tier-ranking',
  '/guide/byeongjeom-dome-stadium-hwaseong-court-dongtan-impact',
];

interface GateResult {
  id: string;
  label: string;
  passed: boolean;
  details: string[];
}

function b64u(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getGscAccessToken(): Promise<{ token: string; siteUrl: string } | null> {
  const creds: Array<[string, string]> = [];
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    creds.push([
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim(),
      process.env.GOOGLE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim(),
    ]);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const f = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (f.client_email && f.private_key) creds.push([f.client_email, f.private_key]);
    } catch {
      // ignore invalid JSON
    }
  }

  for (const [email, key] of creds) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const header = b64u(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
      const payload = b64u(
        Buffer.from(
          JSON.stringify({
            iss: email,
            scope: 'https://www.googleapis.com/auth/webmasters.readonly',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now,
          })
        )
      );
      const sig = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), key);
      const jwt = `${header}.${payload}.${b64u(sig)}`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
      });
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      if (!tokenJson.access_token) continue;

      const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const sitesJson = (await sitesRes.json()) as { siteEntry?: Array<{ siteUrl: string }> };
      const matched = sitesJson.siteEntry?.find((s) => s.siteUrl.includes('dongtanview.com'));
      if (matched) {
        return { token: tokenJson.access_token, siteUrl: matched.siteUrl };
      }
    } catch {
      // try next credential
    }
  }
  return null;
}

async function checkRobotsTxt(): Promise<GateResult> {
  const details: string[] = [];
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    const body = await res.text();
    if (!res.ok) {
      return { id: 'robots', label: '1. robots.txt 구글 심사 봇 허용 검증', passed: false, details: [`HTTP ${res.status}`] };
    }
    const missingBots: string[] = [];
    for (const bot of [...ADSENSE_AND_GOOGLE_REVIEW_BOTS, ...ALLOWED_REVENUE_SEARCH_BOTS]) {
      if (!new RegExp(`User-Agent:\\s*${bot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(body)) {
        missingBots.push(bot);
      }
    }
    const wildcardBlockMatch = /User-Agent:\s*\*[\s\S]*?(?:Disallow:\s*\/\s*(?:\r?\n|$))/i.test(body);
    if (missingBots.length > 0) details.push(`허용 누락 봇: ${missingBots.join(', ')}`);
    if (wildcardBlockMatch) details.push('User-Agent: * 규칙에 루트 차단(Disallow: /)이 남아 있습니다.');

    const passed = missingBots.length === 0 && !wildcardBlockMatch;
    if (passed) details.push('구글 심사·검색 봇 전원 허용 및 * 루트 차단 해제 확인');
    return { id: 'robots', label: '1. robots.txt 구글 심사 봇 허용 검증', passed, details };
  } catch (err) {
    return { id: 'robots', label: '1. robots.txt 구글 심사 봇 허용 검증', passed: false, details: [String(err)] };
  }
}

async function checkAdsTxtAndApprovalMeta(): Promise<GateResult> {
  const details: string[] = [];
  try {
    const [adsRes, homeRes] = await Promise.all([
      fetch(`${BASE_URL}/ads.txt`),
      fetch(`${BASE_URL}/`),
    ]);
    const adsTxt = (await adsRes.text()).trim();
    const homeHtml = await homeRes.text();

    const adsOk = adsRes.ok && adsTxt.includes(EXPECTED_PUB_ID);
    const metaOk = homeHtml.includes(`ca-${EXPECTED_PUB_ID}`);
    const adSlots = (homeHtml.match(/data-ad-slot/g) || []).length;
    const editorialPresent = homeHtml.includes('home-editorial-feature-showcase');

    if (!adsOk) details.push(`ads.txt 불일치 (HTTP ${adsRes.status})`);
    if (!metaOk) details.push('홈 HTML에서 google-adsense-account 메타 태그 미검출');
    if (adSlots > 0) details.push(`심사 모드 홈 HTML에 광고 슬롯 ${adSlots}건 잔존`);
    if (!editorialPresent) details.push('홈 에디토리얼 참여 허브(#home-editorial-feature-showcase) 미검출');

    const passed = adsOk && metaOk && adSlots === 0 && editorialPresent;
    if (passed) details.push('ads.txt·메타태그 정상, 심사 모드 광고 슬롯 0건, 홈 에디토리얼 전면 노출 확인');
    return { id: 'ads_meta', label: '2. ads.txt · 소유권 메타 · 심사 모드 클린 검증', passed, details };
  } catch (err) {
    return { id: 'ads_meta', label: '2. ads.txt · 소유권 메타 · 심사 모드 클린 검증', passed: false, details: [String(err)] };
  }
}

async function checkSitemapQuality(): Promise<GateResult> {
  const details: string[] = [];
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    const xml = await res.text();
    const locs = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]);
    const aptCount = locs.filter((u) => u.includes('/apartment/')).length;
    const zoneCount = locs.filter((u) => u.includes('/zone/')).length;
    const guideCount = locs.filter((u) => u.includes('/guide/')).length;

    const passed = res.ok && locs.length >= 30 && locs.length <= 45 && aptCount === 0 && zoneCount === 0 && guideCount >= 25;
    details.push(`총 URL ${locs.length}개 (리포트 ${guideCount}편 / 단지 템플릿 ${aptCount}개 / 권역 ${zoneCount}개)`);
    if (aptCount > 0 || zoneCount > 0) {
      details.push('심사 모드 사이트맵에 프로그램매틱 단지/권역 템플릿이 남아 있습니다.');
    }
    return { id: 'sitemap', label: '3. sitemap.xml 에디토리얼 포트리스(34개 정예) 검증', passed, details };
  } catch (err) {
    return { id: 'sitemap', label: '3. sitemap.xml 에디토리얼 포트리스(34개 정예) 검증', passed: false, details: [String(err)] };
  }
}

function checkLocalEditorialInventory(): GateResult {
  const authors = new Set(GUIDE_ARTICLES.map((g) => g.author));
  const thinGuides = GUIDE_ARTICLES.filter((g) => g.content.trim().length < 2000).map((g) => g.slug);
  const passed = GUIDE_ARTICLES.length >= 25 && authors.size === 1 && thinGuides.length === 0;
  const details = [
    `리포트 ${GUIDE_ARTICLES.length}편 | 단일 편집자 수: ${authors.size} (${Array.from(authors).join(', ')})`,
  ];
  if (thinGuides.length > 0) details.push(`2,000자 미만 리포트: ${thinGuides.join(', ')}`);
  return { id: 'editorial', label: '4. 25편 리포트 분량 및 단일 편집자 E-E-A-T 검증', passed, details };
}

async function checkGscIndexingGate(): Promise<GateResult> {
  const details: string[] = [];
  const auth = await getGscAccessToken();
  if (!auth) {
    return {
      id: 'gsc',
      label: '5. Google Search Console 필수 페이지 색인 및 5xx 0건 게이트',
      passed: false,
      details: ['GSC 서비스 계정 인증 정보를 찾지 못해 수동 확인이 필요합니다.'],
    };
  }

  const results = await Promise.all(
    REQUIRED_INDEXED_PATHS.map(async (p) => {
      const url = `${BASE_URL}${p === '/' ? '/' : p}`;
      const ir = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: url, siteUrl: auth.siteUrl }),
      });
      const ij = (await ir.json()) as {
        inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string } };
      };
      const idx = ij?.inspectionResult?.indexStatusResult || {};
      return { path: p, verdict: idx.verdict || 'UNKNOWN', coverage: idx.coverageState || 'UNKNOWN' };
    })
  );

  const notIndexed = results.filter((r) => r.verdict !== 'PASS');
  const serverErrors = results.filter((r) => /5xx|server error/i.test(r.coverage));

  for (const r of notIndexed) {
    details.push(`[미색인/재요청 필요] ${r.path} -> ${r.verdict} (${r.coverage})`);
  }
  const passed = notIndexed.length === 0 && serverErrors.length === 0;
  if (passed) {
    details.push(`핵심·정책·리포트 ${results.length}/${results.length}개 전수 색인 PASS 및 5xx 0건 확인`);
  }
  return { id: 'gsc', label: '5. Google Search Console 필수 페이지 색인 및 5xx 0건 게이트', passed, details };
}

async function main() {
  console.log(`\n=== D-VIEW 구글 애드센스 재심사 사전 게이트 진단 (${BASE_URL}) ===\n`);
  const gates = await Promise.all([
    checkRobotsTxt(),
    checkAdsTxtAndApprovalMeta(),
    checkSitemapQuality(),
    Promise.resolve(checkLocalEditorialInventory()),
    checkGscIndexingGate(),
  ]);

  let allPassed = true;
  for (const g of gates) {
    const badge = g.passed ? '[PASS]' : '[HOLD]';
    console.log(`${badge} ${g.label}`);
    for (const line of g.details) {
      console.log(`       - ${line}`);
    }
    if (!g.passed) allPassed = false;
  }

  console.log('\n------------------------------------------------------------');
  if (allPassed) {
    console.log('[READY] 모든 기술·색인·에디토리얼 게이트 통과 — 애드센스 콘솔 [검토 요청] 가능!');
  } else {
    console.log('[WAIT] 아직 미통과 항목이 있습니다. 위 [HOLD] 항목 해소(특히 GSC 색인 생성 요청 및 반영) 후 다시 실행하세요.');
  }
  console.log('------------------------------------------------------------\n');
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
