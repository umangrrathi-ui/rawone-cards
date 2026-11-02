import { Redis } from "ioredis";

// One shared client. Without REDIS_URL (local dev) callers fall back to in-memory behaviour.
export function redis() {
  if (!process.env.REDIS_URL) return null;
  if (!globalThis.__redis) {
    const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, enableOfflineQueue: false, lazyConnect: false });
    r.on("error", (e) => console.error("redis", e.code || e.message));
    globalThis.__redis = r;
  }
  return globalThis.__redis;
}

export async function cacheGet(key) {
  const r = redis();
  if (!r) return null;
  try {
    const v = await r.get(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSec) {
  const r = redis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    /* cache is best-effort */
  }
}

export async function cacheDel(...keys) {
  const r = redis();
  if (!r || !keys.length) return;
  try {
    await r.del(...keys);
  } catch {
    /* best-effort */
  }
}
