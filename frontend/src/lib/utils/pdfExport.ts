import { safeHtml2canvas } from './html2canvasPatch';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// Zod schemas for export parameters validation
export const PdfExportParamsSchema = z.object({
  elementId: z.string().min(1, 'elementId must be a non-empty string'),
  filename: z.string()
    .min(1, 'filename must be a non-empty string')
    .regex(/\.pdf$/i, 'filename must end with .pdf extension')
    .catch('DVIEW_Report.pdf'),
});

export async function exportToPDF(elementId: string, filename: string = 'DVIEW_Report.pdf') {
  // 1. Validate parameters using Zod schema
  const validation = PdfExportParamsSchema.safeParse({ elementId, filename });
  if (!validation.success) {
    logger.warn('pdfExport.exportToPDF', 'Invalid parameters provided for PDF export', {
      error: String(validation.error),
      elementId,
      filename
    });
    return false;
  }

  const validated = validation.data;
  
  const jsPDF = (await import('jspdf')).default;
  const element = document.getElementById(validated.elementId);
  if (!element) {
    logger.error('pdfExport.exportToPDF', 'Element not found in DOM', { elementId: validated.elementId });
    return false;
  }

  try {
    // 1. html2canvas로 요소 캡처
    const canvas = await safeHtml2canvas(element, {
      scale: 2, // 고해상도 캡처
      useCORS: true, // 외부 이미지(Firebase Storage 등) 허용
      logging: false,
      backgroundColor: '#f8fafc' // D-VIEW bg-body 색상 (투명 배경 방지)
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // 2. jsPDF 초기화 (A4 세로 기준)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 3. A4 크기에 맞게 이미지 비율 조정
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;
    
    // 이미지를 A4 너비에 맞춤
    const printWidth = pdfWidth;
    const printHeight = printWidth / imgRatio;

    // 캡처한 이미지의 높이가 A4 한 장의 높이보다 크다면 여러 장으로 분할
    let heightLeft = printHeight;
    let position = 0;

    // 첫 페이지 렌더링
    pdf.addImage(imgData, 'JPEG', 0, position, printWidth, printHeight);
    heightLeft -= pdfHeight;

    // 남은 내용이 있다면 새 페이지 추가하여 렌더링
    while (heightLeft > 0) {
      position = heightLeft - printHeight; // 다음 페이지에서 그릴 시작 y 좌표 (음수 값으로 밀어올림)
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, printWidth, printHeight);
      heightLeft -= pdfHeight;
    }

    // 4. PDF 저장
    pdf.save(validated.filename);
    
    logger.info('pdfExport.exportToPDF', 'PDF exported successfully', {
      elementId: validated.elementId,
      filename: validated.filename
    });
    return true;
  } catch (error: unknown) {
    logger.error('pdfExport.exportToPDF', 'Error generating PDF', {
      elementId: validated.elementId,
      filename: validated.filename,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
