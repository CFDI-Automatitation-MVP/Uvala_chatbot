import { Redis } from "@upstash/redis";
import { Cache } from "./cache.interface";
import logger from "logger";

export interface RedisCacheOptions {
  redis?: Redis;
  redisUrl?: string;
  restUrl?: string;
  restToken?: string;
  defaultTtlMs?: number;
  keyPrefix?: string;
}

export class RedisCache implements Cache {
  private redis: Redis;
  private defaultTtlMs: number;
  private keyPrefix: string;

  constructor(options: RedisCacheOptions = {}) {
    logger.info("RedisCache constructor - Using Upstash Redis");

    if (options.redis) {
      this.redis = options.redis;
    } else if (options.restUrl && options.restToken) {
      // Use Upstash REST API
      this.redis = new Redis({
        url: options.restUrl,
        token: options.restToken,
      });
    } else if (options.redisUrl) {
      // Legacy fallback - won't work with Upstash
      logger.warn(
        "RedisCache: Using legacy redisUrl, this may not work with Upstash",
      );
      this.redis = Redis.fromEnv();
    } else {
      // Use environment variables
      this.redis = Redis.fromEnv();
    }

    this.defaultTtlMs = options.defaultTtlMs ?? Infinity;
    this.keyPrefix = options.keyPrefix ?? "";
  }

  private getKey(key: string): string {
    return this.keyPrefix + key;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(this.getKey(key));
    if (!value) return undefined;

    // Handle Upstash Redis response types
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    try {
      return JSON.parse(stringValue) as T;
    } catch {
      return stringValue as T;
    }
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const serialized = JSON.stringify(value);

    if (isFinite(ttl)) {
      // Convert milliseconds to seconds for Upstash
      const ttlSeconds = Math.ceil(ttl / 1000);
      await this.redis.setex(this.getKey(key), ttlSeconds, serialized);
    } else {
      await this.redis.set(this.getKey(key), serialized);
    }
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(this.getKey(key));
    return exists === 1;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.getKey(key));
  }

  async clear(): Promise<void> {
    if (this.keyPrefix) {
      const keys = await this.redis.keys(this.keyPrefix + "*");
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      await this.redis.flushdb();
    }
  }

  async getAll(): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>();
    const pattern = this.keyPrefix ? this.keyPrefix + "*" : "*";
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) return result;

    const values = await this.redis.mget(...keys);

    keys.forEach((key, index) => {
      const value = values[index];
      if (value !== null && value !== undefined) {
        const cleanKey = this.keyPrefix
          ? key.slice(this.keyPrefix.length)
          : key;
        try {
          result.set(cleanKey, JSON.parse(value as string));
        } catch {
          result.set(cleanKey, value);
        }
      }
    });

    return result;
  }

  async disconnect(): Promise<void> {
    // Upstash Redis doesn't need explicit disconnection (REST API)
    logger.info(
      "RedisCache: Upstash Redis disconnection requested (no-op for REST API)",
    );
  }
}
