/**
 * @jest-environment jsdom
 *
 * Verification suite for:
 * 1. Morning-only KST Schedule Gate in `.github/workflows/sync-transactions.yml` (blocks delayed ~11:00 KST crawl/commit/2nd deploy)
 * 2. Strict revenue-bot robots.txt allowlist (`Googlebot`, `Mediapartners-Google`, `Yeti`, `Daumoa`, `Bingbot`) & AI/SEO bot blocklist
 * 3. Second-round SSG payload diet (`/guide/*`, `/explore`, `/apartment/*`): `<DviewIconSprite>` SVG `<use>` refs, compact tuple/catalog props, zero heavy data imports in client views
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import yaml from 'js-yaml';
import ts from 'typescript';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import robots from '@/app/robots';
import {
  ADSENSE_CRAWLER_BOT,
  ALLOWED_REVENUE_SEARCH_BOTS,
  BLOCKED_AI_AND_SEO_SCRAPER_BOTS,
} from '@/lib/seo/robotsPolicy';
import {
  runNaverSearchAdvisorAudit,
  collectAndAuditNaverSeoReadiness,
} from '@/lib/seo/naverSearchAdvisorAudit';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import DviewIconSprite from '@/components/common/DviewIconSprite';
import { DviewIcon, DVIEW_ICON_SYMBOL_ID, type DviewIconName } from '@/components/common/DviewIcon';
import ExploreCatalogRows, {
  type CompactExploreCatalogRow,
} from '@/components/explore/ExploreCatalogRows';
import GuideArticlePage from '@/app/guide/[slug]/page';
import ApartmentPage from '@/app/apartment/[aptName]/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  notFound: jest.fn(),
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
}));

jest.mock('@/components/DashboardClient', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-dashboard-client" />,
}));

jest.mock('@/components/LoungeHeader', () => ({
  __esModule: true,
  default: () => <header data-testid="mock-lounge-header" />,
}));

jest.mock('@/components/pwa/MobileDock', () => ({
  __esModule: true,
  default: () => <nav data-testid="mock-mobile-dock" />,
}));

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    isIOS: false,
    isPushSupported: true,
    isStandalone: false,
    showToast: jest.fn(),
    triggerCustomA2HSModal: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    userFavorites: [],
    handleToggleFavorite: jest.fn(),
  }),
  isApartmentInFavorites: () => false,
}));

function findBashBinary(): string | null {
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Git\\bin\\bash.exe',
          'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
        ]
      : ['/bin/bash', '/usr/bin/bash'];
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

describe('Vercel 2nd-Round Payload Diet, Strict Bot Blocking & 11:00 KST GHA Gate', () => {
  // =========================================================================
  // 1. Morning-only KST Schedule Gate (Blocks Delayed 11:00 KST Crawls)
  // =========================================================================
  describe('1. GitHub Actions Morning-Only KST Gate (.github/workflows/sync-transactions.yml)', () => {
    const workflowPath = path.resolve(__dirname, '../../../.github/workflows/sync-transactions.yml');
    const rawYaml = fs.readFileSync(workflowPath, 'utf8');
    const doc = yaml.load(rawYaml) as {
      jobs: { sync: { steps: Array<Record<string, unknown>> } };
    };
    const steps = doc.jobs.sync.steps;

    it('places schedule_gate before Checkout/Setup/Install with working-directory: . and gates Steps 1-4 cleanly', () => {
      const gateIdx = steps.findIndex((s) => s.id === 'schedule_gate');
      const checkoutIdx = steps.findIndex((s) => s.name === 'Checkout');
      const setupNodeIdx = steps.findIndex((s) => s.name === 'Setup Node.js');
      const installIdx = steps.findIndex((s) => s.name === 'Install dependencies');
      const fetchIdx = steps.findIndex((s) => s.name === 'Fetch transactions from 국토부 API');
      const generateIdx = steps.findIndex((s) => s.name === 'Generate static transaction files');
      const commitIdx = steps.findIndex((s) => s.id === 'commit_push');
      const pruneIdx = steps.findIndex((s) => s.name === 'Prune Vercel deployments');
      const failIdx = steps.findIndex((s) => s.name === 'Send notification on failure');

      expect(gateIdx).toBe(0);
      expect(checkoutIdx).toBeGreaterThan(gateIdx);
      expect(steps[gateIdx]['working-directory']).toBe('.');
      expect(steps[failIdx]['working-directory']).toBe('.');

      for (const idx of [checkoutIdx, setupNodeIdx, installIdx]) {
        expect(String(steps[idx].if || '')).toContain(
          "steps.schedule_gate.outputs.should_crawl == 'true'"
        );
      }
      for (const idx of [fetchIdx, generateIdx, commitIdx, pruneIdx]) {
        expect(String(steps[idx].if || '')).toContain(
          "steps.schedule_gate.outputs.should_crawl == 'true'"
        );
      }
    });

    it('empirically enforces 05:00-07:29 KST window, avoids bash octal bugs (0800/0900), skips 11:00 KST and already-live-today runs, and allows workflow_dispatch', () => {
      const bashBin = findBashBinary();
      expect(bashBin).not.toBeNull();

      const gateStep = steps.find((s) => s.id === 'schedule_gate');
      const gateScript = String(gateStep?.run || '');
      expect(gateScript).toContain('10#${KST_HHMM_RAW}');
      expect(gateScript).toContain('-lt 500');
      expect(gateScript).toContain('-ge 730');
      expect(gateScript).toContain('Cache-Control: no-cache');
      expect(gateScript).toContain('market-stats.json?t=${CACHE_BUST}');

      const runGateScenario = (opts: {
        eventName: 'schedule' | 'workflow_dispatch' | 'push';
        kstHhmm: string;
        todayYmd: string;
        liveMarketStatsJson: string;
      }): Record<string, string> => {
        const patchedScript = gateScript
          .replace(/\$\{\{\s*github\.event_name\s*\}\}/g, opts.eventName)
          .replace(
            "KST_HHMM_RAW=$(TZ='Asia/Seoul' date +%H%M)",
            `KST_HHMM_RAW="${opts.kstHhmm}"`
          )
          .replace(
            "TODAY_YMD=$(TZ='Asia/Seoul' date +%Y%m%d)",
            `TODAY_YMD="${opts.todayYmd}"`
          )
          .replace(
            /LIVE_JSON=\$\(curl[^\n]+\)/,
            `LIVE_JSON='${opts.liveMarketStatsJson}'`
          );

        const tmpOut = path.join(
          process.env.TEMP || process.env.TMP || '/tmp',
          `gha-gate-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
        );
        try {
          fs.writeFileSync(tmpOut, '', 'utf8');
          // Run with exact GitHub Actions ubuntu-latest bash flags (-eo pipefail)
          const res = spawnSync(bashBin!, ['-eo', 'pipefail', '-c', patchedScript], {
            env: { ...process.env, GITHUB_OUTPUT: tmpOut },
            encoding: 'utf8',
          });
          expect(res.status).toBe(0);
          const outText = fs.readFileSync(tmpOut, 'utf8');
          const outputs: Record<string, string> = {};
          for (const line of outText.split(/\r?\n/)) {
            const eq = line.indexOf('=');
            if (eq > 0) outputs[line.slice(0, eq)] = line.slice(eq + 1);
          }
          return outputs;
        } finally {
          if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
        }
      };

      // Delayed daytime runs (including 11:00 KST & octal-trap 0800 / 0900) MUST NOT crawl
      for (const blockedTime of ['0459', '0730', '0800', '0900', '1100', '1207', '2359']) {
        const res = runGateScenario({
          eventName: 'schedule',
          kstHhmm: blockedTime,
          todayYmd: '20261119',
          liveMarketStatsJson: '{"latestRegisteredDate":"20261118"}',
        });
        expect(res).toEqual({
          should_crawl: 'false',
          skip_reason: 'outside_morning_window',
        });
      }

      // Early morning window (05:00 & 07:29) when production does NOT yet have today's batch -> crawls as safety net
      for (const allowedTime of ['0500', '0618', '0729']) {
        const res = runGateScenario({
          eventName: 'schedule',
          kstHhmm: allowedTime,
          todayYmd: '20261119',
          liveMarketStatsJson: '{"latestRegisteredDate":"20261118"}',
        });
        expect(res).toEqual({
          should_crawl: 'true',
          skip_reason: 'none',
        });
      }

      // Early morning window (06:38) when 06:34 Vercel Deploy Hook ALREADY published today's batch -> skips duplicate crawl
      // Tests both single-line and multiline pretty-printed market-stats.json under -eo pipefail
      expect(
        runGateScenario({
          eventName: 'schedule',
          kstHhmm: '0638',
          todayYmd: '20261119',
          liveMarketStatsJson: '{\n  "apartmentCount": 183,\n  "latestRegisteredDate": "20261119",\n  "saleTxCount": 66410\n}',
        })
      ).toEqual({
        should_crawl: 'false',
        skip_reason: 'already_live_today',
      });

      // Empty or non-JSON 502 CDN error response during morning window falls through cleanly without pipefail crash
      for (const badPayload of ['', '<html>502 Bad Gateway</html>']) {
        expect(
          runGateScenario({
            eventName: 'schedule',
            kstHhmm: '0618',
            todayYmd: '20261119',
            liveMarketStatsJson: badPayload,
          })
        ).toEqual({
          should_crawl: 'true',
          skip_reason: 'none',
        });
      }

      // Manual workflow_dispatch at 11:00 KST still works
      expect(
        runGateScenario({
          eventName: 'workflow_dispatch',
          kstHhmm: '1100',
          todayYmd: '20261119',
          liveMarketStatsJson: '{"latestRegisteredDate":"20261119"}',
        })
      ).toEqual({
        should_crawl: 'true',
        skip_reason: 'none',
      });

      // Standard git push never triggers crawl
      expect(
        runGateScenario({
          eventName: 'push',
          kstHhmm: '0600',
          todayYmd: '20261119',
          liveMarketStatsJson: '{}',
        })
      ).toEqual({
        should_crawl: 'false',
        skip_reason: 'push_event',
      });
    });
  });

  // =========================================================================
  // 2. robots.ts Strict Revenue-Bot Allowlist & Foreign AI/SEO Scraper Block
  // =========================================================================
  describe('2. robots.ts Revenue-Only Allowlist & AI/SEO Scraper Blocklist', () => {
    it('allows ONLY Googlebot, Mediapartners-Google, Yeti, Daumoa, Bingbot and explicitly disallows AI & SEO scrapers plus wildcard *', () => {
      const config = robots();
      const rules = Array.isArray(config.rules) ? config.rules : [config.rules];

      const allowRules = rules.filter((r) => Boolean(r.allow));
      const allowedAgents = allowRules.flatMap((r) =>
        Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]
      );

      expect(new Set(allowedAgents)).toEqual(
        new Set([ADSENSE_CRAWLER_BOT, ...ALLOWED_REVENUE_SEARCH_BOTS])
      );
      expect(allowedAgents).not.toContain('*');

      const blockRule = rules.find(
        (r) => Array.isArray(r.userAgent) && r.userAgent.includes('GPTBot')
      );
      expect(blockRule).toBeDefined();
      expect(blockRule?.disallow).toBe('/');
      expect(blockRule?.allow).toBeUndefined();

      for (const blockedBot of [
        'GPTBot',
        'ChatGPT-User',
        'OAI-SearchBot',
        'ClaudeBot',
        'PerplexityBot',
        'Google-Extended',
        'Applebot-Extended',
        'Bytespider',
        'CCBot',
        'AhrefsBot',
        'SemrushBot',
        'MJ12bot',
        'DotBot',
        'BLEXBot',
        'DataForSeoBot',
        'YandexBot',
        'Baiduspider',
      ]) {
        expect(BLOCKED_AI_AND_SEO_SCRAPER_BOTS).toContain(blockedBot);
        expect(blockRule?.userAgent).toContain(blockedBot);
        expect(allowedAgents).not.toContain(blockedBot);
      }

      const wildcardRule = rules.find((r) => r.userAgent === '*');
      expect(wildcardRule).toBeDefined();
      expect(wildcardRule?.allow).toBeUndefined();
      expect(wildcardRule?.disallow).toEqual(
        expect.arrayContaining(['/', '/api/cron/', '/api/ads/', '/api/push/', '/api/indexing/'])
      );
      expect(config.sitemap).toBe('https://dongtanview.com/sitemap.xml');
    });

    it('removes contradictory ai-search-crawling allow meta from layout.tsx and passes live Naver Search Advisor audit', async () => {
      const layoutSrc = fs.readFileSync(path.resolve(__dirname, '../app/layout.tsx'), 'utf8');
      expect(layoutSrc).not.toContain('ai-search-crawling');
      expect(layoutSrc).toContain('naver-site-verification');

      const liveReport = await collectAndAuditNaverSeoReadiness(process.cwd());
      expect(liveReport.passed).toBe(true);

      // Synthetic negative control: missing Bingbot must fail audit
      const missingBingReport = runNaverSearchAdvisorAudit({
        baseUrl: 'https://dongtanview.com',
        rootVerificationToken: 'e0240efa3f3f36785b2ca54faa765e9058f3707a',
        rssAutodiscovery: { rootLayout: true, guideIndex: true, guideDetail: true },
        robotsConfig: {
          rules: [
            { userAgent: 'Mediapartners-Google', allow: '/' },
            { userAgent: ['Googlebot', 'Yeti', 'Daumoa'], allow: '/' },
            { userAgent: '*', disallow: '/' },
          ],
          sitemap: 'https://dongtanview.com/sitemap.xml',
        },
        sitemapEntries: [],
        feedXml: '',
        rssXml: '',
        guides: GUIDE_ARTICLES.slice(0, 1),
        guideJsonLds: [],
      });
      const robotsCheck = missingBingReport.checks.find((c) => c.id === 'robots_yeti_and_geo_bots')!;
      expect(robotsCheck.passed).toBe(false);
      expect(robotsCheck.issues.some((m) => m.includes('Bingbot'))).toBe(true);
    });
  });

  // =========================================================================
  // 3. Second-Round Page Payload Diet (Sprite SVG + Compact Client Views)
  // =========================================================================
  describe('3. Second-Round SSG Payload Diet (DviewIconSprite, /explore, /guide/*, /apartment/*)', () => {
    it('defines every DVIEW_ICON_SYMBOL_ID in <DviewIconSprite /> and renders compact <use> refs via <DviewIcon />', () => {
      const { container } = render(
        <>
          <DviewIconSprite />
          {(Object.keys(DVIEW_ICON_SYMBOL_ID) as DviewIconName[]).map((name) => (
            <DviewIcon key={name} name={name} size={12} />
          ))}
        </>
      );

      const sprite = container.querySelector('#dview-icon-sprite');
      expect(sprite).not.toBeNull();
      const symbolIds = new Set(
        Array.from(sprite!.querySelectorAll('symbol')).map((el) => el.id)
      );

      for (const [iconName, symId] of Object.entries(DVIEW_ICON_SYMBOL_ID)) {
        expect(symbolIds.has(symId)).toBe(true);
        const useRef = container.querySelector(`svg.d-ic use[href="#${symId}"]`);
        expect(useRef).not.toBeNull();
        expect(iconName.length).toBeGreaterThan(0);
      }
    });

    it('renders compact numeric/dedup ExploreCatalogRows accurately for normal, zero-price, and empty states', () => {
      const sampleRows: CompactExploreCatalogRow[] = [
        ['동탄역롯데캐슬', '', '오산동', '2021.07', 940, 155000, 75000, 1],
        ['테스트신규단지', '테스트정규슬러그', '신동', '', 0, 0, 45000, 0],
        ['소액단지', '', '능동', '2010년', '320', 9500, 0, 1],
      ];

      const { container, rerender } = render(
        <table>
          <tbody>
            <ExploreCatalogRows rows={sampleRows} />
          </tbody>
        </table>
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
      expect(rows[0].querySelector('a')?.getAttribute('href')).toBe(
        `/apartment/${encodeURIComponent('동탄역롯데캐슬')}`
      );
      expect(rows[0].textContent).toContain('940세대');
      expect(rows[0].textContent).toContain('15억 5,000만원');
      expect(rows[0].textContent).toContain('7억 5,000만원');
      expect(rows[0].textContent).toContain('48%');

      // Non-detail row renders plain span, 0 price/households -> '정보 없음'
      expect(rows[1].querySelector('a')).toBeNull();
      expect(rows[1].textContent).toContain('정보 없음');
      expect(rows[1].textContent).not.toContain('NaN');

      // Sub-1억 price formatting
      expect(rows[2].textContent).toContain('9,500만원');
      expect(rows[2].textContent).toContain('320세대');

      // Empty rows edge case
      rerender(
        <table>
          <tbody>
            <ExploreCatalogRows rows={[]} />
          </tbody>
        </table>
      );
      expect(container.textContent).toContain('등록된 실거래 내역이 없습니다.');
    });

    it('replaces hundreds of duplicated inline Lucide SVGs on Guide & Apartment pages with compact <use> refs and keeps client components free of heavy data runtime imports', async () => {
      // Static bundle hygiene guard: client views must NEVER runtime-import @/lib/data/guides or canonicalAptCatalog
      const bannedRuntimeModules = new Set([
        '@/lib/data/guides',
        '@/lib/utils/canonicalAptCatalog',
      ]);
      const clientViewFiles = [
        '../components/guide/GuideArticleContentClient.tsx',
        '../components/guide/guideContentRenderer.tsx',
        '../components/explore/ExploreCatalogRows.tsx',
        '../components/apartment/ApartmentReportSections.tsx',
      ];
      for (const rel of clientViewFiles) {
        const absPath = path.resolve(__dirname, rel);
        const src = fs.readFileSync(absPath, 'utf8');
        const sf = ts.createSourceFile(absPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const runtimeViolations: string[] = [];

        const visit = (node: ts.Node) => {
          if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const mod = node.moduleSpecifier.text;
            if (bannedRuntimeModules.has(mod)) {
              const clause = node.importClause;
              const isAllTypeOnly =
                clause?.isTypeOnly === true ||
                (clause &&
                  !clause.name &&
                  clause.namedBindings &&
                  ts.isNamedImports(clause.namedBindings) &&
                  clause.namedBindings.elements.length > 0 &&
                  clause.namedBindings.elements.every((el) => el.isTypeOnly));
              if (!isAllTypeOnly) {
                runtimeViolations.push(`${rel}: runtime import "${mod}"`);
              }
            }
          } else if (ts.isCallExpression(node)) {
            const firstArg = node.arguments[0];
            if (firstArg && ts.isStringLiteral(firstArg) && bannedRuntimeModules.has(firstArg.text)) {
              if (
                node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) && node.expression.text === 'require')
              ) {
                runtimeViolations.push(`${rel}: dynamic runtime import "${firstArg.text}"`);
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(sf);
        expect(runtimeViolations).toEqual([]);
      }

      // Guide page empirical render check
      const guideJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-budget-tier-ranking' }),
      });
      const { container: guideContainer, unmount: unmountGuide } = render(guideJsx);
      const guideUseIcons = guideContainer.querySelectorAll('svg.d-ic use[href^="#di-"]');
      expect(guideUseIcons.length).toBeGreaterThanOrEqual(250);
      expect(guideContainer.querySelector('#guide-article-body')).not.toBeNull();
      expect(guideContainer.querySelector('#guide-bottom-apt-preview-cards')).not.toBeNull();
      expect(guideContainer.querySelector('#guide-faq-section')).not.toBeNull();
      unmountGuide();

      // Apartment page empirical render check
      const aptJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('METAPOLIS') }),
      });
      const { container: aptContainer, unmount: unmountApt } = render(aptJsx);
      const aptUseIcons = aptContainer.querySelectorAll('svg.d-ic use[href^="#di-"]');
      expect(aptUseIcons.length).toBeGreaterThanOrEqual(25);
      expect(aptContainer.querySelector('#apt-ssr-comprehensive-report')).not.toBeNull();
      expect(aptContainer.querySelectorAll('caption.sr-only').length).toBe(5);
      unmountApt();
    });

    it('guards CSS cascade layer integrity (dark/hover gcard bg, valid CSS vars, DviewIcon inline strokeWidth override)', () => {
      // 1. DviewIcon custom strokeWidth must use inline style (beats .d-ic CSS rule), default 2 omits style
      const { container: iconContainer, unmount: unmountIcons } = render(
        <>
          <DviewIcon name="star" size={12} strokeWidth={2.3} />
          <DviewIcon name="check" size={12} strokeWidth={2.5} />
          <DviewIcon name="arrow-up-right" size={12} />
          <DviewIcon name="calendar" size={12} strokeWidth={2} />
        </>
      );
      const svgs = iconContainer.querySelectorAll('svg.d-ic');
      expect(svgs[0].getAttribute('style')).toContain('stroke-width: 2.3px');
      expect(svgs[1].getAttribute('style')).toContain('stroke-width: 2.5px');
      expect(svgs[2].getAttribute('style')).toBeNull();
      expect(svgs[3].getAttribute('style')).toBeNull();
      unmountIcons();

      // 2. GuideAptPreviewCard must pair dark:bg-* and hover:bg-* utilities with bg-slate-50/90 so @layer utilities never traps dark mode white-on-white
      const gcardSrc = fs.readFileSync(
        path.resolve(__dirname, '../components/guide/GuideAptPreviewCard.tsx'),
        'utf8'
      );
      expect(gcardSrc).toContain('bg-slate-50/90 hover:bg-slate-100/80 dark:bg-slate-900/80 dark:hover:bg-slate-800/80');

      // 3. Every var(--...) referenced inside @layer components in globals.css must be defined in :root
      const cssSrc = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
      const rootBlockEnd = cssSrc.indexOf('@theme inline');
      const definedVars = new Set(
        (cssSrc.slice(0, rootBlockEnd).match(/--[a-z0-9-]+(?=\s*:)/gi) || [])
      );
      const layerIdx = cssSrc.lastIndexOf('@layer components');
      expect(layerIdx).toBeGreaterThan(0);
      const usedVars = Array.from(
        new Set(
          (cssSrc.slice(layerIdx).match(/var\((--[a-z0-9-]+)/gi) || []).map((m) => m.slice(4))
        )
      );
      const undefinedVars = usedVars.filter((v) => !definedVars.has(v));
      expect(undefinedVars).toEqual([]);

      // 4. ExploreCatalogRows treats string '0' households as '정보 없음'
      const { container: zeroStrContainer, unmount: unmountZero } = render(
        <table>
          <tbody>
            <ExploreCatalogRows rows={[['테스트', '', '청계동', '2020년', '0', 0, 0, 0]]} />
          </tbody>
        </table>
      );
      expect(zeroStrContainer.textContent).not.toContain('0세대');
      expect(zeroStrContainer.textContent).toContain('정보 없음');
      unmountZero();
    });
  });
});
