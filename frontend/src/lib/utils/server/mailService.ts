import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// Zod schemas for validation
export const SendMailParamsSchema = z.object({
  to: z.string().email('Invalid recipient email address'),
  subject: z.string().min(1, 'Subject cannot be empty'),
  html: z.string().min(1, 'HTML body cannot be empty'),
});
export type SendMailParams = z.infer<typeof SendMailParamsSchema>;

export const SmtpConfigSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP_HOST is empty'),
  smtpPort: z.union([z.string(), z.number()]).transform(val => parseInt(String(val), 10) || 587),
  smtpUser: z.string().min(1, 'SMTP_USER is empty'),
  smtpPass: z.string().min(1, 'SMTP_PASS is empty'),
});
export type SmtpConfig = z.infer<typeof SmtpConfigSchema>;

export const MockMailRecordSchema = z.object({
  id: z.string(),
  to: z.string().email('Invalid recipient email address in mock log'),
  subject: z.string(),
  html: z.string(),
  sentAt: z.string(),
});
export type MockMailRecord = z.infer<typeof MockMailRecordSchema>;

/**
 * 이메일을 발송하는 공통 서비스입니다.
 * SMTP 환경변수(SMTP_HOST, SMTP_USER, SMTP_PASS)가 존재하고 올바르면 실제 메일을 전송하고,
 * 그렇지 않으면 public/data/mock-emails.json 파일에 기록하여 로컬 개발을 테스트할 수 있도록 지원합니다.
 */
export async function sendMail({ to, subject, html }: SendMailParams): Promise<boolean> {
  // 1. Parameter Validation
  const paramValidation = SendMailParamsSchema.safeParse({ to, subject, html });
  if (!paramValidation.success) {
    logger.error('mailService.sendMail', 'Invalid sendMail parameters', { error: String(paramValidation.error) });
    return false;
  }
  const validatedParams = paramValidation.data;

  // 2. SMTP Config Validation & Delivery
  const smtpConfigValidation = SmtpConfigSchema.safeParse({
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
  });

  if (smtpConfigValidation.success) {
    const config = smtpConfigValidation.data;
    try {
      logger.info('mailService.sendMail', 'Mail transport initialized', { host: config.smtpHost, user: config.smtpUser });
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465, // 465 포트는 SSL이 적용된 secure 전송 사용
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"D-VIEW 데이터 랩" <${config.smtpUser}>`,
        to: validatedParams.to,
        subject: validatedParams.subject,
        html: validatedParams.html,
      });

      logger.info('mailService.sendMail', 'Email sent successfully via SMTP', { messageId: info.messageId, to: validatedParams.to });
      return true;
    } catch (error) {
      logger.error('mailService.sendMail', 'SMTP mail delivery failed, falling back to mock logging', {}, error);
    }
  } else {
    // Only warn if SMTP env variables are partially provided but incomplete/invalid
    if (process.env.SMTP_HOST || process.env.SMTP_USER || process.env.SMTP_PASS) {
      logger.warn('mailService.sendMail', 'SMTP configuration variables are invalid', { error: String(smtpConfigValidation.error) });
    }
  }

  // 3. Fallback: Log email to local mock file (mock-emails.json)
  try {
    const dataDir = path.resolve(process.cwd(), 'public/data');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const mockEmailPath = path.join(dataDir, 'mock-emails.json');
    let mockEmails: MockMailRecord[] = [];

    // 기존 Mock 메일 로그 로드 및 Zod 검증 적용
    if (fs.existsSync(mockEmailPath)) {
      try {
        const fileContent = fs.readFileSync(mockEmailPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed)) {
          mockEmails = parsed.filter((item): item is MockMailRecord => {
            const validation = MockMailRecordSchema.safeParse(item);
            if (!validation.success) {
              logger.warn('mailService.sendMail', 'Filtering out invalid mock email record', { error: String(validation.error), record: JSON.stringify(item) });
            }
            return validation.success;
          });
        }
      } catch (err) {
        logger.warn('mailService.sendMail', 'Failed to load/parse mock-emails.json, starting fresh', {}, err);
        mockEmails = [];
      }
    }

    // 신규 메일 로그 추가
    const newMockMail: MockMailRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      to: validatedParams.to,
      subject: validatedParams.subject,
      html: validatedParams.html,
      sentAt: new Date().toISOString(),
    };

    const newMailValidation = MockMailRecordSchema.safeParse(newMockMail);
    if (!newMailValidation.success) {
      logger.error('mailService.sendMail', 'New mock email validation failed', { error: String(newMailValidation.error) });
      return false;
    }

    mockEmails.unshift(newMailValidation.data);
    
    // 파일 크기 과대 방지를 위해 최근 30개만 보관
    if (mockEmails.length > 30) {
      mockEmails = mockEmails.slice(0, 30);
    }

    fs.writeFileSync(mockEmailPath, JSON.stringify(mockEmails, null, 2), 'utf-8');
    logger.info('mailService.sendMail', 'Email logged to mock-emails.json', { subject: validatedParams.subject, to: validatedParams.to });
    return true;
  } catch (error) {
    logger.error('mailService.sendMail', 'Mock mail log writing failed', {}, error);
    return false;
  }
}
