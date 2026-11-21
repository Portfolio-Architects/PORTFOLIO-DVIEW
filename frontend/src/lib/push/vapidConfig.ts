import type webpush from 'web-push';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
  isConfigured: boolean;
}

function stripQuotes(val: string | undefined): string {
  return (val || '').trim().replace(/^["']|["']$/g, '');
}

/**
 * Resolves Web Push VAPID credentials strictly from environment variables.
 * Never embeds hardcoded private keys in source code.
 */
export function getVapidConfig(): VapidConfig {
  const publicKey = stripQuotes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const privateKey = stripQuotes(process.env.VAPID_PRIVATE_KEY);
  const subject = stripQuotes(process.env.VAPID_SUBJECT) || 'mailto:support@dongtanview.com';

  return {
    publicKey,
    privateKey,
    subject,
    isConfigured: Boolean(publicKey && privateKey),
  };
}

export interface VapidConfigureResult {
  configured: boolean;
  publicKey: string;
  subject: string;
  reason?: string;
}

export function configureWebPushVapid(
  webpushClient: Pick<typeof webpush, 'setVapidDetails'>
): VapidConfigureResult {
  const { publicKey, privateKey, subject, isConfigured } = getVapidConfig();

  if (!isConfigured) {
    return {
      configured: false,
      publicKey,
      subject,
      reason: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing',
    };
  }

  try {
    webpushClient.setVapidDetails(subject, publicKey, privateKey);
    return {
      configured: true,
      publicKey,
      subject,
    };
  } catch (err) {
    return {
      configured: false,
      publicKey,
      subject,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
