import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { patchClonedDocumentForHtml2canvas } from './html2canvasPatch';

export async function exportToPDF(elementId: string, filename: string = 'DVIEW_Report.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  try {
    // 1. html2canvas로 요소 캡처
    const canvas = await html2canvas(element, {
      scale: 2, // 고해상도 캡처
      useCORS: true, // 외부 이미지(Firebase Storage 등) 허용
      logging: false,
      backgroundColor: '#f8fafc', // D-VIEW bg-body 색상 (투명 배경 방지)
      onclone: (clonedDoc) => {
        patchClonedDocumentForHtml2canvas(clonedDoc);
      }
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
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
