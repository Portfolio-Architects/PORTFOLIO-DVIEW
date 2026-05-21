'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PageHeroHeader from '@/components/PageHeroHeader';
import { getEngineeringReport } from '@/app/actions/getEngineeringReport';
import EngineeringReportClient from './EngineeringReportClient';

export default function ReportClient() {
  const [mounted, setMounted] = useState(false);
  const [engReportData, setEngReportData] = useState<{metadata: any, markdownContent: string} | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
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
      setIsExporting(false);
    }
  };

  const handleCopyMD = async () => {
    if (!engReportData?.markdownContent) return;
    try {
      await navigator.clipboard.writeText(engReportData.markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      alert('복사에 실패했습니다.');
    }
  };

  useEffect(() => {
    setMounted(true);
    getEngineeringReport().then(setEngReportData);
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full bg-body pb-28 md:pb-12">
      {/* Standardized Hero Header */}
      <PageHeroHeader 
        title="리포트"
        subtitleStrong="엔지니어링 리포트"
        subtitleLight="포트폴리오 패치 노트"
        rightSideContent={
          engReportData ? (
            <div className="flex flex-col items-end gap-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                {engReportData.metadata?.grade && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e8eb] rounded-full text-[11px] font-bold text-[#3182f6] shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3182f6]" />
                    GRADE {engReportData.metadata.grade}
                  </div>
                )}
                {engReportData.metadata?.branch && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e8eb] rounded-full text-[11px] font-bold text-[#04a25c] shadow-sm">
                    {engReportData.metadata.branch.toUpperCase()}
                  </div>
                )}
                {engReportData.metadata?.status && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f2f4f6] text-[#4e5968] rounded-full text-[11px] font-bold">
                    {engReportData.metadata.status.toUpperCase()}
                  </div>
                )}
                {engReportData.metadata?.date && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f2f4f6] text-[#4e5968] rounded-full text-[11px] font-bold">
                    {engReportData.metadata.date}
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e8eb] text-[#333] rounded-xl text-[12px] font-bold shadow-sm hover:bg-[#f9fafb] transition-colors disabled:opacity-50"
                >
                  <Download size={14} />
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </button>
                <button 
                  onClick={handleCopyMD}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e8eb] text-[#333] rounded-xl text-[12px] font-bold shadow-sm hover:bg-[#f9fafb] transition-colors"
                >
                  {copied ? <Check size={14} className="text-[#04a25c]" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy MD'}
                </button>
              </div>
            </div>
          ) : null
        }
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-6">
        {engReportData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
            <EngineeringReportClient 
              metadata={engReportData.metadata} 
              markdownContent={engReportData.markdownContent} 
              contentRef={reportRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}
