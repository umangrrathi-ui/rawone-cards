import crypto from "node:crypto";

export const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers });

/** Read a JSON object body with a size cap (bytes). */
export async function body(req, maxBytes = 64 * 1024) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes) throw Object.assign(new Error("too large"), { status: 413 });
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) throw Object.assign(new Error("too large"), { status: 413 });
  try {
    const v = JSON.parse(text || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    throw Object.assign(new Error("bad json"), { status: 400 });
  }
}

export function toId(v) {
  const s = String(v ?? "");
  return /^\d{1,10}$/.test(s) ? Number(s) : null;
}

// Right-most X-Forwarded-For was added by our own proxy; the left-most can be forged.
export function clientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts.at(-1);
  }
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

// Daily anonymous visitor id. Raw IPs are never stored.
export function visitorId(req) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "dev")
    .update(`${day}|${clientIp(req)}|${req.headers.get("user-agent") || ""}`)
    .digest("base64url")
    .slice(0, 16);
}

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|curl|wget|python|headless|httpclient|axios|go-http/i;
export const isBot = (req) => BOT.test(req.headers.get("user-agent") || "");

/** Map thrown errors to safe responses; details go to the server log only. */
export function fail(e) {
  if (e?.status) return json({ error: e.msg || (e.status === 413 ? "Request too large" : "Bad request") }, e.status);
  console.error(e);
  return json({ error: "Something went wrong. Try again." }, 500);
}

export const tooMany = () => json({ error: "Too many attempts. Wait a few minutes and try again." }, 429);

export function baseUrl() {
  return (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}
