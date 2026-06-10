const fs = require('fs');
const path = require('path');

const RAW_JSON_PATH = path.resolve(__dirname, '../scratch/ui-ux-audit-results.json');
const OUTPUT_REPORT_PATH = path.resolve(__dirname, '../scratch/ui_ux_improvement_report.md');

if (!fs.existsSync(RAW_JSON_PATH)) {
  console.error(`❌ Raw audit JSON not found at: ${RAW_JSON_PATH}`);
  process.exit(1);
}

try {
  const rawData = JSON.parse(fs.readFileSync(RAW_JSON_PATH, 'utf8'));
  
  // 1. Calculate Badges & Summaries
  const vitals = rawData.performance.vitals || { lcp: 0, cls: 0 };
  const nav = rawData.performance.navigation || { dns: 0, tcp: 0, ttfb: 0, domLoad: 0, pageLoad: 0 };
  
  const lcp = vitals.lcp ? (vitals.lcp / 1000).toFixed(2) : '0';
  const cls = vitals.cls ? vitals.cls.toFixed(4) : '0';
  const ttfb = nav.ttfb ? `${nav.ttfb.toFixed(0)}ms` : 'N/A';
  const pageLoad = nav.pageLoad ? `${(nav.pageLoad / 1000).toFixed(2)}s` : 'N/A';
  
  // Performance Rating
  let perfStatus = '🟢 우수';
  if (parseFloat(lcp) > 2.5 || parseFloat(cls) > 0.1 || nav.pageLoad > 3000) {
    perfStatus = '🟡 개선 권장';
  }
  if (parseFloat(lcp) > 4.0 || parseFloat(cls) > 0.25 || nav.pageLoad > 5000) {
    perfStatus = '🔴 불량 (최적화 시급)';
  }

  // Accessibility Summaries
  const a11yViolations = rawData.accessibility || [];
  const a11yCount = a11yViolations.length;
  let a11yStatus = '🟢 우수';
  if (a11yCount > 0) a11yStatus = `🟡 개선 권장 (${a11yCount}건 위반)`;
  if (a11yViolations.some(v => v.impact === 'critical' || v.impact === 'serious')) {
    a11yStatus = `🔴 우려 (심각한 위반 포함)`;
  }

  // Layout Summaries
  const overflows = rawData.layout.overflows || [];
  const layoutStatus = overflows.length === 0 ? '🟢 우수' : `🟡 레이아웃 이탈 감지 (${overflows.length}건)`;

  // Console Summaries
  const consoleErrors = rawData.pageErrors || [];
  const consoleWarns = (rawData.consoleLogs || []).filter(l => l.type === 'error');
  const consoleLogsCount = consoleErrors.length + consoleWarns.length;
  const consoleStatus = consoleLogsCount === 0 ? '🟢 에러 없음' : `🔴 오류 감지 (${consoleLogsCount}건)`;

  // 2. Generate Markdown Content
  let md = `# 📊 D-VIEW UI/UX 자동 자기개선 리포트\n\n`;
  md += `> **진단 일시**: ${new Date(rawData.timestamp).toLocaleString('ko-KR')}\n`;
  md += `> **검사 대상 URL**: [\`${rawData.url}\`](${rawData.url})\n\n`;
  
  md += `## 🚀 품질 지표 요약\n\n`;
  md += `| 카테고리 | 상태 | 주요 내역 |\n`;
  md += `| :--- | :---: | :--- |\n`;
  md += `| **⚡ 웹 성능 (Web Vitals)** | ${perfStatus} | LCP: ${lcp}s, CLS: ${cls}, 로드 속도: ${pageLoad} |\n`;
  md += `| **♿ 웹 접근성 (Accessibility)** | ${a11yStatus} | 총 ${a11yCount}건의 웹 가이드라인 위반 사항 검출 |\n`;
  md += `| **📐 레이아웃 정렬 (Layout)** | ${layoutStatus} | 모바일 뷰포트 가로 오버플로우 요소 ${overflows.length}개 |\n`;
  md += `| **🚨 콘솔 예외 (Console)** | ${consoleStatus} | 비정상적 스크립트 예외 및 에러 ${consoleLogsCount}건 |\n\n`;

  md += `---\n\n`;

  // Section 1: Performance
  md += `## 1. ⚡ 웹 성능 및 사용자 경험 (Core Web Vitals)\n\n`;
  md += `> [!NOTE]\n`;
  md += `> 구글 검색 엔진(SEO)과 사용자 전환율은 페이지 로딩 속도와 레이아웃 흔들림(CLS)에 밀접한 영향을 받습니다.\n\n`;
  md += `- **LCP (Largest Contentful Paint)**: \`${lcp}초\` (기준: 2.5초 이내 우수)\n`;
  md += `- **CLS (Cumulative Layout Shift)**: \`${cls}\` (기준: 0.1 이내 우수, 레이아웃 흔들림 방지)\n`;
  md += `- **TTFB (Time to First Byte)**: \`${ttfb}\` (서버 반응성)\n`;
  md += `- **최종 페이지 완전 로드**: \`${pageLoad}\` (기준: 3초 이내 권장)\n\n`;

  // Section 2: Accessibility
  md += `## 2. ♿ 웹 접근성 가이드라인 준수도 (Axe-Core Audit)\n\n`;
  if (a11yCount === 0) {
    md += `🎉 **축하합니다! 웹 접근성 가이드라인을 위반하는 주요 사안이 발견되지 않았습니다.**\n\n`;
  } else {
    md += `스크린 리더 사용자나 키보드 조작 사용자를 위해 아래 위반 사항을 개선해야 합니다:\n\n`;
    a11yViolations.forEach((v, idx) => {
      const impactEmoji = v.impact === 'critical' ? '🔴 [치명적]' : (v.impact === 'serious' ? '🟠 [심각]' : '🟡 [보통]');
      md += `### ${idx + 1}. ${impactEmoji} ${v.help} (\`${v.id}\`)\n`;
      md += `- **설명**: ${v.description}\n`;
      md += `- **참고 가이드**: [Axe Help Link](${v.helpUrl})\n`;
      md += `- **영향을 받는 요소**:\n`;
      v.nodes.forEach(n => {
        md += `  - 대상 셀렉터: \`${n.target}\`\n`;
        md += `    \`\`\`html\n    ${n.html}\n    \`\`\`\n`;
      });
      md += `\n`;
    });
  }

  // Section 3: Layout Overflow
  md += `## 3. 📐 레이아웃 오버플로우 진단 (Responsive Integrity)\n\n`;
  if (overflows.length === 0) {
    md += `🎉 **모바일 뷰포트에서 가로 스크롤을 유발하거나 영역을 벗어나는 엘리먼트가 없습니다.**\n\n`;
  } else {
    md += `> [!WARNING]\n`;
    md += `> 아래 요소들은 모바일 화면 너비를 초과하여 레이아웃을 깨뜨리거나 불필요한 가로 스크롤을 유발할 위험이 있습니다.\n\n`;
    md += `| 태그 | 셀렉터 경로 | 요소 너비 | 이탈 크기 (뷰포트 너비: ${overflows[0].viewportWidth}px) |\n`;
    md += `| :---: | :--- | :---: | :---: |\n`;
    overflows.forEach(o => {
      md += `| \`${o.tag}\` | \`${o.selector}\` | ${o.width}px | ${o.right}px (${o.right - o.viewportWidth}px 초과) |\n`;
    });
    md += `\n`;
  }

  // Section 4: Console Log Errors
  md += `## 4. 🚨 브라우저 콘솔 오류 및 런타임 예외\n\n`;
  if (consoleLogsCount === 0) {
    md += `🎉 **테스트 실행 중 브라우저 콘솔에 잡힌 오류나 예외가 없습니다.**\n\n`;
  } else {
    if (consoleErrors.length > 0) {
      md += `### 🔴 런타임 예외 (Runtime Page Errors):\n`;
      consoleErrors.forEach((e, idx) => {
        md += `${idx + 1}. **오류 메시지**: ${e.message}\n`;
        if (e.stack) {
          md += `   \`\`\`\n   ${e.stack.split('\n').slice(0, 3).join('\n   ')}\n   \`\`\`\n`;
        }
      });
      md += `\n`;
    }
    const filteredConsoleLogs = (rawData.consoleLogs || []).filter(l => l.type === 'error' || l.type === 'warning');
    if (filteredConsoleLogs.length > 0) {
      md += `### 🟡 경고 및 에러 로그 (Console Warns/Errors):\n`;
      filteredConsoleLogs.forEach((l, idx) => {
        const typeBadge = l.type === 'error' ? '🔴 에러' : '🟡 경고';
        md += `${idx + 1}. **${typeBadge}**: ${l.text} *(위치: ${l.location.url || '알수없음'}:${l.location.lineNumber || 0})*\n`;
      });
      md += `\n`;
    }
  }

  // Write file
  const outputDir = path.dirname(OUTPUT_REPORT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_REPORT_PATH, md, 'utf-8');
  console.log(`✅ UI/UX Markdown report generated successfully at:\n   ${OUTPUT_REPORT_PATH}`);

} catch (err) {
  console.error('❌ Failed to generate UI/UX markdown report:', err);
  process.exit(1);
}
