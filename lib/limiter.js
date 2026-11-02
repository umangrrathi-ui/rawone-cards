import { redis } from "./redis";

// Fixed-window limiter. Redis when available (shared across processes), bounded memory otherwise.
const mem = (globalThis.__rl ??= new Map());
const MAX_KEYS = 20000;

function memHit(key, windowSec) {
  const now = Date.now();
  let b = mem.get(key);
  if (!b || b.reset <= now) {
    if (mem.size >= MAX_KEYS) {
      for (const [k, v] of mem) if (v.reset <= now) mem.delete(k);
      if (mem.size >= MAX_KEYS) mem.delete(mem.keys().next().value);
    }
    b = { n: 0, reset: now + windowSec * 1000 };
    mem.set(key, b);
  }
  b.n += 1;
  return b.n;
}

/** Counts one hit and returns true while the key is under `max` per `windowSec`. */
export async function hit(key, max, windowSec) {
  const r = redis();
  if (r) {
    try {
      const k = `rl:${key}`;
      const n = await r.incr(k);
      if (n === 1) await r.expire(k, windowSec);
      return n <= max;
    } catch {
      /* fall through to memory */
    }
  }
  return memHit(key, windowSec) <= max;
}

/** Reads a counter without adding a hit. */
export async function count(key) {
  const r = redis();
  if (r) {
    try {
      return Number((await r.get(`rl:${key}`)) || 0);
    } catch {
      /* memory */
    }
  }
  const b = mem.get(key);
  return b && b.reset > Date.now() ? b.n : 0;
}

export async function reset(key) {
  const r = redis();
  if (r) {
    try {
      await r.del(`rl:${key}`);
    } catch {
      /* ignore */
    }
  }
  mem.delete(key);
}
