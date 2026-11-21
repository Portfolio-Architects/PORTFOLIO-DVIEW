export declare const ALLOWED_PUSH_EXACT_HOSTS: readonly [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
];

export declare const ALLOWED_PUSH_HOST_SUFFIXES: readonly ['.notify.windows.com'];

export declare function isForbiddenIpOrHost(rawHost: string): boolean;

export declare function validatePushEndpointUrl(rawUrl: string): {
  valid: boolean;
  reason?: string;
  normalizedUrl?: string;
};
