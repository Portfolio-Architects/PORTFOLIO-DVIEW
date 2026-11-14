'use client';

import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { safeHtml2canvas } from '@/lib/utils/html2canvasPatch';
import { logger } from '@/lib/services/logger';

export interface ReportMetadata {
  date: string;
  grade: string;
  branch: string;
  status: string;
}

interface Props {
  metadata: ReportMetadata;
  markdownContent: string;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

const REPO_FILE_EXTENSION_REGEX = /\.(?:md|ts|tsx|js|jsx|mjs|cjs|json|ya?ml|example)$/i;

function safeDecodeHref(href: string): string {
  try {
    return decodeURIComponent(href);
  } catch {
    return href;
  }
}

/**
 * Identifies Markdown link targets that reference repository-internal documentation or source files
 * (e.g. `./DVIEW_DESIGN.md`, `../../../docs/adsense-approval-report.md`, `./frontend/src/...`)
 * rather than navigable Next.js HTTP routes, preventing broken 404 anchors in the rendered DOM.
 */
export function isRepoWorkspaceFileHref(href?: string): boolean {
  if (!href) return true;
  const trimmed = href.trim();
  if (!trimmed) return true;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#')
  ) {
    return false;
  }

  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }

  const withoutHashOrQuery = trimmed.split('#')[0].split('?')[0];
  if (REPO_FILE_EXTENSION_REGEX.test(withoutHashOrQuery)) {
    return true;
  }

  // Valid Next.js internal routes always start with `/`
  return !trimmed.startsWith('/');
}

export const ENGINEERING_REPORT_MARKDOWN_COMPONENTS: Components = {
  a: ({ href, children }) => {
    const rawHref = typeof href === 'string' ? href.trim() : '';

    if (isRepoWorkspaceFileHref(rawHref)) {
      const normalizedLabel = safeDecodeHref(rawHref).replace(/^(?:\.\.\/)+/, './');
      return (
        <span
          data-repo-doc-ref={normalizedLabel}
          title={normalizedLabel ? `저장소 문서/코드 참조: ${normalizedLabel}` : undefined}
          className="inline-flex items-center rounded-md bg-[#f2f4f6] px-1.5 py-0.5 text-[0.9em] font-semibold text-[#3182f6] dark:bg-[#202027] dark:text-blue-400"
        >
          {children}
        </span>
      );
    }

    if (rawHref.startsWith('#')) {
      return (
        <a href={rawHref} className="text-blue-600 hover:underline dark:text-blue-400">
          {children}
        </a>
      );
    }

    if (rawHref.startsWith('/')) {
      return (
        <Link href={rawHref} prefetch={false} className="text-blue-600 hover:underline dark:text-blue-400">
          {children}
        </Link>
      );
    }

    return (
      <a
        href={rawHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        {children}
      </a>
    );
  },
};

const EngineeringReportClient = React.memo(function EngineeringReportClient({ markdownContent, contentRef }: Props) {
  const [, setIsExporting] = useState(false);
  const [, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleExportPDF = async () => {
    if (!contentRef?.current) return;
    try {
      setIsExporting(true);
      const canvas = await safeHtml2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('DVIEW_Engineering_Report.pdf');
    } catch (err) {
      logger.error('EngineeringReportClient.handleExportPDF', 'PDF Export failed', undefined, err);
      alert('PDF 변환에 실패했습니다.');
    } finally {
      if (mountedRef.current) {
        setIsExporting(false);
      }
    }
  };

  const handleCopyMD = async () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    try {
      await navigator.clipboard.writeText(markdownContent);
      if (!mountedRef.current) return;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setCopied(false);
          copyTimeoutRef.current = null;
        }
      }, 2000);
    } catch (err) {
      logger.error('EngineeringReportClient.handleCopyMD', 'Copy failed', undefined, err);
      alert('복사에 실패했습니다.');
    }
  };

  void handleExportPDF;
  void handleCopyMD;

  return (
    <div className="w-full relative flex flex-col min-h-screen">
      <main className="w-full max-w-[1400px] mx-auto pb-20">
        <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#f0f0f0] p-8 md:p-12 overflow-hidden" ref={contentRef}>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#f2f4f6] pb-6 mb-8 gap-4">
            <h2 className="text-[18px] md:text-[22px] font-black text-[#191f28] tracking-tight">
              SECTION 1: ENGINEERING REPORT
            </h2>
            <div className="w-fit px-3 py-1 bg-[#e8f5e9] text-[#2e7d32] text-[10px] font-black tracking-wider rounded-full shrink-0">
              CONFIDENTIAL
            </div>
          </div>

          <article className="prose prose-sm sm:prose-base max-w-none tabular-nums prose-headings:font-black prose-h1:text-[24px] prose-h2:text-[20px] prose-h3:text-[18px] prose-h4:text-[16px] prose-p:text-[#4e5968] prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-li:text-[#4e5968] prose-strong:text-[#191f28] prose-img:rounded-xl">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={ENGINEERING_REPORT_MARKDOWN_COMPONENTS}
            >
              {markdownContent}
            </ReactMarkdown>
          </article>

        </div>
      </main>
    </div>
  );
});

EngineeringReportClient.displayName = 'EngineeringReportClient';
export default EngineeringReportClient;
