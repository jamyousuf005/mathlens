import { NextRequest } from 'next/server';

/**
 * Extracts a dependable client IP from incoming NextRequest headers,
 * prioritizing trusted reverse proxy headers (Cloudflare, Vercel, Fly.io, etc.).
 */
export function getClientIp(req: NextRequest): string {
  // Cloudflare
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  // Vercel / Standard reverse proxy
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  // Standard forwarded for (take the first client IP in chain)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'anonymous';
}
