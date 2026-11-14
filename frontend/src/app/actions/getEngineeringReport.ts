'use server';

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { logger } from '@/lib/services/logger';
import {
  parseEngineeringReportMarkdown,
  type ParsedEngineeringReport,
} from '@/lib/utils/engineeringReportParser';

export async function getEngineeringReport() {
  let markdownContent = '';
  let reportMetadata = { date: '', grade: '', branch: '', status: '' };

  try {
    const bundledFallbackPath = join(process.cwd(), 'src', 'data', 'engineering-report.md');
    const priorityCandidates = [
      join(process.cwd(), '..', 'DVIEW_PORTFOLIO DVIEW - Engineering Report.md'),
      join(process.cwd(), '..', 'PORTFOLIO DVIEW - Engineering Report.md'),
      join(process.cwd(), 'DVIEW_PORTFOLIO DVIEW - Engineering Report.md'),
      join(process.cwd(), 'PORTFOLIO DVIEW - Engineering Report.md'),
      join(process.cwd(), 'frontend', 'src', 'data', 'engineering-report.md'),
    ];

    let selectedParsed: ParsedEngineeringReport | null = null;

    for (const candidatePath of priorityCandidates) {
      if (!existsSync(candidatePath)) {
        continue;
      }
      const candidateRaw = readFileSync(candidatePath, 'utf8');
      const candidateParsed = parseEngineeringReportMarkdown(candidateRaw);
      if (candidateParsed.isContractValid) {
        selectedParsed = candidateParsed;
        break;
      }
      logger.warn(
        'getEngineeringReportAction',
        'Skipping engineering report candidate with invalid metadata/title contract',
        { candidatePath }
      );
    }

    if (!selectedParsed) {
      const fallbackRaw = readFileSync(bundledFallbackPath, 'utf8');
      selectedParsed = parseEngineeringReportMarkdown(fallbackRaw);
    }

    reportMetadata = selectedParsed.metadata;
    markdownContent = selectedParsed.markdownContent;
  } catch (error) {
    markdownContent = '# 리포트를 불러올 수 없습니다.\n파일 경로를 확인해주세요.';
    logger.error('getEngineeringReportAction', 'Error reading engineering report', {}, error as Error);
  }

  return { metadata: reportMetadata, markdownContent };
}
