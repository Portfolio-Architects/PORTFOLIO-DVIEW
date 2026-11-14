/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import * as controlsModule from '@/lib/design-system/controls';
import * as copyDietModule from '@/lib/design-system/copyDiet';
import * as adSlotGeometryModule from '@/components/ads/core/adSlotGeometry';
import {
  DVIEW_GA4_CUSTOM_DIMENSIONS,
  DVIEW_GA4_INTERACTION_DIMENSIONS,
  DVIEW_GA4_CUSTOM_METRICS,
} from '@/lib/services/ga4CustomDimensions';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..');
const SKILLS_DIR = path.join(REPO_ROOT, '.agent', 'skills');

const EXPECTED_SKILLS = [
  'dview-real-data-pipeline',
  'dview-adsense-telemetry',
  'dview-design-compliance',
] as const;

const REQUIRED_ENFORCES = [
  '.agent/rules/DVIEW_DRSP.md',
  '.agent/rules/DVIEW_strict-real-data-only.md',
  'DVIEW_DESIGN.md',
] as const;

export interface ParsedFrontmatter {
  name: string;
  description: string;
  enforces: string[];
  body: string;
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseSkillFrontmatter(raw: string): ParsedFrontmatter | null {
  const normalized = raw.replace(/\r\n/g, '\n');
  const openMatch = normalized.match(/^---[ \t]*\n/);
  if (!openMatch) {
    return null;
  }

  const afterOpen = normalized.slice(openMatch[0].length);
  const closeMatch = afterOpen.match(/(?:^|\n)---[ \t]*(?:\n|$)/);
  if (!closeMatch || closeMatch.index === undefined) {
    return null;
  }

  const headerEndOffset =
    closeMatch[0].startsWith('\n') ? closeMatch.index : closeMatch.index;
  const header = afterOpen.slice(0, headerEndOffset);
  const body = afterOpen.slice(closeMatch.index + closeMatch[0].length);
  const lines = header.split('\n');

  let name = '';
  let description = '';
  const enforces: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+):(?:\s*(.*))?$/);
    if (!kvMatch) {
      i++;
      continue;
    }

    const key = kvMatch[1];
    const rawRest = (kvMatch[2] ?? '').trim();

    if (key === 'enforces') {
      if (rawRest.startsWith('[') && rawRest.endsWith(']')) {
        const inner = rawRest.slice(1, -1).trim();
        if (inner) {
          for (const item of inner.split(',')) {
            const cleaned = stripWrappingQuotes(item);
            if (cleaned) enforces.push(cleaned);
          }
        }
        i++;
        continue;
      }
      i++;
      while (i < lines.length) {
        const itemLine = lines[i];
        const itemTrimmed = itemLine.trim();
        if (!itemTrimmed || itemTrimmed.startsWith('#')) {
          i++;
          continue;
        }
        const listMatch = itemLine.match(/^\s*-\s+(.+?)\s*$/);
        if (!listMatch) break;
        enforces.push(stripWrappingQuotes(listMatch[1]));
        i++;
      }
      continue;
    }

    if (/^[>|][-+]?$/.test(rawRest)) {
      const isFolded = rawRest.startsWith('>');
      const blockLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine.trim() === '') {
          blockLines.push('');
          i++;
          continue;
        }
        if (!/^\s+/.test(nextLine)) break;
        blockLines.push(nextLine.trim());
        i++;
      }
      const joined = isFolded
        ? blockLines.filter((l) => l.length > 0).join(' ')
        : blockLines.join('\n').trim();
      if (key === 'name') name = joined;
      if (key === 'description') description = joined;
      continue;
    }

    if (rawRest === '') {
      const contLines: string[] = [];
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        contLines.push(lines[i].trim());
        i++;
      }
      const joined = contLines.join(' ');
      if (key === 'name') name = joined;
      if (key === 'description') description = joined;
      continue;
    }

    const val = stripWrappingQuotes(rawRest);
    if (key === 'name') name = val;
    if (key === 'description') description = val;
    i++;
  }

  return { name, description, enforces, body };
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function extractRelativeMarkdownLinks(markdown: string): string[] {
  const links: string[] = [];
  // Combined left-to-right tokenizer: skips fenced code blocks and inline code spans
  // while matching standard Markdown links (including backticked link labels like [`file.ts`](./file.ts)).
  const tokenRegex =
    /```[\s\S]*?```|`[^`\n]*`|\[(?:`[^`\n]*`|[^\]])*\]\(([^)]+)\)/g;
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
      withoutTitle.startsWith('file:') ||
      withoutTitle.startsWith('#') ||
      withoutTitle.startsWith('sidecar://')
    ) {
      continue;
    }
    const withoutAnchor = withoutTitle.split('#')[0].trim();
    if (withoutAnchor) {
      links.push(safeDecodeURIComponent(withoutAnchor));
    }
  }
  return links;
}

const EMOJI_PICTOGRAPH_REGEX = /\p{Extended_Pictographic}/u;

describe('DVIEW Phase 2 — Project Skills (.agent/skills/) & Tool Bindings SSOT', () => {
  it('handles malformed, multi-line YAML, inline code spans, link titles, and raw % in parsers safely', () => {
    expect(parseSkillFrontmatter('')).toBeNull();
    expect(parseSkillFrontmatter('# No frontmatter')).toBeNull();
    expect(parseSkillFrontmatter('---\nname: unclosed')).toBeNull();

    const multilineYaml = [
      '---',
      'name: sample-skill',
      'description: >-',
      '  First folded sentence for trigger matching.',
      '  Second folded sentence for context.',
      "enforces: ['.agent/rules/DVIEW_DRSP.md', 'DVIEW_DESIGN.md']",
      '---',
    ].join('\n');
    const parsedMulti = parseSkillFrontmatter(multilineYaml);
    expect(parsedMulti).not.toBeNull();
    expect(parsedMulti!.name).toBe('sample-skill');
    expect(parsedMulti!.description).toBe(
      'First folded sentence for trigger matching. Second folded sentence for context.'
    );
    expect(parsedMulti!.enforces).toEqual([
      '.agent/rules/DVIEW_DRSP.md',
      'DVIEW_DESIGN.md',
    ]);

    const sampleMd = [
      '[External](https://dongtanview.com)',
      '[FileScheme](file:///c:/workspace/README.md)',
      '[AnchorOnly](#section-1)',
      'Inline code example `[문서명](./상대경로.md)` must be ignored.',
      '[`CodeLabelLink`](./DVIEW_AGENT.md "Agent SSOT")',
      '[Encoded](./DVIEW_PORTFOLIO%20DVIEW%20-%20Patch%20History.md#latest)',
      '[RawPercent](./100%-real.md)',
      '```markdown',
      '[IgnoredCodeFence](./non-existent-example.md)',
      '```',
    ].join('\n');

    expect(extractRelativeMarkdownLinks(sampleMd)).toEqual([
      './DVIEW_AGENT.md',
      './DVIEW_PORTFOLIO DVIEW - Patch History.md',
      './100%-real.md',
    ]);
  });

  it('keeps legacy duplicate agent directories removed while establishing root .agent/skills/', () => {
    expect(fs.existsSync(path.join(FRONTEND_ROOT, '.agent'))).toBe(false);
    expect(fs.existsSync(path.join(FRONTEND_ROOT, '.agents'))).toBe(false);
    expect(fs.existsSync(SKILLS_DIR)).toBe(true);
  });

  it.each(EXPECTED_SKILLS)(
    'validates %s SKILL.md frontmatter, enforces invariants, token budget, and zero-emoji rule',
    (skillName) => {
      const skillFile = path.join(SKILLS_DIR, skillName, 'SKILL.md');
      expect(fs.existsSync(skillFile)).toBe(true);

      const raw = fs.readFileSync(skillFile, 'utf8');
      const lineCount = raw.replace(/\r\n/g, '\n').split('\n').length;
      expect(lineCount).toBeGreaterThan(30);
      expect(lineCount).toBeLessThanOrEqual(200);
      expect(EMOJI_PICTOGRAPH_REGEX.test(raw)).toBe(false);

      const parsed = parseSkillFrontmatter(raw);
      expect(parsed).not.toBeNull();
      expect(parsed!.name).toBe(skillName);
      expect(parsed!.description.length).toBeGreaterThanOrEqual(60);
      expect(parsed!.enforces).toEqual([...REQUIRED_ENFORCES]);

      for (const enforcedRelPath of parsed!.enforces) {
        const absEnforced = path.resolve(REPO_ROOT, enforcedRelPath);
        expect(fs.existsSync(absEnforced)).toBe(true);
      }
    }
  );

  it('resolves 100% of relative Markdown links across DVIEW_AGENT.md, DVIEW_DESIGN.md, master plan, rules, workflows, and skills', () => {
    const requiredLinkBearingDocs = [
      path.join(REPO_ROOT, 'DVIEW_AGENT.md'),
      path.join(REPO_ROOT, 'DVIEW_DESIGN.md'),
      path.join(REPO_ROOT, '.agent', 'rules', 'DVIEW_DRSP.md'),
      path.join(REPO_ROOT, '.agent', 'rules', 'DVIEW_strict-real-data-only.md'),
      path.join(REPO_ROOT, '.agent', 'workflows', 'DVIEW_git-push.md'),
      path.join(REPO_ROOT, '.agent', 'workflows', 'DVIEW_localhost-open.md'),
      ...EXPECTED_SKILLS.map((s) => path.join(SKILLS_DIR, s, 'SKILL.md')),
    ];
    const optionalLinkBearingDocs = [
      path.join(REPO_ROOT, 'AGENT_SKILL_REPORT_OPTIMIZATION_PLAN.md'),
    ];

    const brokenLinks: Array<{ source: string; target: string; resolved: string }> = [];

    for (const mdPath of [...requiredLinkBearingDocs, ...optionalLinkBearingDocs]) {
      expect(fs.existsSync(mdPath)).toBe(true);
      const content = fs.readFileSync(mdPath, 'utf8');
      const relLinks = extractRelativeMarkdownLinks(content);
      if (requiredLinkBearingDocs.includes(mdPath)) {
        expect(relLinks.length).toBeGreaterThan(0);
      }

      for (const relTarget of relLinks) {
        const resolved = path.resolve(path.dirname(mdPath), relTarget);
        if (!fs.existsSync(resolved)) {
          brokenLinks.push({
            source: path.relative(REPO_ROOT, mdPath),
            target: relTarget,
            resolved,
          });
        }
      }
    }

    expect(brokenLinks).toEqual([]);
  });

  it('binds DVIEW_AGENT.md and .agent/rules/* directly to their corresponding Layer 2 skills', () => {
    const agentMd = fs.readFileSync(path.join(REPO_ROOT, 'DVIEW_AGENT.md'), 'utf8');
    const drspMd = fs.readFileSync(
      path.join(REPO_ROOT, '.agent', 'rules', 'DVIEW_DRSP.md'),
      'utf8'
    );
    const strictDataMd = fs.readFileSync(
      path.join(REPO_ROOT, '.agent', 'rules', 'DVIEW_strict-real-data-only.md'),
      'utf8'
    );

    expect(EMOJI_PICTOGRAPH_REGEX.test(agentMd)).toBe(false);
    expect(EMOJI_PICTOGRAPH_REGEX.test(drspMd)).toBe(false);
    expect(EMOJI_PICTOGRAPH_REGEX.test(strictDataMd)).toBe(false);

    for (const skillName of EXPECTED_SKILLS) {
      expect(agentMd).toContain(`./.agent/skills/${skillName}/SKILL.md`);
    }
    expect(drspMd).toContain('../skills/dview-design-compliance/SKILL.md');
    expect(drspMd).toContain('../skills/dview-adsense-telemetry/SKILL.md');
    expect(strictDataMd).toContain('../skills/dview-real-data-pipeline/SKILL.md');
  });

  it('verifies npm scripts, circuit-breaker thresholds, env keys, and commercial repo bindings in dview-real-data-pipeline', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(FRONTEND_ROOT, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> };

    for (const skillName of EXPECTED_SKILLS) {
      const skillMd = fs.readFileSync(path.join(SKILLS_DIR, skillName, 'SKILL.md'), 'utf8');
      const npmRunMatches = Array.from(skillMd.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g));
      for (const m of npmRunMatches) {
        const scriptKey = m[1];
        expect(pkgJson.scripts).toHaveProperty(scriptKey);
      }
    }

    const syncTxSource = fs.readFileSync(
      path.join(FRONTEND_ROOT, 'scripts', 'sync-transactions.js'),
      'utf8'
    );
    const officeTxRepoSource = fs.readFileSync(
      path.join(FRONTEND_ROOT, 'src', 'lib', 'repositories', 'officeTx.repository.ts'),
      'utf8'
    );
    const pipelineSkillMd = fs.readFileSync(
      path.join(SKILLS_DIR, 'dview-real-data-pipeline', 'SKILL.md'),
      'utf8'
    );

    expect(syncTxSource).toContain('MIN_APARTMENTS_THRESHOLD = 120');
    expect(syncTxSource).toContain('MIN_SALE_TX_THRESHOLD = 40000');
    expect(syncTxSource).toContain('MIN_RENT_TX_THRESHOLD = 60000');
    expect(officeTxRepoSource).toContain('PUBLIC_DATA_PORTAL_KEY');
    expect(officeTxRepoSource).toContain('RTMSDataSvcNrgTrade');

    expect(pipelineSkillMd).toContain('120개');
    expect(pipelineSkillMd).toContain('40,000건');
    expect(pipelineSkillMd).toContain('60,000건');
    expect(pipelineSkillMd).toContain('0.98');
    expect(pipelineSkillMd).toContain('BUILDING_API_KEY');
    expect(pipelineSkillMd).toContain('PUBLIC_DATA_PORTAL_KEY');
    expect(pipelineSkillMd).toContain('officeTx.repository.ts');
    expect(pipelineSkillMd).toContain('firebase-mcp-server');
    expect(pipelineSkillMd).toContain('portfolio-google-sheets');
    expect(pipelineSkillMd).toContain('debug_sheet_range');
  });

  it('enforces 1:1 GA4 custom dimension/metric SSOT parity, runtime ServerName ("google-analytics"), and zero-denominator guard', () => {
    const ga4ServerSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'mcp-servers', 'ga4-mcp', 'src', 'index.ts'),
      'utf8'
    );
    const ga4ServerBuild = fs.readFileSync(
      path.join(REPO_ROOT, 'mcp-servers', 'ga4-mcp', 'build', 'index.js'),
      'utf8'
    );
    const firebaseServerSrc = fs.readFileSync(
      path.join(REPO_ROOT, 'mcp-servers', 'firebase-mcp', 'src', 'index.ts'),
      'utf8'
    );

    const telemetrySkillMd = fs.readFileSync(
      path.join(SKILLS_DIR, 'dview-adsense-telemetry', 'SKILL.md'),
      'utf8'
    );
    const pipelineSkillMd = fs.readFileSync(
      path.join(SKILLS_DIR, 'dview-real-data-pipeline', 'SKILL.md'),
      'utf8'
    );

    // Runtime MCP ServerName binding & zero-denominator guard
    expect(telemetrySkillMd).toContain('ServerName: "google-analytics"');
    expect(telemetrySkillMd).toContain('IMPRESSION > 0');
    expect(telemetrySkillMd).toContain('VIEWABLE_IMPRESSION > 0');
    expect(telemetrySkillMd).toContain('분모 모수 0건(산출 불가)');

    // 1:1 parity between frontend SSOT (ga4CustomDimensions.ts) and ga4-mcp (src + build)
    const allFrontendDims = [
      ...DVIEW_GA4_CUSTOM_DIMENSIONS,
      ...DVIEW_GA4_INTERACTION_DIMENSIONS,
    ];
    expect(DVIEW_GA4_CUSTOM_DIMENSIONS.length).toBe(7);
    expect(DVIEW_GA4_INTERACTION_DIMENSIONS.length).toBe(9);
    expect(DVIEW_GA4_CUSTOM_METRICS.length).toBe(2);

    for (const dim of allFrontendDims) {
      expect(ga4ServerSrc).toContain(`parameterName: "${dim.parameterName}"`);
      expect(ga4ServerSrc).toContain(`apiName: "${dim.apiName}"`);
      expect(ga4ServerBuild).toContain(`parameterName: "${dim.parameterName}"`);
    }
    for (const dim of DVIEW_GA4_INTERACTION_DIMENSIONS) {
      expect(telemetrySkillMd).toContain(dim.parameterName);
    }
    for (const metric of DVIEW_GA4_CUSTOM_METRICS) {
      expect(ga4ServerSrc).toContain(`parameterName: "${metric.parameterName}"`);
      expect(ga4ServerBuild).toContain(`parameterName: "${metric.parameterName}"`);
      expect(telemetrySkillMd).toContain(metric.parameterName);
    }

    const ga4ToolsReferenced = Array.from(
      new Set(Array.from(telemetrySkillMd.matchAll(/`(ga4_[a-z0-9_]+)`/g), (m) => m[1]))
    );
    expect(ga4ToolsReferenced.length).toBe(7);
    for (const toolName of ga4ToolsReferenced) {
      expect(ga4ServerSrc).toContain(`name: "${toolName}"`);
    }

    const firebaseToolsReferenced = Array.from(
      new Set(Array.from(pipelineSkillMd.matchAll(/`(firebase_[a-z0-9_]+)`/g), (m) => m[1]))
    );
    expect(firebaseToolsReferenced).toEqual(
      expect.arrayContaining(['firebase_query', 'firebase_get_doc'])
    );
    for (const toolName of firebaseToolsReferenced) {
      expect(firebaseServerSrc).toContain(`name: "${toolName}"`);
    }

    for (const skillName of EXPECTED_SKILLS) {
      const skillMd = fs.readFileSync(path.join(SKILLS_DIR, skillName, 'SKILL.md'), 'utf8');
      const testPathMatches = Array.from(
        skillMd.matchAll(/\b(src\/[a-zA-Z0-9_./-]+\.test\.tsx?)\b/g),
        (m) => m[1]
      );
      expect(testPathMatches.length).toBeGreaterThan(0);
      for (const relTestPath of testPathMatches) {
        expect(fs.existsSync(path.join(FRONTEND_ROOT, relTestPath))).toBe(true);
      }
    }
  });

  it('verifies every design-system helper & behavioral quick-scan pattern in dview-design-compliance', () => {
    const designSkillMd = fs.readFileSync(
      path.join(SKILLS_DIR, 'dview-design-compliance', 'SKILL.md'),
      'utf8'
    );

    const expectedControlExports = [
      'DVIEW_CONTROL_CLASSES',
      'getToggleTrackClass',
      'getToggleBtnClass',
      'getControlSelectClass',
      'getControlInputClass',
      'getControlPillClass',
    ] as const;
    for (const symbol of expectedControlExports) {
      expect(designSkillMd).toContain(symbol);
      expect((controlsModule as Record<string, unknown>)[symbol]).toBeDefined();
    }

    const expectedCopyDietExports = [
      'DVIEW_COPY_BUDGETS',
      'SINGLE_CARD_SIGNAL_CAP',
      'SEO_FORBIDDEN_CLOAKING_CLASSES',
      'checkCopyBudget',
      'truncateToCopyBudget',
      'getVisualSignalPillClass',
      'getSeoAccordionClass',
      'getSeoAccordionSummaryClass',
      'getSeoAccordionChevronClass',
      'getSeoAccordionBodyClass',
      'auditSeoSemanticContainer',
    ] as const;
    for (const symbol of expectedCopyDietExports) {
      expect(designSkillMd).toContain(symbol);
      expect((copyDietModule as Record<string, unknown>)[symbol]).toBeDefined();
    }

    expect(designSkillMd).toContain('getAdSlotMinHeightClass');
    expect(typeof adSlotGeometryModule.getAdSlotMinHeightClass).toBe('function');

    // Extract the PowerShell Select-String -Pattern "..." regex and verify it catches every prohibited token
    const patternMatch = designSkillMd.match(/Select-String\s+-Path\s+"[^"]+"\s+-Pattern\s+"([^"]+)"/);
    expect(patternMatch).not.toBeNull();
    const quickScanRegex = new RegExp(patternMatch![1], 'i');

    const forbiddenSamples = [
      'className="font-mono text-sm"',
      'fontFamily: "ui-monospace, SFMono-Regular"',
      'font-family: GulimChe;',
      'font-family: DotumChe;',
      'font-family: BatangChe;',
      'font-family: Consolas;',
      'font-family: Courier New;',
      'color: #7c3aed;',
      'background: #ff8f00;',
      'className="bg-pink-500"',
      'className="text-indigo-600"',
      'className="from-purple-500 to-amber-400 via-teal-500"',
      'className="fill-yellow-400 stroke-gray-500 ring-zinc-300"',
    ];
    for (const bad of forbiddenSamples) {
      expect(quickScanRegex.test(bad)).toBe(true);
    }

    const compliantSamples = [
      'className="tabular-nums text-[15px] font-semibold text-[#191f28]"',
      'fontFamily: "var(--font-pretendard), sans-serif"',
      'className="bg-[#f9fafb] hover:bg-[#f2f4f6] border-[#f2f4f6] rounded-2xl"',
      'className="bg-slate-900 text-emerald-600 bg-blue-600 text-[#3182f6] text-[#f04452]"',
    ];
    for (const good of compliantSamples) {
      expect(quickScanRegex.test(good)).toBe(false);
    }
  });
});
