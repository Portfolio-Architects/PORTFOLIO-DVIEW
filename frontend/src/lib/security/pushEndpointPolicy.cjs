'use strict';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const net = require('net');

const ALLOWED_PUSH_EXACT_HOSTS = Object.freeze([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]);

const ALLOWED_PUSH_HOST_SUFFIXES = Object.freeze([
  '.notify.windows.com',
]);

const DNS_SUBDOMAIN_LABEL_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

function isForbiddenIpv4Octets(a, b, c) {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

/**
 * Expands any valid IPv6 literal (compressed, uncompressed, or with embedded IPv4 suffix)
 * into its 8 canonical 16-bit hextets so no textual variant can evade range checks.
 */
function expandIpv6ToHextets(ip) {
  let working = ip;
  const lastColon = working.lastIndexOf(':');
  if (lastColon !== -1 && working.slice(lastColon + 1).includes('.')) {
    const ipv4Part = working.slice(lastColon + 1);
    if (net.isIP(ipv4Part) !== 4) return null;
    const octets = ipv4Part.split('.').map(Number);
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    working = `${working.slice(0, lastColon)}:${high}:${low}`;
  }

  const doubleColonParts = working.split('::');
  if (doubleColonParts.length > 2) return null;

  const left = doubleColonParts[0] ? doubleColonParts[0].split(':') : [];
  const right =
    doubleColonParts.length === 2 && doubleColonParts[1]
      ? doubleColonParts[1].split(':')
      : [];

  let groups;
  if (doubleColonParts.length === 2) {
    const missing = 8 - (left.length + right.length);
    if (missing < 1) return null;
    groups = [...left, ...Array(missing).fill('0'), ...right];
  } else {
    if (left.length !== 8) return null;
    groups = left;
  }

  const hextets = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    hextets.push(parseInt(group, 16));
  }
  return hextets;
}

/**
 * Blocks loopback, private RFC1918/RFC4193, link-local / cloud metadata,
 * multicast, NAT64, 6to4 private, IPv4-mapped/compatible, discard, and
 * local/internal hostnames to mitigate SSRF.
 */
function isForbiddenIpOrHost(rawHost) {
  const host = String(rawHost || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/, '');
  if (!host || host.includes('%')) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    const [a, b, c] = host.split('.').map(Number);
    return isForbiddenIpv4Octets(a, b, c);
  }

  if (ipVersion === 6) {
    const hextets = expandIpv6ToHextets(host);
    if (!hextets) return true; // Fail closed on unparseable IPv6
    const [h0, h1, h2, h3, h4, h5] = hextets;

    // ::/96 (covers ::, ::1, 0:0:0:0:0:0:0:1, ::0, deprecated IPv4-compatible ::a.b.c.d)
    if (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0) {
      return true;
    }
    // ::ffff:0:0/96 (IPv4-mapped) & ::ffff:0:0:0/96 (IPv4-translated)
    if (
      (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0xffff) ||
      (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0xffff && h5 === 0)
    ) {
      return true;
    }
    // fc00::/7 (Unique Local), fe80::/10 (Link-Local), fec0::/10 (Site-Local), ff00::/8 (Multicast)
    if (
      (h0 & 0xfe00) === 0xfc00 ||
      (h0 & 0xffc0) === 0xfe80 ||
      (h0 & 0xffc0) === 0xfec0 ||
      (h0 & 0xff00) === 0xff00
    ) {
      return true;
    }
    // 100::/64 (Discard-Only RFC 6666)
    if (h0 === 0x0100 && h1 === 0 && h2 === 0 && h3 === 0) {
      return true;
    }
    // 64:ff9b::/96 & 64:ff9b:1::/48 (NAT64 RFC 6052 / RFC 8215)
    if (
      h0 === 0x0064 &&
      h1 === 0xff9b &&
      ((h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0) || h2 === 0x0001)
    ) {
      return true;
    }
    // 2001::/32 (Teredo) & 2001:db8::/32 (Documentation)
    if (h0 === 0x2001 && (h1 === 0x0000 || h1 === 0x0db8)) {
      return true;
    }
    // 2002::/16 (6to4 embedding IPv4 in h1..h2)
    if (h0 === 0x2002 && isForbiddenIpv4Octets((h1 >> 8) & 0xff, h1 & 0xff, (h2 >> 8) & 0xff)) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Strict SSRF & official Web Push host allowlist validator.
 * Enforces HTTPS-only, port 443, zero credentials, non-private/non-metadata hosts,
 * non-empty path, and official browser push service domains.
 */
function validatePushEndpointUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'Push endpoint URL is required' };
  }
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return { valid: false, reason: 'Push endpoint URL length is invalid' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Invalid push endpoint URL format' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS push endpoints are allowed' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Credentials in push endpoint URL are forbidden' };
  }

  if (parsed.port && parsed.port !== '443') {
    return { valid: false, reason: 'Only standard HTTPS port 443 is allowed for push endpoints' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isForbiddenIpOrHost(hostname)) {
    return { valid: false, reason: 'Private, loopback, or metadata hosts are forbidden' };
  }

  const isExactAllowed = ALLOWED_PUSH_EXACT_HOSTS.includes(hostname);
  const isSuffixAllowed = ALLOWED_PUSH_HOST_SUFFIXES.some(
    (suffix) =>
      hostname.endsWith(suffix) &&
      hostname.length > suffix.length &&
      DNS_SUBDOMAIN_LABEL_PATTERN.test(hostname.slice(0, -suffix.length))
  );

  if (!isExactAllowed && !isSuffixAllowed) {
    return { valid: false, reason: 'Push endpoint host is not an allowed official Web Push service' };
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    return { valid: false, reason: 'Push endpoint path is missing' };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

module.exports = {
  ALLOWED_PUSH_EXACT_HOSTS,
  ALLOWED_PUSH_HOST_SUFFIXES,
  isForbiddenIpOrHost,
  validatePushEndpointUrl,
};
