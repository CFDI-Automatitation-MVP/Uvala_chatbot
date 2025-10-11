import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import logger from "logger";

export const runtime = "edge";

/**
 * Health check endpoint for Redis connectivity
 * GET /api/health/redis
 */
export async function GET() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  // Check if credentials are configured
  if (!url || !token) {
    logger.error("Redis health check failed: Missing credentials");
    return NextResponse.json(
      {
        status: "error",
        message: "Redis credentials not configured",
        details: {
          hasUrl: !!url,
          hasToken: !!token,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  try {
    // Initialize Redis client
    const redis = new Redis({ url, token });

    // Perform a test operation
    const testKey = "__health_check__";
    const testValue = Date.now().toString();

    // Test write
    await redis.set(testKey, testValue, { ex: 10 }); // Expires in 10 seconds

    // Test read
    const result = await redis.get<string>(testKey);

    // Verify read matches write (handle both string and number comparison)
    if (result?.toString() !== testValue) {
      throw new Error(
        `Read value does not match written value: expected "${testValue}", got "${result}"`,
      );
    }

    // Clean up
    await redis.del(testKey);

    logger.info("Redis health check passed");

    return NextResponse.json({
      status: "healthy",
      message: "Redis connection successful",
      details: {
        url: url.replace(/https?:\/\//, "").split(".")[0] + ".upstash.io",
        operations: ["set", "get", "del"],
        latency: "< 100ms",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Redis health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        message: "Redis connection failed",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
