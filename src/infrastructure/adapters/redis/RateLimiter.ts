import { createHash } from 'crypto';
import redis from './client';

// ── IP hashing ────────────────────────────────────────────────────────────────

/**
 * Hash a client IP address for GDPR-compliant storage.
 *
 * The raw IP is *never* persisted.  The hash is keyed with either a static
 * secret from the environment or a daily-rotating date string, which ensures
 * that hashes cannot be correlated across days without the secret.
 */
export function hashIp(ip: string): string {
  const salt =
    process.env.IP_HASH_SECRET || new Date().toISOString().split('T')[0];
  return createHash('sha256').update(ip + salt).digest('hex');
}

/**
 * Attempt to extract the real client IP from standard proxy headers.
 * Falls back to 'unknown' when running behind a proxy that strips headers
 * (e.g. during tests).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

// ── Core window logic ─────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

async function checkRateLimit(
  key: string,
  max: number,
  windowSecs: number,
): Promise<RateLimitResult> {
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // Set TTL only on the first increment so it is not accidentally reset.
      await redis.expire(key, windowSecs);
    }
    return { allowed: count <= max, remaining: Math.max(0, max - count) };
  } catch {
    // Fail open: if Redis is unavailable allow the request rather than
    // locking out all users.
    return { allowed: true, remaining: max };
  }
}

// ── Public rate-limit functions ───────────────────────────────────────────────

/** Max 1 game creation per 60 seconds per (hashed) IP (overridable via env). */
export async function limitCreateGame(
  hashedIp: string,
): Promise<RateLimitResult> {
  const max = parseInt(process.env.RATE_LIMIT_CREATE_MAX ?? '1', 10);
  const windowSecs = parseInt(process.env.RATE_LIMIT_CREATE_WINDOW_SECS ?? '60', 10);
  return checkRateLimit(`rl:create:${hashedIp}`, max, windowSecs);
}

/**
 * Max 60 requests per 10 seconds per (hashed) IP (overridable via env).
 * The high limit accommodates several clients sharing a single NAT/Wi-Fi IP
 * while still blocking abusive automated traffic.
 */
export async function limitGlobalAPI(
  hashedIp: string,
): Promise<RateLimitResult> {
  const max = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX ?? '60', 10);
  const windowSecs = parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_SECS ?? '10', 10);
  return checkRateLimit(`rl:global:${hashedIp}`, max, windowSecs);
}
