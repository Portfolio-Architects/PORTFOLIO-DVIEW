import nodemailer from 'nodemailer';
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

/**
 * 이메일을 발송하는 공통 서비스입니다.
 * SMTP 환경변수(SMTP_HOST, SMTP_USER, SMTP_PASS)가 존재하고 올바르면 실제 메일을 전송하고,
 * 그렇지 않으면 외부 파일에 개인정보를 기록하지 않고 서버 로그만 남깁니다.
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

      logger.info('mailService.sendMail', 'Email sent successfully via SMTP', { messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error('mailService.sendMail', 'SMTP mail delivery failed', {}, error);
      return false;
    }
  } else {
    // Only warn if SMTP env variables are partially provided but incomplete/invalid
    if (process.env.SMTP_HOST || process.env.SMTP_USER || process.env.SMTP_PASS) {
      logger.warn('mailService.sendMail', 'SMTP configuration variables are invalid', { error: String(smtpConfigValidation.error) });
    }
  }

  logger.info('mailService.sendMail', 'SMTP not configured; skipping external email delivery without writing public log files', {
    subject: validatedParams.subject,
  });
  return true;
}

