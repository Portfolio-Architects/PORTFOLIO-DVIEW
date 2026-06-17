'use client';

import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { ArrowLeft, Download, Copy, Database, Check } from 'lucide-react';
import { safeHtml2canvas } from '@/lib/utils/html2canvasPatch';
import jsPDF from 'jspdf';

interface ReportMetadata {
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

const EngineeringReportClient = React.memo(function EngineeringReportClient({ metadata, markdownContent, contentRef }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
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
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('DVIEW_Engineering_Report.pdf');
    } catch (err) {
      console.error('PDF Export failed', err);
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
      console.error('Copy failed', err);
      alert('복사에 실패했습니다.');
    }
  };

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

          <article className="prose prose-sm sm:prose-base max-w-none prose-headings:font-black prose-h1:text-[24px] prose-h2:text-[20px] prose-h3:text-[18px] prose-h4:text-[16px] prose-p:text-[#4e5968] prose-p:leading-relaxed prose-a:text-[#008262] prose-a:no-underline hover:prose-a:underline prose-li:text-[#4e5968] prose-strong:text-[#191f28] prose-img:rounded-xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
