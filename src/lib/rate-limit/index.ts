import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
};

// Singleton rate limiter - created lazily when env vars available
let rateLimiter: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (rateLimiter) return rateLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Graceful fallback: rate limiting disabled if not configured
    console.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set');
    return null;
  }

  rateLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
    analytics: true,
    prefix: 'rowops:ratelimit',
  });

  return rateLimiter;
}

/**
 * Check rate limit for an identifier (typically IP address)
 * Returns success: true if under limit, success: false if exceeded
 *
 * @param identifier - Unique identifier (IP address for anonymous, user ID for authenticated)
 * @param action - Action name for namespacing (e.g., 'damage-report', 'join')
 */
export async function checkRateLimit(
  identifier: string,
  action: string
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();

  // If rate limiting not configured, allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
    };
  }

  const key = `${action}:${identifier}`;
  const { success, limit, remaining, reset } = await limiter.limit(key);

  return { success, limit, remaining, reset };
}

/**
 * Get client IP from Next.js request
 * Handles X-Forwarded-For header for reverse proxy scenarios
 */
export function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (set by reverse proxies like Vercel)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (client IP) from the comma-separated list
    return forwardedFor.split(',')[0].trim();
  }

  // Fallback: check X-Real-IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Last resort fallback
  return 'unknown';
}
