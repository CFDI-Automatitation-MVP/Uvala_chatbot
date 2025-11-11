import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import logger from "logger";

const CSRF_SECRET =
  process.env.CSRF_SECRET ||
  process.env.NEXT_AUTH_SECRET ||
  "fallback-csrf-secret-change-in-production";
const CSRF_TOKEN_LENGTH = 32;
// Use __Host- prefix only in production (requires HTTPS)
const CSRF_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-csrf-token" : "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate random bytes using Web Crypto API (Edge Runtime compatible)
 */
function generateRandomHex(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Create HMAC using Web Crypto API (Edge Runtime compatible)
 */
async function createHmacSignature(
  message: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Generate a cryptographically secure CSRF token
 */
export async function generateCSRFToken(): Promise<string> {
  const randomToken = generateRandomHex(CSRF_TOKEN_LENGTH);
  const timestamp = Date.now().toString();
  const payload = `${randomToken}.${timestamp}`;

  // Create HMAC signature
  const signature = await createHmacSignature(payload, CSRF_SECRET);

  return `${payload}.${signature}`;
}

/**
 * Verify a CSRF token's validity and age
 */
export async function verifyCSRFToken(token: string): Promise<boolean> {
  try {
    if (!token || typeof token !== "string") {
      return false;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    const [randomToken, timestamp, signature] = parts;
    const payload = `${randomToken}.${timestamp}`;

    // Verify signature
    const expectedSignature = await createHmacSignature(payload, CSRF_SECRET);

    if (signature !== expectedSignature) {
      logger.warn("CSRF token signature verification failed");
      return false;
    }

    // Check token age (max 24 hours)
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (now - tokenTime > maxAge) {
      logger.warn("CSRF token expired");
      return false;
    }

    return true;
  } catch (error) {
    logger.error("CSRF token verification error:", error);
    return false;
  }
}

/**
 * Get CSRF token from request (header or body)
 */
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  // Check if it's a form submission and get token from body
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    // Note: This is a simplified approach. In production, you might want to
    // parse the form data more carefully
    return null; // For now, we'll rely on header-based tokens
  }

  return null;
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFTokenFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME);
    return csrfCookie?.value || null;
  } catch (error) {
    logger.error("Error getting CSRF token from cookie:", error);
    return null;
  }
}

/**
 * Set CSRF token cookie
 */
export async function setCSRFTokenCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });
  } catch (error) {
    logger.error("Error setting CSRF token cookie:", error);
  }
}

/**
 * Validate CSRF token for a request
 */
export async function validateCSRFToken(
  request: NextRequest,
): Promise<boolean> {
  try {
    // Get token from request
    const requestToken = getCSRFTokenFromRequest(request);
    if (!requestToken) {
      logger.warn("CSRF validation failed: No token in request");
      return false;
    }

    // Get token from cookie for comparison
    const cookieToken = await getCSRFTokenFromCookie();
    if (!cookieToken) {
      logger.warn("CSRF validation failed: No token in cookie");
      return false;
    }

    // Verify tokens match
    if (requestToken !== cookieToken) {
      logger.warn("CSRF validation failed: Token mismatch");
      return false;
    }

    // Verify token is valid
    if (!(await verifyCSRFToken(requestToken))) {
      logger.warn("CSRF validation failed: Invalid token");
      return false;
    }

    return true;
  } catch (error) {
    logger.error("CSRF validation error:", error);
    return false;
  }
}

/**
 * Check if endpoint requires CSRF protection
 */
export function requiresCSRFProtection(
  pathname: string,
  method: string,
): boolean {
  // Only protect state-changing operations
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method.toUpperCase())) {
    return false;
  }

  // Critical operations that always need CSRF protection
  // Note: Stripe endpoints are excluded as they have their own security (webhook signatures, API keys)
  // and are already protected by authentication
  const criticalPaths = [
    "/api/subscription/",
    "/api/user/preferences",
    "/api/archive",
    "/api/bookmark",
    "/api/agent",
    "/api/workflow",
  ];

  // Check if the path matches any critical patterns
  return criticalPaths.some((criticalPath) =>
    pathname.startsWith(criticalPath),
  );
}

/**
 * CSRF protection middleware
 */
export async function csrfMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip CSRF for non-critical operations
  if (!requiresCSRFProtection(pathname, method)) {
    return null;
  }

  // Skip CSRF for webhook endpoints (they have their own verification)
  if (pathname.includes("/webhook") || pathname.includes("/callback")) {
    return null;
  }

  // Validate CSRF token
  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    logger.warn(`CSRF validation failed for ${method} ${pathname}`, {
      ip: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent"),
    });

    return new Response(
      JSON.stringify({
        error: "CSRF validation failed",
        message: "Invalid or missing CSRF token",
        code: "CSRF_TOKEN_INVALID",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  return null; // CSRF validation passed
}

/**
 * API endpoint to get a new CSRF token
 */
export async function generateCSRFTokenForClient(): Promise<{
  token: string;
  cookie: string;
}> {
  const token = await generateCSRFToken();
  await setCSRFTokenCookie(token);

  return {
    token,
    cookie: CSRF_COOKIE_NAME,
  };
}
