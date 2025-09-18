import logger from "logger";

/**
 * Safely formats error messages for API responses
 * In production, generic messages are returned to prevent information disclosure
 * In development, detailed error messages are shown for debugging
 */
export function formatApiErrorMessage(
  error: any,
  fallbackMessage = "Internal server error",
): string {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    return error.message || fallbackMessage;
  }

  // In production, only return generic messages
  // Log the actual error for monitoring
  logger.error("API Error:", error);
  return fallbackMessage;
}

/**
 * Standard error responses for common scenarios
 */
export const API_ERROR_MESSAGES = {
  UNAUTHORIZED: "Authentication required",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Resource not found",
  VALIDATION_ERROR: "Invalid request data",
  RATE_LIMITED: "Too many requests",
  INTERNAL_ERROR: "Internal server error",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
} as const;

/**
 * Creates a safe error response
 */
export function createErrorResponse(
  message: string,
  status: number,
  error?: any,
): Response {
  const safeMessage = formatApiErrorMessage(error, message);
  return Response.json({ error: safeMessage }, { status });
}
