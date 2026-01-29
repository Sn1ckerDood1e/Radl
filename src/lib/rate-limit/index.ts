import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
};

/**
 * Rate limit configurations by action type.
 * Auth endpoints use stricter limits to prevent brute force.
 */
export const authLimits = {
  login: { requests: 5, window: '15 m' },      // 5 attempts per 15 minutes
  signup: { requests: 3, window: '1 h' },      // 3 signups per hour per IP
  'forgot-password': { requests: 3, window: '1 h' }, // 3 reset requests per hour
} as const;

type AuthAction = keyof typeof authLimits;

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

// Auth-specific rate limiters with different windows
const authRateLimiters: Map<AuthAction, Ratelimit> = new Map();

function getAuthRateLimiter(action: AuthAction): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('Auth rate limiting disabled: Upstash not configured');
    return null;
  }

  if (!authRateLimiters.has(action)) {
    const config = authLimits[action];
    authRateLimiters.set(action, new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true,
      prefix: `rowops:auth:${action}`,
    }));
  }

  return authRateLimiters.get(action)!;
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
 * Check auth-specific rate limit with stricter windows.
 * Returns rate limit result with headers for 429 responses.
 */
export async function checkAuthRateLimit(
  identifier: string,
  action: AuthAction
): Promise<RateLimitResult> {
  const limiter = getAuthRateLimiter(action);

  if (!limiter) {
    return { success: true, limit: Infinity, remaining: Infinity, reset: 0 };
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}

/**
 * Build rate limit headers for 429 responses.
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };
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
