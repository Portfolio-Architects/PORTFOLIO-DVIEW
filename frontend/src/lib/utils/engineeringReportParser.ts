export interface EngineeringReportMetadata {
  date: string;
  grade: string;
  branch: string;
  status: string;
}

export interface ParsedEngineeringReport {
  metadata: EngineeringReportMetadata;
  markdownContent: string;
  hasTitleHeader: boolean;
  isContractValid: boolean;
}

function normalizeMirroredLineLinks(line: string): string {
  return line.replace(
    /(`+[^`]*`+)|(\[(?:`[^`]*`|[^\]])*\]\(\s*)(\.\.\/\.\.\/\.\.\/)([^)]*\))/g,
    (fullMatch, codeSpan: string | undefined, prefix: string, _upThree: string, suffix: string) => {
      if (codeSpan !== undefined) {
        return fullMatch;
      }
      return `${prefix}./${suffix}`;
    }
  );
}

/**
 * Parses `DVIEW_PORTFOLIO DVIEW - Engineering Report.md` (or its `src/data/engineering-report.md`
 * mirror) according to the runtime metadata & H1 title stripping contract expected by
 * `getEngineeringReport` and `ReportClient`.
 */
export function parseEngineeringReportMarkdown(rawContent: string): ParsedEngineeringReport {
  const metadata: EngineeringReportMetadata = {
    date: '',
    grade: '',
    branch: '',
    status: '',
  };

  if (!rawContent) {
    return {
      metadata,
      markdownContent: '',
      hasTitleHeader: false,
      isContractValid: false,
    };
  }

  const normalized = rawContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const contentLines: string[] = [];

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
      const rest = fenceMatch[2] ?? '';
      if (!inFence) {
        // CommonMark §4.5: backtick code fence info strings cannot contain backticks
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
        if (part.includes('**Date**:')) {
          metadata.date = part.replace('**Date**:', '').trim();
        } else if (part.includes('**Grade**:')) {
          metadata.grade = part.replace('**Grade**:', '').trim();
        } else if (part.includes('**Branch**:')) {
          metadata.branch = part.replace('**Branch**:', '').trim();
        } else if (part.includes('**Status**:')) {
          metadata.status = part.replace('**Status**:', '').trim();
        }
      }
      metadataCaptured = true;
      continue;
    }

    // Strict level-1 heading (# ...) check so H2-H6 subheadings (## ...) are never stripped or misidentified
    if (!hasTitleHeader && /^#(?!#)\s+.*PORTFOLIO DVIEW/.test(trimmed)) {
      hasTitleHeader = true;
      continue;
    }

    contentLines.push(normalizeMirroredLineLinks(line));
  }

  const markdownContent = contentLines.join('\n').trim();
  const isContractValid =
    hasTitleHeader &&
    /^\d{4}-\d{2}-\d{2}$/.test(metadata.date) &&
    metadata.grade.length > 0 &&
    metadata.branch.length > 0 &&
    metadata.status.length > 0 &&
    markdownContent.length > 0;

  return {
    metadata,
    markdownContent,
    hasTitleHeader,
    isContractValid,
  };
}
