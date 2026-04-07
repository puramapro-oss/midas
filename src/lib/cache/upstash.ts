import { Redis } from '@upstash/redis';

const PREFIX = 'midas:';

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token || !url.startsWith('https://')) {
    throw new Error('Upstash Redis env vars missing or invalid');
  }
  _redis = new Redis({ url, token });
  return _redis;
}

// Proxy that lazy-instantiates the client only on first method call
export const redis = new Proxy({} as Redis, {
  get(_target, prop: string) {
    const client = getRedis() as unknown as Record<string, unknown>;
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

function prefixKey(key: string): string {
  return `${PREFIX}${key}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const value = await redis.get<T>(prefixKey(key));
  return value ?? null;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const prefixed = prefixKey(key);
  if (ttlSeconds) {
    await redis.set(prefixed, value, { ex: ttlSeconds });
  } else {
    await redis.set(prefixed, value);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  await redis.del(prefixKey(key));
}

export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

export async function cacheIncrement(key: string, ttlSeconds?: number): Promise<number> {
  const prefixed = prefixKey(key);
  const value = await redis.incr(prefixed);
  if (ttlSeconds && value === 1) {
    await redis.expire(prefixed, ttlSeconds);
  }
  return value;
}
