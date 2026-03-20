import { LRUCache } from 'lru-cache';

export class CacheLayer {
  private lru: LRUCache<string, any>;
  private redis: any | null = null;

  constructor(redisUrl?: string, maxLruEntries = 1000) {
    this.lru = new LRUCache<string, any>({ max: maxLruEntries });

    if (redisUrl) {
      // Dynamically import ioredis so the module is optional at runtime
      import('ioredis')
        .then((mod) => {
          const Redis = (mod.default ?? mod) as any;
          const client = new Redis(redisUrl);
          client.on('error', () => {
            // Silently fall back to LRU on any Redis error
            this.redis = null;
          });
          this.redis = client;
        })
        .catch(() => {
          // ioredis not available or failed — remain LRU-only
        });
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    // Try Redis first
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw !== null && raw !== undefined) {
          return JSON.parse(raw) as T;
        }
      } catch {
        // Fall through to LRU
      }
    }

    // Fall back to LRU
    const val = this.lru.get(key);
    return val as T | undefined;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    // Skip caching when ttl is zero or negative
    if (ttlSeconds <= 0) {
      return;
    }

    // Write to Redis if available
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch {
        // Silently ignore Redis write failures
      }
    }

    // Always write to LRU
    this.lru.set(key, value, { ttl: ttlSeconds * 1000 });
  }

  async clear(): Promise<void> {
    this.lru.clear();

    if (this.redis) {
      try {
        await this.redis.flushdb();
      } catch {
        // Silently ignore
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // Silently ignore
      } finally {
        this.redis = null;
      }
    }
  }
}
