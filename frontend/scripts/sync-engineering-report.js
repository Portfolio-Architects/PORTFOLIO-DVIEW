const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const ReportContractSchema = z.object({
  hasTitleHeader: z.literal(true, {
    error: '상단 대제목(# ... PORTFOLIO DVIEW ...) 규격이 누락되었습니다.',
  }),
  metadata: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date 메타데이터는 YYYY-MM-DD 형식이어야 합니다.'),
    grade: z.string().min(1, 'Grade 메타데이터가 비어 있습니다.'),
    branch: z.string().min(1, 'Branch 메타데이터가 비어 있습니다.'),
    status: z.string().min(1, 'Status 메타데이터가 비어 있습니다.'),
  }),
  markdownContentLength: z.number().min(200, '엔지니어링 리포트 본문 길이가 비정상적으로 짧습니다.'),
});

function normalizeReportText(raw) {
  return String(raw || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function rebaseLineLinks(line, relPrefix) {
  if (!relPrefix) return line;
  return line.replace(
    /(`+[^`]*`+)|(\[(?:`[^`]*`|[^\]])*\]\(\s*)(\.\/|(?![a-zA-Z][a-zA-Z0-9+.-]*:|#|\/|\.\.?\/))([^)]*\))/g,
    (fullMatch, codeSpan, linkOpen, _dotSlash, linkRest) => {
      if (codeSpan !== undefined) {
        return fullMatch;
      }
      if (!linkRest.trim()) {
        return fullMatch;
      }
      return `${linkOpen}${relPrefix}/${linkRest}`;
    }
  );
}

function rebaseReportLinksForTarget(normalizedContent, sourcePath, targetPath) {
  const sourceDir = path.dirname(path.resolve(sourcePath));
  const targetDir = path.dirname(path.resolve(targetPath));
  const relPrefix = path.relative(targetDir, sourceDir).split(path.sep).join('/');
  if (!relPrefix) {
    return normalizedContent;
  }

  const lines = normalizedContent.split('\n');
  const out = [];
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const rest = fenceMatch[2] || '';
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
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    out.push(rebaseLineLinks(line, relPrefix));
  }

  return out.join('\n');
}

function parseReportContract(rawContent) {
  const normalized = normalizeReportText(rawContent);
  const lines = normalized.split('\n');
  const contentLines = [];
  const metadata = { date: '', grade: '', branch: '', status: '' };

  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  let hasTitleHeader = false;
  let metadataCaptured = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const rest = fenceMatch[2] || '';
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
      contentLines.push(line);
      continue;
    }

    if (inFence) {
      contentLines.push(line);
      continue;
    }

    if (!metadataCaptured && /^>\s*\*\*Date\*\*:/.test(trimmed)) {
      const parts = trimmed.replace(/^>\s*/, '').split(/\s*\|\s*/);
      for (const part of parts) {
        if (part.includes('**Date**:')) metadata.date = part.replace('**Date**:', '').trim();
        else if (part.includes('**Grade**:')) metadata.grade = part.replace('**Grade**:', '').trim();
        else if (part.includes('**Branch**:')) metadata.branch = part.replace('**Branch**:', '').trim();
        else if (part.includes('**Status**:')) metadata.status = part.replace('**Status**:', '').trim();
      }
      metadataCaptured = true;
      continue;
    }

    if (!hasTitleHeader && /^#(?!#)\s+.*PORTFOLIO DVIEW/.test(trimmed)) {
      hasTitleHeader = true;
      continue;
    }

    contentLines.push(line);
  }

  const markdownContent = contentLines.join('\n').trim();
  return {
    normalized,
    hasTitleHeader,
    metadata,
    markdownContent,
  };
}

function validateEngineeringReportContract(rawContent, label = 'Engineering Report') {
  const parsed = parseReportContract(rawContent);
  const result = ReportContractSchema.safeParse({
    hasTitleHeader: parsed.hasTitleHeader,
    metadata: parsed.metadata,
    markdownContentLength: parsed.markdownContent.length,
  });
  if (!result.success) {
    const issues = result.error.issues.map((iss) => iss.message).join('; ');
    throw new Error(`[Report Sync] ${label} 런타임 파싱 계약 위반: ${issues}`);
  }
  return parsed;
}

function syncEngineeringReport(options = {}) {
  const defaultSource = path.resolve(__dirname, '../../DVIEW_PORTFOLIO DVIEW - Engineering Report.md');
  const defaultTarget = path.resolve(__dirname, '../src/data/engineering-report.md');

  const sourcePath = options.sourcePath || defaultSource;
  const targetPath = options.targetPath || defaultTarget;
  const checkOnly = Boolean(options.checkOnly);

  if (!fs.existsSync(sourcePath)) {
    // Isolated frontend container build where parent repo root is unmounted
    if (!fs.existsSync(targetPath)) {
      throw new Error(
        `[Report Sync] 원본(${sourcePath})과 폴백 사본(${targetPath})이 모두 존재하지 않습니다.`
      );
    }
    const fallbackRaw = fs.readFileSync(targetPath, 'utf8');
    const parsedFallback = validateEngineeringReportContract(fallbackRaw, targetPath);
    return {
      status: 'fallback-verified',
      updated: false,
      sourcePath,
      targetPath,
      metadata: parsedFallback.metadata,
    };
  }

  const sourceRaw = fs.readFileSync(sourcePath, 'utf8');
  const parsedSource = validateEngineeringReportContract(sourceRaw, sourcePath);
  const expectedTargetContent = rebaseReportLinksForTarget(
    parsedSource.normalized,
    sourcePath,
    targetPath
  );

  const targetExists = fs.existsSync(targetPath);
  const targetNormalized = targetExists ? normalizeReportText(fs.readFileSync(targetPath, 'utf8')) : null;

  if (targetNormalized === expectedTargetContent) {
    return {
      status: 'in-sync',
      updated: false,
      sourcePath,
      targetPath,
      metadata: parsedSource.metadata,
    };
  }

  if (checkOnly) {
    throw new Error(
      `[Report Sync] 이중 소스 드리프트 감지: 루트 SSOT(${sourcePath})와 프론트엔드 폴백(${targetPath})의 내용이 일치하지 않습니다. 'npm run sync-report'를 실행하세요.`
    );
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, expectedTargetContent, 'utf8');

  return {
    status: 'synced',
    updated: true,
    sourcePath,
    targetPath,
    metadata: parsedSource.metadata,
  };
}

if (require.main === module) {
  try {
    const checkOnly = process.argv.includes('--check');
    const result = syncEngineeringReport({ checkOnly });
    console.log(
      `[Report Sync] status=${result.status} date=${result.metadata.date} grade=${result.metadata.grade} branch=${result.metadata.branch}`
    );
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
}

module.exports = {
  normalizeReportText,
  rebaseReportLinksForTarget,
  parseReportContract,
  validateEngineeringReportContract,
  syncEngineeringReport,
};
