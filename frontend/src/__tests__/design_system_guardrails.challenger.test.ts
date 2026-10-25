/**
 * @file design_system_guardrails.challenger.test.ts
 * @description Design System Static Verification Guardrails & Zero-CLS Layout Challenger Test Suite.
 *
 * Epistemic Invariants:
 * 1. Zero Unicode Sub-Emoji Invariant: All UI components under `frontend/src/components/` must contain 0 unicode emojis.
 * 2. Prohibited Color Class Elimination: All components must strictly adhere to the Slate neutral base and Emerald/Blue semantic tokens.
 *    Prohibited palettes: pink, purple, fuchsia, violet, indigo, yellow, orange, amber, rose, zinc, neutral, stone, gray, teal, cyan.
 * 3. AdSense Contract & Zero-CLS Layout Bounding Box Invariants:
 *    - `getAdSlotMinHeightClass` format-to-height mapping fidelity.
 *    - Macro dashboard hero 2-column lg:h-[566px] symmetric geometry (ΔH = 0px).
 *    - Core AdSense slots (1000000001 & 1000000002) contract preservation.
 */

import fs from 'fs';
import path from 'path';
import { getAdSlotMinHeightClass } from '@/components/ads/AdSlot';

const COMPONENTS_DIR = path.resolve(__dirname, '../components');
const APP_DIR = path.resolve(__dirname, '../app');
const MACRO_DASHBOARD_FILE = path.join(COMPONENTS_DIR, 'MacroDashboardClient.tsx');
const APT_MODAL_FILE = path.join(COMPONENTS_DIR, 'apartment/ApartmentModal.tsx');

/**
 * Recursively retrieves all non-test TypeScript/React source files within a directory.
 */
function getSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(getSourceFiles(fullPath));
    } else if (
      (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.spec.')
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

describe('Design System Static Verification Guardrails (Challenger Suite)', () => {
  const componentFiles = getSourceFiles(COMPONENTS_DIR);
  const appFiles = getSourceFiles(APP_DIR);

  // Pre-condition: Guarantee that files are actively discovered and scanned (No vacuous truth)
  test('Sanity Pre-condition: Discovers active component and app source files', () => {
    expect(componentFiles.length).toBeGreaterThanOrEqual(40);
    expect(appFiles.length).toBeGreaterThanOrEqual(10);
  });

  // =========================================================================
  // SUITE 1: Zero Unicode Sub-Emoji Invariant
  // =========================================================================
  describe('Suite 1: Unicode Sub-Emoji Elimination Guardrail', () => {
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

    test('1.1 Verifies emoji regex detector sensitivity against positive synthetic controls', () => {
      // Must positively detect standard and sub-emojis
      expect('👑 왕관'.match(emojiRegex)).not.toBeNull();
      expect('🔥 상승'.match(emojiRegex)).not.toBeNull();
      expect('💡 인사이트'.match(emojiRegex)).not.toBeNull();
      expect('🏢 단지'.match(emojiRegex)).not.toBeNull();
      expect('📊 차트'.match(emojiRegex)).not.toBeNull();
      expect('순수 텍스트 라벨'.match(emojiRegex)).toBeNull();
    });

    test('1.2 Scanning frontend/src/components/ and frontend/src/app/ must detect exactly 0 unicode sub-emojis', () => {
      const violations: { file: string; line: number; match: string; snippet: string }[] = [];

      for (const file of [...componentFiles, ...appFiles]) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((lineText, idx) => {
          const match = lineText.match(emojiRegex);
          if (match) {
            violations.push({
              file: path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/'),
              line: idx + 1,
              match: match[0],
              snippet: lineText.trim().slice(0, 80),
            });
          }
        });
      }

      // Assert zero violations
      expect(violations).toEqual([]);
      expect(violations.length).toBe(0);
    });
  });

  // =========================================================================
  // SUITE 2: Prohibited Color Classes (Slate & Emerald/Blue Enforcement)
  // =========================================================================
  describe('Suite 2: Prohibited Color Classes & Non-Standard Palette Guardrail', () => {
    // Prohibited palettes: pink, purple, fuchsia, violet, indigo, yellow, orange, amber, rose, zinc, neutral, stone, gray, teal, cyan, sky, green
    const prohibitedColorRegex =
      /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan|sky|green)(?:-[a-z0-9/\[\]]+)?\b/i;

    test('2.1 Verifies color regex detector sensitivity against positive synthetic controls', () => {
      expect('bg-purple-600'.match(prohibitedColorRegex)).not.toBeNull();
      expect('text-rose-500'.match(prohibitedColorRegex)).not.toBeNull();
      expect('border-zinc-200'.match(prohibitedColorRegex)).not.toBeNull();
      expect('bg-orange-100'.match(prohibitedColorRegex)).not.toBeNull();
      expect('text-amber-600'.match(prohibitedColorRegex)).not.toBeNull();
      expect('bg-teal-500'.match(prohibitedColorRegex)).not.toBeNull();
      expect('text-cyan-400'.match(prohibitedColorRegex)).not.toBeNull();
      expect('bg-sky-600'.match(prohibitedColorRegex)).not.toBeNull();
      expect('text-green-600'.match(prohibitedColorRegex)).not.toBeNull();
      expect('from-indigo-500 to-purple-600'.match(prohibitedColorRegex)).not.toBeNull();

      // Standard allowed tokens must NOT trigger
      expect('bg-slate-900'.match(prohibitedColorRegex)).toBeNull();
      expect('border-slate-200/80'.match(prohibitedColorRegex)).toBeNull();
      expect('text-emerald-600'.match(prohibitedColorRegex)).toBeNull();
      expect('bg-blue-500'.match(prohibitedColorRegex)).toBeNull();
      expect('text-red-600'.match(prohibitedColorRegex)).toBeNull();
    });

    test('2.2 Scanning frontend/src/components/ must detect exactly 0 prohibited color classes', () => {
      const violations: { file: string; line: number; token: string; snippet: string }[] = [];

      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((lineText, idx) => {
          const match = lineText.match(prohibitedColorRegex);
          if (match) {
            violations.push({
              file: path.relative(COMPONENTS_DIR, file).replace(/\\/g, '/'),
              line: idx + 1,
              token: match[0],
              snippet: lineText.trim().slice(0, 80),
            });
          }
        });
      }

      // Assert zero violations
      expect(violations).toEqual([]);
      expect(violations.length).toBe(0);
    });

    test('2.3 Phase 5 Invariant 3: Eliminates prohibited hex color tokens (#ff8f00, #7c3aed, #f9ce3f, #e1306c, #833ab4) in AptCompareModal, InAppBrowserBypass, ApartmentModal & InfraAnalysisSection', () => {
      const prohibitedHexRegex = /#(?:ff8f00|7c3aed|f9ce3f|e1306c|833ab4)\b/i;

      // Verify positive synthetic detection
      expect('hover:bg-[#ff8f00]'.match(prohibitedHexRegex)).not.toBeNull();
      expect('bg-[#7c3aed]'.match(prohibitedHexRegex)).not.toBeNull();
      expect('from-[#f9ce3f] via-[#e1306c] to-[#833ab4]'.match(prohibitedHexRegex)).not.toBeNull();
      expect('hover:bg-emerald-700 bg-slate-800 bg-blue-600'.match(prohibitedHexRegex)).toBeNull();

      const aptCompareFile = path.join(COMPONENTS_DIR, 'consumer/AptCompareModal.tsx');
      const inAppBypassFile = path.join(COMPONENTS_DIR, 'pwa/InAppBrowserBypass.tsx');
      const infraSectionFile = path.join(COMPONENTS_DIR, 'apartment-modal/InfraAnalysisSection.tsx');

      const aptCompareContent = fs.readFileSync(aptCompareFile, 'utf8');
      const inAppBypassContent = fs.readFileSync(inAppBypassFile, 'utf8');
      const aptModalContent = fs.readFileSync(APT_MODAL_FILE, 'utf8');
      const infraSectionContent = fs.readFileSync(infraSectionFile, 'utf8');

      expect(aptCompareContent.match(prohibitedHexRegex)).toBeNull();
      expect(aptCompareContent).toContain('hover:bg-emerald-700');

      expect(inAppBypassContent.match(prohibitedHexRegex)).toBeNull();
      expect(inAppBypassContent).toContain('bg-slate-800');

      expect(aptModalContent.match(prohibitedHexRegex)).toBeNull();
      expect(infraSectionContent.match(prohibitedHexRegex)).toBeNull();
      expect(infraSectionContent).toContain('bg-blue-600');

      // Scan all component files for prohibited hex tokens
      const hexViolations: { file: string; line: number; token: string }[] = [];
      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        content.split('\n').forEach((lineText, idx) => {
          const match = lineText.match(prohibitedHexRegex);
          if (match) {
            hexViolations.push({
              file: path.relative(COMPONENTS_DIR, file).replace(/\\/g, '/'),
              line: idx + 1,
              token: match[0],
            });
          }
        });
      }
      expect(hexViolations).toEqual([]);
    });
  });

  // =========================================================================
  // SUITE 3: AdSense Contract & Zero-CLS Layout Invariants
  // =========================================================================
  describe('Suite 3: AdSense Zero-CLS Bounding Boxes & Layout Invariants', () => {
    test('3.1 AdSlot pre-reserved min-height mapping adheres to DESIGN.md Section 5.1 contracts', () => {
      expect(getAdSlotMinHeightClass('in-feed')).toBe('min-h-[140px] sm:min-h-[160px]');
      expect(getAdSlotMinHeightClass('banner')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('rectangle')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('horizontal-strip')).toBe('min-h-[90px] sm:min-h-[100px]');
      expect(getAdSlotMinHeightClass('auto')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass(undefined)).toBe('min-h-[250px]');
    });

    test('3.2 MacroDashboardClient enforces 566px hero geometry symmetry (lg:h-[566px], ΔH = 0px)', () => {
      expect(fs.existsSync(MACRO_DASHBOARD_FILE)).toBe(true);
      const content = fs.readFileSync(MACRO_DASHBOARD_FILE, 'utf8');

      // Both left and right hero columns must enforce lg:h-[566px]
      const matches = content.match(/lg:h-\[566px\]/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(2);

      // Verify Left column: lg:col-span-6 flex flex-col gap-3.5 lg:h-[566px] ... justify-between box-border
      expect(content).toContain('lg:col-span-6 flex flex-col gap-3.5 lg:h-[566px]');
      expect(content).toContain('justify-between box-border');

      // Verify Right column: lg:col-span-6 flex flex-col gap-6 lg:h-[566px]
      expect(content).toContain('lg:col-span-6 flex flex-col gap-6 lg:h-[566px]');
    });

    test('3.3 Core AdSense slots 1000000001 & 1000000002 contracts are preserved in MacroDashboardClient', () => {
      const content = fs.readFileSync(MACRO_DASHBOARD_FILE, 'utf8');

      // Slot 1000000001 must be configured with in-feed format and bounded wrapper
      expect(content).toContain('slotId="1000000001"');
      expect(content).toContain('format="in-feed"');

      // Slot 1000000002 must be placed in lower feed
      expect(content).toContain('slotId="1000000002"');
    });

    test('3.4 Core AdSense slot 1000000002 contracts are preserved across chapters in ApartmentModal', () => {
      expect(fs.existsSync(APT_MODAL_FILE)).toBe(true);
      const content = fs.readFileSync(APT_MODAL_FILE, 'utf8');

      // Slot 1000000002 in Chapter 02 and Chapter 05
      expect(content).toContain('slotId="1000000002"');
      expect(content).toContain('min-h-[180px] sm:min-h-[220px] md:min-h-[250px]');
      expect(content).toContain('bg-elevated dark:bg-slate-900');
    });

    test('3.5 ViralPaywallGate renders native preview card and eliminates forced lockdown countdown', () => {
      const paywallFile = path.join(COMPONENTS_DIR, 'apartment-modal/ViralPaywallGate.tsx');
      expect(fs.existsSync(paywallFile)).toBe(true);
      const content = fs.readFileSync(paywallFile, 'utf8');

      // Must NOT contain forced multi-share lockdown countdown or crown badge
      expect(content).not.toContain('단 3번의 카카오 공유');
      expect(content).not.toContain('animate-bounce');
      expect(content).not.toContain('공유 진행도');
      expect(content).not.toContain('10초 완료 추천!');

      // Must contain native preview card elements and single direct CTA
      expect(content).toContain('단지 정밀 가치분석 인사이트');
      expect(content).toContain('카카오톡으로 공유하고 리포트 열람');
      expect(content).toContain('초품아·학군');
      expect(content).toContain('적정 밸류');
      expect(content).toContain('대기수요');
    });
  });
});
