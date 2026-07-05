'use server';

import fs from 'fs';
import path from 'path';

import { logger } from '@/lib/services/logger';

export async function getEngineeringReport() {
  let markdownContent = '';
  const reportMetadata = { date: '', grade: '', branch: '', status: '' };
  
  try {
    let filePath = path.join(process.cwd(), '..', 'PORTFOLIO DVIEW - Engineering Report.md');
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'PORTFOLIO DVIEW - Engineering Report.md');
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'src', 'data', 'engineering-report.md');
    }
    const rawContent = fs.readFileSync(filePath, 'utf8');

    const lines = rawContent.split('\n');
    const contentLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('> **Date**:')) {
        const parts = line.replace('> ', '').split(' | ');
        parts.forEach(part => {
          if (part.includes('**Date**:')) reportMetadata.date = part.replace('**Date**:', '').trim();
          if (part.includes('**Grade**:')) reportMetadata.grade = part.replace('**Grade**:', '').trim();
          if (part.includes('**Branch**:')) reportMetadata.branch = part.replace('**Branch**:', '').trim();
          if (part.includes('**Status**:')) reportMetadata.status = part.replace('**Status**:', '').trim();
        });
      } else if (line.trim().startsWith('# 📋 PORTFOLIO DVIEW')) {
        continue;
      } else {
        contentLines.push(line);
      }
    }
    markdownContent = contentLines.join('\n').trim();

  } catch (error) {
    markdownContent = '# 리포트를 불러올 수 없습니다.\n파일 경로를 확인해주세요.';
    logger.error('getEngineeringReportAction', 'Error reading engineering report', {}, error as Error);
  }

  return { metadata: reportMetadata, markdownContent };
}

