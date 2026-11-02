// Fixed-window in-memory limiter with a hard size cap (no memory leak).
// One server only. For several instances, move this to Redis.
const buckets = (globalThis.__rl ??= new Map());
const MAX_KEYS = 20000;

export function hit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) {
        if (v.reset <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_KEYS) buckets.delete(buckets.keys().next().value);
    }
    b = { n: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.n += 1;
  return b.n <= max;
}

export function peek(key) {
  const b = buckets.get(key);
  return b && b.reset > Date.now() ? b.n : 0;
}
