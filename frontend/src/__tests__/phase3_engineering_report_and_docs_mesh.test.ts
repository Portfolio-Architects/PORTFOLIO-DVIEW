/**
 * @jest-environment node
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import ts from 'typescript';
import { getEngineeringReport } from '@/app/actions/getEngineeringReport';
import { logger } from '@/lib/services/logger';
import { parseEngineeringReportMarkdown } from '@/lib/utils/engineeringReportParser';
import { extractRelativeMarkdownLinks } from './agent_skills_ssot_bindings.test';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const reportSyncModule = require('../../scripts/sync-engineering-report.js') as {
  normalizeReportText: (raw: string) => string;
  rebaseReportLinksForTarget: (
    normalizedContent: string,
    sourcePath: string,
    targetPath: string
  ) => string;
  validateEngineeringReportContract: (raw: string, label?: string) => {
    normalized: string;
    hasTitleHeader: boolean;
    metadata: { date: string; grade: string; branch: string; status: string };
    markdownContent: string;
  };
  syncEngineeringReport: (options?: {
    sourcePath?: string;
    targetPath?: string;
    checkOnly?: boolean;
  }) => {
    status: 'in-sync' | 'synced' | 'fallback-verified';
    updated: boolean;
    sourcePath: string;
    targetPath: string;
    metadata: { date: string; grade: string; branch: string; status: string };
  };
};

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..');
const EMOJI_PICTOGRAPH_REGEX = /\p{Extended_Pictographic}/u;

/**
 * Real GFM / github-slugger compatible heading slug generator:
 * - Preserves double hyphens when symbols (`&`, `/`, `—`) between spaces are removed
 * - Preserves underscores (`\p{Pc}`)
 * - Appends `-1`, `-2` on duplicate headings in the same document
 * - Skips headings inside fenced code blocks
 */
function getDocumentSlugs(markdown: string): string[] {
  const occurrences = new Map<string, number>();
  const slugs: string[] = [];
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const rest = fenceMatch[2] ?? '';
      if (!inFence) {
        if (marker[0] !== '`' || !rest.includes('`')) {
          inFence = true;
          fenceChar = marker[0];
          fenceLen = marker.length;
        }
      } else if (marker[0] === fenceChar && marker.length >= fenceLen && !rest.trim()) {
        inFence = false;
        fenceChar = '';
        fenceLen = 0;
      }
      continue;
    }
    if (inFence) continue;
    if (!/^#{1,6}\s+/.test(line)) continue;

    const baseSlug = line
      .trim()
      .replace(/^#+\s+/, '')
      .replace(/\s+#+\s*$/, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*~]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-');

    const count = occurrences.get(baseSlug) ?? 0;
    occurrences.set(baseSlug, count + 1);
    slugs.push(count === 0 ? baseSlug : `${baseSlug}-${count}`);
  }

  return slugs;
}

function discoverAllActiveMarkdownFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ['node_modules', '.git', '.next', '.venv', '.pytest_cache', '.agents', 'coverage', 'out'].includes(
        entry.name
      )
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      discoverAllActiveMarkdownFiles(full, acc);
    } else if (entry.name.endsWith('.md')) {
      acc.push(full);
    }
  }
  return acc;
}

function extractAllRelativeAndAnchorLinks(
  markdown: string
): Array<{ filePart: string; anchorPart: string }> {
  const results: Array<{ filePart: string; anchorPart: string }> = [];
  const tokenRegex = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|\[(?:`[^`\n]*`|[^\]])*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null = null;
  while ((match = tokenRegex.exec(markdown)) !== null) {
    if (match[1] === undefined) continue;
    const withoutTitle = match[1]
      .trim()
      .replace(/\s+(?:"[^"]*"|'[^']*')\s*$/, '')
      .trim();
    if (
      !withoutTitle ||
      withoutTitle.startsWith('http://') ||
      withoutTitle.startsWith('https://') ||
      withoutTitle.startsWith('mailto:') ||
      withoutTitle.startsWith('tel:') ||
      withoutTitle.startsWith('file:') ||
      withoutTitle.startsWith('sidecar://')
    ) {
      continue;
    }
    if (withoutTitle.startsWith('#')) {
      let anchorPart = withoutTitle.slice(1).trim();
      try {
        anchorPart = decodeURIComponent(anchorPart);
      } catch {}
      if (anchorPart) {
        results.push({ filePart: '', anchorPart });
      }
      continue;
    }
    const [rawFile, rawAnchor = ''] = withoutTitle.split('#');
    let filePart = rawFile.trim();
    let anchorPart = rawAnchor.trim();
    try {
      filePart = decodeURIComponent(filePart);
    } catch {}
    try {
      anchorPart = decodeURIComponent(anchorPart);
    } catch {}
    if (filePart) {
      results.push({ filePart, anchorPart });
    }
  }
  return results;
}

describe('DVIEW Phase 3 — Engineering Report Runtime Contract, Dual-Source Sync & Cross-Linking Mesh', () => {
  describe('1. Runtime Parsing Contract (parseEngineeringReportMarkdown, NFT Tracing & getEngineeringReport)', () => {
    it('parses live Engineering Report identically across frontend CWD, repo root CWD, and isolated serverless fallback', async () => {
      const fromFrontend = await getEngineeringReport();
      expect(fromFrontend.metadata.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fromFrontend.metadata.grade).toBe('S+');
      expect(fromFrontend.metadata.branch).toBe('master');
      expect(fromFrontend.metadata.status.length).toBeGreaterThan(0);
      expect(fromFrontend.markdownContent).toContain('## 1. Executive Summary');
      expect(fromFrontend.markdownContent).not.toMatch(/^#(?!#)\s+.*PORTFOLIO DVIEW/m);
      expect(fromFrontend.markdownContent).not.toMatch(/^>\s*\*\*Date\*\*:/m);

      const cwdSpyRoot = jest.spyOn(process, 'cwd').mockReturnValue(REPO_ROOT);
      try {
        const fromRepoRoot = await getEngineeringReport();
        expect(fromRepoRoot).toEqual(fromFrontend);
      } finally {
        cwdSpyRoot.mockRestore();
      }

      // Isolated serverless container with only src/data/engineering-report.md (rebased ../../../ links)
      // must normalize links back to ./ and return 100% identical metadata + markdownContent
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dview-report-parity-'));
      try {
        const fallbackDir = path.join(tmpDir, 'src', 'data');
        fs.mkdirSync(fallbackDir, { recursive: true });
        fs.copyFileSync(
          path.join(FRONTEND_ROOT, 'src', 'data', 'engineering-report.md'),
          path.join(fallbackDir, 'engineering-report.md')
        );

        const cwdSpyIsolated = jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
        try {
          const fromIsolatedFallback = await getEngineeringReport();
          expect(fromIsolatedFallback).toEqual(fromFrontend);
        } finally {
          cwdSpyIsolated.mockRestore();
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('falls through corrupted priority candidates to valid fallback and logs ENOENT when all candidates are missing', async () => {
      const tmpOuter = fs.mkdtempSync(path.join(os.tmpdir(), 'dview-report-fallback-'));
      const tmpFrontend = path.join(tmpOuter, 'frontend');
      fs.mkdirSync(tmpFrontend, { recursive: true });

      try {
        // Case A: empty isolated directory -> graceful fallback error markdown + structured error log
        const cwdSpyEmpty = jest.spyOn(process, 'cwd').mockReturnValue(tmpFrontend);
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
        try {
          const missingRes = await getEngineeringReport();
          expect(missingRes.metadata).toEqual({ date: '', grade: '', branch: '', status: '' });
          expect(missingRes.markdownContent).toContain('리포트를 불러올 수 없습니다.');
          expect(errorSpy).toHaveBeenCalledWith(
            'getEngineeringReportAction',
            'Error reading engineering report',
            {},
            expect.objectContaining({ code: 'ENOENT' })
          );
        } finally {
          errorSpy.mockRestore();
          cwdSpyEmpty.mockRestore();
        }

        // Case B: corrupted parent root candidate + valid src/data/engineering-report.md fallback
        fs.writeFileSync(
          path.join(tmpOuter, 'DVIEW_PORTFOLIO DVIEW - Engineering Report.md'),
          '# Corrupted Root Candidate Without Metadata\nBroken partial write',
          'utf8'
        );
        const fallbackDir = path.join(tmpFrontend, 'src', 'data');
        fs.mkdirSync(fallbackDir, { recursive: true });
        fs.copyFileSync(
          path.join(FRONTEND_ROOT, 'src', 'data', 'engineering-report.md'),
          path.join(fallbackDir, 'engineering-report.md')
        );

        const cwdSpyCorrupt = jest.spyOn(process, 'cwd').mockReturnValue(tmpFrontend);
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
        try {
          const recoveredRes = await getEngineeringReport();
          expect(recoveredRes.metadata.grade).toBe('S+');
          expect(recoveredRes.metadata.branch).toBe('master');
          expect(recoveredRes.markdownContent).toContain('Ad Money v5.1');
          expect(warnSpy).toHaveBeenCalledWith(
            'getEngineeringReportAction',
            expect.stringContaining('invalid metadata/title contract'),
            expect.objectContaining({
              candidatePath: path.join(tmpOuter, 'DVIEW_PORTFOLIO DVIEW - Engineering Report.md'),
            })
          );
        } finally {
          warnSpy.mockRestore();
          cwdSpyCorrupt.mockRestore();
        }
      } finally {
        fs.rmSync(tmpOuter, { recursive: true, force: true });
      }
    });

    it('traces src/data/engineering-report.md via @vercel/nft static file analysis on getEngineeringReport.ts', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { nodeFileTrace } = require('next/dist/compiled/@vercel/nft') as {
        nodeFileTrace: (
          files: string[],
          opts: { base: string; processCwd: string }
        ) => Promise<{ fileList: Set<string> }>;
      };

      const probeDir = fs.mkdtempSync(path.join(FRONTEND_ROOT, '.nft-jest-probe-'));
      try {
        const actionSource = fs
          .readFileSync(path.join(FRONTEND_ROOT, 'src', 'app', 'actions', 'getEngineeringReport.ts'), 'utf8')
          .replace('@/lib/utils/engineeringReportParser', '../src/lib/utils/engineeringReportParser')
          .replace('@/lib/services/logger', '../src/lib/services/logger');

        const transpiledCjs = ts.transpileModule(actionSource, {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
          },
        }).outputText;

        const entryFile = path.join(probeDir, 'getEngineeringReport.cjs');
        fs.writeFileSync(entryFile, transpiledCjs, 'utf8');

        const traceResult = await nodeFileTrace([entryFile], {
          base: FRONTEND_ROOT,
          processCwd: FRONTEND_ROOT,
        });

        const normalizedTraced = Array.from(traceResult.fileList, (f) => f.replace(/\\/g, '/'));
        expect(normalizedTraced).toContain('src/data/engineering-report.md');
      } finally {
        fs.rmSync(probeDir, { recursive: true, force: true });
      }
    });

    it('handles BOM, CRLF, H2-H6 false-positive rejection, single-line backtick code spans, and fenced blocks safely', () => {
      expect(parseEngineeringReportMarkdown('')).toEqual({
        metadata: { date: '', grade: '', branch: '', status: '' },
        markdownContent: '',
        hasTitleHeader: false,
        isContractValid: false,
      });

      const adversarialSample = [
        '\uFEFF```inline-code-span-at-line-start``` should not open an unclosed fence',
        '# PORTFOLIO DVIEW — Engineering Report',
        '>   **Date**: 2026-11-14  |  **Grade**: S+  |  **Branch**: master  |  **Status**: Active Production',
        '',
        '## PORTFOLIO DVIEW — Subheading Must Never Be Stripped',
        'Inline code `[example](../../../should-stay.md)` vs real link [`DVIEW_AGENT.md`](../../../DVIEW_AGENT.md).',
        '```markdown',
        '# PORTFOLIO DVIEW — Example Inside Code Fence',
        '> **Date**: 1999-01-01 | **Grade**: F | **Branch**: broken | **Status**: ShouldNotOverride',
        '[FenceLink](../../../keep-verbatim.md)',
        '```',
        'Body paragraph preserved.',
      ].join('\r\n');

      const parsed = parseEngineeringReportMarkdown(adversarialSample);
      expect(parsed.isContractValid).toBe(true);
      expect(parsed.hasTitleHeader).toBe(true);
      expect(parsed.metadata).toEqual({
        date: '2026-11-14',
        grade: 'S+',
        branch: 'master',
        status: 'Active Production',
      });
      expect(parsed.markdownContent).toContain('## PORTFOLIO DVIEW — Subheading Must Never Be Stripped');
      expect(parsed.markdownContent).toContain('`[example](../../../should-stay.md)`');
      expect(parsed.markdownContent).toContain('[`DVIEW_AGENT.md`](./DVIEW_AGENT.md)');
      expect(parsed.markdownContent).toContain('# PORTFOLIO DVIEW — Example Inside Code Fence');
      expect(parsed.markdownContent).toContain('[FenceLink](../../../keep-verbatim.md)');
      expect(parsed.markdownContent).not.toContain('\r');

      // H2 (`##`) containing PORTFOLIO DVIEW without a real H1 (`#`) must FAIL contract validation
      const h2OnlyMissingH1 = [
        '## 1. PORTFOLIO DVIEW Subheading Only',
        '> **Date**: 2026-11-14 | **Grade**: S+ | **Branch**: master | **Status**: Active Production',
        'A'.repeat(260),
      ].join('\n');
      const parsedH2Only = parseEngineeringReportMarkdown(h2OnlyMissingH1);
      expect(parsedH2Only.hasTitleHeader).toBe(false);
      expect(parsedH2Only.isContractValid).toBe(false);
      expect(parsedH2Only.markdownContent).toContain('## 1. PORTFOLIO DVIEW Subheading Only');
      expect(() => reportSyncModule.validateEngineeringReportContract(h2OnlyMissingH1)).toThrow(
        /런타임 파싱 계약 위반/
      );
    });
  });

  describe('2. Dual-Source Synchronization & Build Pipelines (sync-engineering-report.js, package.json, vercel.json)', () => {
    it('wires prebuild, build:full, sync-report, check-report, vercel.json buildCommand, and next.config.ts NFT includes', () => {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(FRONTEND_ROOT, 'package.json'), 'utf8')
      ) as { scripts: Record<string, string> };
      const vercelJson = JSON.parse(
        fs.readFileSync(path.join(FRONTEND_ROOT, 'vercel.json'), 'utf8')
      ) as { buildCommand: string };
      const nextConfigText = fs.readFileSync(path.join(FRONTEND_ROOT, 'next.config.ts'), 'utf8');

      expect(pkgJson.scripts.prebuild).toBe('node scripts/sync-engineering-report.js');
      expect(pkgJson.scripts['sync-report']).toBe('node scripts/sync-engineering-report.js');
      expect(pkgJson.scripts['check-report']).toBe('node scripts/sync-engineering-report.js --check');
      expect(pkgJson.scripts['build:full']).toContain('node scripts/sync-engineering-report.js');
      expect(vercelJson.buildCommand).toContain('node scripts/sync-engineering-report.js');
      expect(nextConfigText).toContain("'./src/data/engineering-report.md'");

      const checkResult = reportSyncModule.syncEngineeringReport({ checkOnly: true });
      expect(checkResult.status).toBe('in-sync');
      expect(checkResult.updated).toBe(false);

      const rootPath = path.join(REPO_ROOT, 'DVIEW_PORTFOLIO DVIEW - Engineering Report.md');
      const fallbackPath = path.join(FRONTEND_ROOT, 'src', 'data', 'engineering-report.md');
      const rootNormalized = reportSyncModule.normalizeReportText(fs.readFileSync(rootPath, 'utf8'));
      const expectedMirrored = reportSyncModule.rebaseReportLinksForTarget(
        rootNormalized,
        rootPath,
        fallbackPath
      );
      const actualFallback = reportSyncModule.normalizeReportText(
        fs.readFileSync(fallbackPath, 'utf8')
      );
      expect(actualFallback).toBe(expectedMirrored);
    });

    it('detects drift, rebases relative links for frontend/src/data, blocks malformed contracts, and supports isolated containers', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dview-report-sync-'));
      try {
        const sourcePath = path.join(tmpDir, 'DVIEW_PORTFOLIO DVIEW - Engineering Report.md');
        const targetPath = path.join(tmpDir, 'frontend', 'src', 'data', 'engineering-report.md');

        const validReport = [
          '# PORTFOLIO DVIEW — Engineering Report',
          '> **Date**: 2026-11-14 | **Grade**: S+ | **Branch**: master | **Status**: Active Production',
          '',
          '## 1. Summary',
          'See [`DVIEW_AGENT.md`](./DVIEW_AGENT.md) and `[inline](./untouched.md)`.',
          'A'.repeat(240),
        ].join('\n');

        const expectedTarget = validReport.replace(
          '[`DVIEW_AGENT.md`](./DVIEW_AGENT.md)',
          '[`DVIEW_AGENT.md`](../../../DVIEW_AGENT.md)'
        );

        fs.writeFileSync(sourcePath, validReport, 'utf8');
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, expectedTarget + '\nstale-drift', 'utf8');

        // 1) --check must fail on drift without modifying target
        expect(() =>
          reportSyncModule.syncEngineeringReport({ sourcePath, targetPath, checkOnly: true })
        ).toThrow(/이중 소스 드리프트 감지/);
        expect(fs.readFileSync(targetPath, 'utf8')).toContain('stale-drift');

        // 2) sync heals drift and rebases ./ links to ../../../
        const synced = reportSyncModule.syncEngineeringReport({ sourcePath, targetPath });
        expect(synced.status).toBe('synced');
        expect(synced.updated).toBe(true);
        expect(fs.readFileSync(targetPath, 'utf8')).toBe(expectedTarget);

        // 3) second run is idempotent no-op
        const second = reportSyncModule.syncEngineeringReport({ sourcePath, targetPath });
        expect(second.status).toBe('in-sync');
        expect(second.updated).toBe(false);

        // 4) malformed source contract must throw and never corrupt valid target
        fs.writeFileSync(sourcePath, '# Broken Header\nshort body', 'utf8');
        expect(() => reportSyncModule.syncEngineeringReport({ sourcePath, targetPath })).toThrow(
          /런타임 파싱 계약 위반/
        );
        expect(fs.readFileSync(targetPath, 'utf8')).toBe(expectedTarget);

        // 5) isolated frontend build without root source verifies existing target
        fs.unlinkSync(sourcePath);
        const isolated = reportSyncModule.syncEngineeringReport({ sourcePath, targetPath });
        expect(isolated.status).toBe('fallback-verified');
        expect(isolated.updated).toBe(false);

        // 6) both missing must throw
        fs.unlinkSync(targetPath);
        expect(() => reportSyncModule.syncEngineeringReport({ sourcePath, targetPath })).toThrow(
          /모두 존재하지 않습니다/
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('3. Full-Repository Cross-Linking Mesh, Real Data Parity & Zero-Emoji Compliance', () => {
    it('resolves 100% of relative links, same-doc #anchors, and cross-doc #anchors across all active .md files in repository', () => {
      const allActiveMdFiles = discoverAllActiveMarkdownFiles(REPO_ROOT);
      expect(allActiveMdFiles.length).toBeGreaterThanOrEqual(21);

      // Must include both the master plan and the mirrored frontend fallback
      const relPaths = allActiveMdFiles.map((f) => path.relative(REPO_ROOT, f).replace(/\\/g, '/'));
      expect(relPaths).toEqual(
        expect.arrayContaining([
          'DVIEW_PORTFOLIO DVIEW - Engineering Report.md',
          'frontend/src/data/engineering-report.md',
          'AGENT_SKILL_REPORT_OPTIMIZATION_PLAN.md',
          'DVIEW_PORTFOLIO DVIEW - Patch History.md',
          'docs/archive/patch-history-v1.md',
          'docs/adsense-approval-report.md',
          'docs/molit-crawling-feasibility.md',
          'docs/firebase-custom-auth-domain.md',
        ])
      );

      const issues: Array<{ doc: string; link: string; reason: string }> = [];
      let totalVerifiedLinks = 0;

      for (const absDoc of allActiveMdFiles) {
        const relDoc = path.relative(REPO_ROOT, absDoc).replace(/\\/g, '/');
        const content = fs.readFileSync(absDoc, 'utf8');
        const extracted = extractAllRelativeAndAnchorLinks(content);

        for (const { filePart, anchorPart } of extracted) {
          totalVerifiedLinks++;
          if (!filePart) {
            // Same-document #anchor verification
            const selfSlugs = getDocumentSlugs(content);
            if (!selfSlugs.includes(anchorPart)) {
              issues.push({
                doc: relDoc,
                link: `#${anchorPart}`,
                reason: `Same-document heading anchor not found in ${relDoc}`,
              });
            }
            continue;
          }

          const resolved = path.resolve(path.dirname(absDoc), filePart);
          if (!fs.existsSync(resolved)) {
            issues.push({ doc: relDoc, link: filePart, reason: `Missing file: ${resolved}` });
            continue;
          }

          if (anchorPart && fs.statSync(resolved).isFile() && resolved.endsWith('.md')) {
            const targetContent = fs.readFileSync(resolved, 'utf8');
            const targetSlugs = getDocumentSlugs(targetContent);
            if (!targetSlugs.includes(anchorPart)) {
              issues.push({
                doc: relDoc,
                link: `${filePart}#${anchorPart}`,
                reason: `Anchor not found in ${path.relative(REPO_ROOT, resolved)}`,
              });
            }
          }
        }
      }

      expect(totalVerifiedLinks).toBeGreaterThanOrEqual(200);
      expect(issues).toEqual([]);
    });

    it('matches real apartment count in market-stats.json and eliminates legacy unprefixed doc names, Pastel Cute, and emojis', () => {
      const engReport = fs.readFileSync(
        path.join(REPO_ROOT, 'DVIEW_PORTFOLIO DVIEW - Engineering Report.md'),
        'utf8'
      );
      const patchHistory = fs.readFileSync(
        path.join(REPO_ROOT, 'DVIEW_PORTFOLIO DVIEW - Patch History.md'),
        'utf8'
      );
      const patchArchive = fs.readFileSync(
        path.join(REPO_ROOT, 'docs', 'archive', 'patch-history-v1.md'),
        'utf8'
      );
      const projectMd = fs.readFileSync(path.join(REPO_ROOT, 'DVIEW_PROJECT.md'), 'utf8');
      const authGuideMd = fs.readFileSync(
        path.join(REPO_ROOT, 'docs', 'firebase-custom-auth-domain.md'),
        'utf8'
      );
      const marketStats = JSON.parse(
        fs.readFileSync(path.join(FRONTEND_ROOT, 'public', 'data', 'market-stats.json'), 'utf8')
      ) as { apartmentCount: number };

      expect(engReport).toContain(`아파트 ${marketStats.apartmentCount}개 단지`);

      const engLinks = extractRelativeMarkdownLinks(engReport);
      expect(engLinks).toEqual(
        expect.arrayContaining([
          './DVIEW_AGENT.md',
          './DVIEW_PROJECT.md',
          './DVIEW_DESIGN.md',
          './DVIEW_PORTFOLIO DVIEW - Patch History.md',
          './docs/archive/patch-history-v1.md',
          './docs/adsense-approval-report.md',
          './docs/molit-crawling-feasibility.md',
          './docs/firebase-custom-auth-domain.md',
          './.agent/rules/DVIEW_DRSP.md',
          './.agent/rules/DVIEW_strict-real-data-only.md',
          './.agent/skills/dview-real-data-pipeline/SKILL.md',
          './.agent/skills/dview-adsense-telemetry/SKILL.md',
          './.agent/skills/dview-design-compliance/SKILL.md',
        ])
      );

      const legacyUnprefixedPatterns = [
        /(?<![A-Za-z0-9_-])AGENT\.md\b/,
        /(?<![A-Za-z0-9_-])PROJECT\.md\b/,
        /(?<![A-Za-z0-9_-])DESIGN\.md\b/,
        /(?<![A-Za-z0-9_-])strict-real-data-only\.md\b/,
        /(?<![A-Za-z0-9_-])PORTFOLIO DVIEW - Engineering Report\.md/,
        /(?<![A-Za-z0-9_-])PORTFOLIO DVIEW - Patch History\.md/,
      ];

      for (const docText of [engReport, patchHistory, patchArchive, projectMd]) {
        for (const regex of legacyUnprefixedPatterns) {
          expect(regex.test(docText)).toBe(false);
        }
      }

      expect(engReport).not.toContain('Pastel Cute');
      expect(engReport).toContain('Ad Money v5.1');

      expect(EMOJI_PICTOGRAPH_REGEX.test(engReport)).toBe(false);
      expect(EMOJI_PICTOGRAPH_REGEX.test(patchHistory)).toBe(false);
      expect(EMOJI_PICTOGRAPH_REGEX.test(patchArchive)).toBe(false);
      expect(EMOJI_PICTOGRAPH_REGEX.test(authGuideMd)).toBe(false);
    });
  });

  describe('4. Lossless Patch History Archiving & docs/ Consolidation', () => {
    it('keeps active Patch History under 30KB (>90% token savings) while preserving all 236 release entries across active + archive', () => {
      const activePath = path.join(REPO_ROOT, 'DVIEW_PORTFOLIO DVIEW - Patch History.md');
      const archivePath = path.join(REPO_ROOT, 'docs', 'archive', 'patch-history-v1.md');

      expect(fs.existsSync(activePath)).toBe(true);
      expect(fs.existsSync(archivePath)).toBe(true);

      const activeBytes = fs.statSync(activePath).size;
      expect(activeBytes).toBeLessThan(30 * 1024);

      const activeLines = fs.readFileSync(activePath, 'utf8').split(/\r?\n/);
      const archiveLines = fs.readFileSync(archivePath, 'utf8').split(/\r?\n/);

      const dateRowRegex = /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/;
      const activeReleaseRows = activeLines.filter((l) => dateRowRegex.test(l.trim()));
      const archiveReleaseRows = archiveLines.filter((l) => dateRowRegex.test(l.trim()));

      expect(activeReleaseRows.length).toBe(5);
      expect(archiveReleaseRows.length).toBe(231);
      expect(activeReleaseRows.length + archiveReleaseRows.length).toBe(236);

      const activeJoined = activeReleaseRows.join('\n');
      for (const phase of ['Phase 1004', 'Phase 1003', 'Phase 1002', 'Phase 1001', 'Phase 1000']) {
        expect(activeJoined).toContain(phase);
      }
    });

    it('consolidates frontend/docs into root docs/firebase-custom-auth-domain.md', () => {
      expect(fs.existsSync(path.join(FRONTEND_ROOT, 'docs'))).toBe(false);
      const consolidatedPath = path.join(REPO_ROOT, 'docs', 'firebase-custom-auth-domain.md');
      expect(fs.existsSync(consolidatedPath)).toBe(true);

      const content = fs.readFileSync(consolidatedPath, 'utf8');
      expect(content).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      expect(content).toContain('/__/auth/handler');
    });
  });
});
