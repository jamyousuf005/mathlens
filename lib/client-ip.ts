import { NextRequest } from 'next/server';

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  return first ? first : null;
}

/**
 * Extracts a trustworthy client IP from platform-set request headers.
 *
 * Security note: headers that a client can set must never drive a security
 * decision. On Vercel, `x-vercel-forwarded-for`, `x-forwarded-for`, and
 * `x-real-ip` are written by the platform edge (Vercel overwrites XFF to
 * prevent IP spoofing), so they are safe to read first. `cf-connecting-ip` is
 * only trustworthy when Cloudflare is the outermost proxy, so it is opt-in.
 */
export function getClientIp(req: NextRequest): string {
  const platformIp =
    firstForwardedIp(req.headers.get('x-vercel-forwarded-for')) ??
    firstForwardedIp(req.headers.get('x-forwarded-for')) ??
    firstForwardedIp(req.headers.get('x-real-ip'));

  if (platformIp) return platformIp;

  if (process.env.TRUST_CF_CONNECTING_IP === 'true') {
    const cfIp = firstForwardedIp(req.headers.get('cf-connecting-ip'));
    if (cfIp) return cfIp;
  }

  return 'anonymous';
}
