import { MemoryCache } from "./memory-cache";
import { SafeRedisCache } from "./safe-redis-cache";

import { Cache } from "./cache.interface";
import { IS_DEV } from "lib/const";
import logger from "logger";

declare global {
  // eslint-disable-next-line no-var
  var __server__cache__: Cache | undefined;
}

const createCache = () => {
  if (IS_DEV) {
    logger.info("Using MemoryCache for development");
    return new MemoryCache();
  }

  // Use Upstash Redis REST API (KV) for production
  const upstashUrl = process.env.KV_REST_API_URL;
  const upstashToken = process.env.KV_REST_API_TOKEN;

  if (upstashUrl && upstashToken) {
    logger.info("Using SafeRedisCache with Upstash KV");
    return new SafeRedisCache({
      restUrl: upstashUrl,
      restToken: upstashToken,
      fallbackToMemory: true,
      maxRetries: 3,
      retryDelay: 60000,
    });
  }

  logger.warn("No Upstash KV credentials found, using MemoryCache");
  return new MemoryCache();
};

const serverCache = globalThis.__server__cache__ || createCache();

if (IS_DEV) {
  globalThis.__server__cache__ = serverCache;
}

export { serverCache };
