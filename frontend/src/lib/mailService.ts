import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * 이메일을 발송하는 공통 서비스입니다.
 * SMTP 환경변수(SMTP_HOST, SMTP_USER, SMTP_PASS)가 존재하면 실제 메일을 전송하고,
 * 존재하지 않으면 public/data/mock-emails.json 파일에 기록하여 로컬 개발을 테스트할 수 있도록 지원합니다.
 */
export async function sendMail({ to, subject, html }: SendMailParams): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || '587';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // 1. SMTP 설정이 유효한 경우 실제 발송 시도
  if (smtpHost && smtpUser && smtpPass) {
    try {
      console.log(`[SMTP-INIT] Mail transport initialized. Host: ${smtpHost}, User: ${smtpUser}`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === '465', // 465 포트는 SSL이 적용된 secure 전송 사용
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"D-VIEW 데이터 랩" <${smtpUser}>`,
        to,
        subject,
        html,
      });

      console.log(`[SMTP-SUCCESS] Email sent successfully. MessageID: ${info.messageId} to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ SMTP 메일 발송 실패 (Mock으로 전환합니다):', error);
    }
  }

  // 2. SMTP 설정이 없거나 에러 발생 시 로컬 파일에 Mocking 저장
  try {
    const dataDir = path.resolve(process.cwd(), 'public/data');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const mockEmailPath = path.join(dataDir, 'mock-emails.json');
    let mockEmails: Array<{
      id: string;
      to: string;
      subject: string;
      html: string;
      sentAt: string;
    }> = [];

    // 기존 Mock 메일 로그 로드
    if (fs.existsSync(mockEmailPath)) {
      try {
        const fileContent = fs.readFileSync(mockEmailPath, 'utf-8');
        mockEmails = JSON.parse(fileContent);
      } catch {
        mockEmails = [];
      }
    }

    // 신규 메일 로그 추가
    const newMockMail = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      to,
      subject,
      html,
      sentAt: new Date().toISOString(),
    };

    mockEmails.unshift(newMockMail);
    
    // 파일 크기 과대 방지를 위해 최근 30개만 보관
    if (mockEmails.length > 30) {
      mockEmails = mockEmails.slice(0, 30);
    }

    fs.writeFileSync(mockEmailPath, JSON.stringify(mockEmails, null, 2), 'utf-8');
    console.log(`[MOCK-SUCCESS] Email logged to mock-emails.json. Subject: "${subject}" to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Mock 메일 로그 기록 실패:', error);
    return false;
  }
}
