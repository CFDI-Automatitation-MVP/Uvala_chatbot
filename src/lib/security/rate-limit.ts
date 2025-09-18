import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import logger from "logger";

// Initialize Redis client using REST API (Edge Runtime compatible)
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Rate limit configurations for different endpoint types
export const rateLimits = {
  // General API endpoints - 100 requests per minute per IP
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "rl:api",
    analytics: true,
  }),

  // Chat endpoints - 30 requests per minute per IP (more restrictive due to LLM costs)
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "rl:chat",
    analytics: true,
  }),

  // Authentication endpoints - 10 attempts per minute per IP
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "rl:auth",
    analytics: true,
  }),

  // Stripe/payment endpoints - 20 requests per minute per IP
  payment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "rl:payment",
    analytics: true,
  }),

  // Tool execution endpoints - 50 requests per minute per IP
  tools: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    prefix: "rl:tools",
    analytics: true,
  }),

  // Very strict limits for sensitive operations - 5 per minute per IP
  sensitive: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "rl:sensitive",
    analytics: true,
  }),
};

/**
 * Extract client IP address from request with proper forwarded header handling
 */
function getClientIP(request: NextRequest): string {
  // Check for forwarded IP headers (common in production behind proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  // Check for real IP header (some proxies use this)
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to Vercel's geolocation IP or connection remote address
  const vercelIP = request.headers.get("x-vercel-forwarded-for");
  if (vercelIP) {
    return vercelIP;
  }

  // Final fallback - use localhost for development
  return "127.0.0.1";
}

/**
 * Check rate limit for a given endpoint type and IP
 */
export async function checkRateLimit(
  request: NextRequest,
  limitType: keyof typeof rateLimits,
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  ip: string;
}> {
  const ip = getClientIP(request);
  const rateLimit = rateLimits[limitType];

  try {
    const result = await rateLimit.limit(ip);

    if (!result.success) {
      logger.warn(`Rate limit exceeded for IP ${ip} on ${limitType} endpoint`, {
        ip,
        limitType,
        remaining: result.remaining,
        reset: result.reset,
        limit: result.limit,
      });
    }

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset),
      ip,
    };
  } catch (error) {
    logger.error("Rate limit check failed:", error);

    // Fail open in case of Redis issues - don't block legitimate users
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: new Date(),
      ip,
    };
  }
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(rateLimitResult: {
  limit: number;
  remaining: number;
  reset: Date;
}) {
  return {
    "X-RateLimit-Limit": rateLimitResult.limit.toString(),
    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    "X-RateLimit-Reset": rateLimitResult.reset.getTime().toString(),
  };
}

/**
 * Determine rate limit type based on request path
 */
export function getRateLimitType(pathname: string): keyof typeof rateLimits {
  if (pathname.startsWith("/api/chat")) {
    return "chat";
  }

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/sign")) {
    return "auth";
  }

  if (
    pathname.startsWith("/api/stripe") ||
    pathname.startsWith("/api/subscription")
  ) {
    return "payment";
  }

  if (pathname.includes("/workflow") && pathname.includes("/execute")) {
    return "tools";
  }

  // Sensitive operations that should have very strict limits
  if (
    pathname.includes("/delete") ||
    pathname.includes("/reset") ||
    pathname.includes("/admin")
  ) {
    return "sensitive";
  }

  // Default to general API rate limit
  return "api";
}

/**
 * Rate limit middleware function
 */
export async function rateLimitMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip rate limiting for static assets and specific paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/ping")
  ) {
    return null; // No rate limiting needed
  }

  // Only rate limit API routes
  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const limitType = getRateLimitType(pathname);
  const rateLimitResult = await checkRateLimit(request, limitType);

  if (!rateLimitResult.success) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil(
          (rateLimitResult.reset.getTime() - Date.now()) / 1000,
        ),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...createRateLimitHeaders(rateLimitResult),
          "Retry-After": Math.ceil(
            (rateLimitResult.reset.getTime() - Date.now()) / 1000,
          ).toString(),
        },
      },
    );
  }

  // Return headers to be merged with response
  return createRateLimitHeaders(rateLimitResult);
}
