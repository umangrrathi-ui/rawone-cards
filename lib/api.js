import crypto from "node:crypto";

export const json = (data, status = 200) => Response.json(data, { status });

// Read a JSON body with a size cap.
export async function body(req, maxBytes = 1_000_000) {
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

// Right-most X-Forwarded-For is the one our proxy added; left-most can be spoofed.
export function clientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

// Daily anonymous visitor id. Raw IP is never stored.
export function visitorId(req) {
  const day = new Date().toISOString().slice(0, 10);
  const ua = req.headers.get("user-agent") || "";
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "dev")
    .update(`${day}|${clientIp(req)}|${ua}`)
    .digest("base64url")
    .slice(0, 16);
}

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|curl|wget|python|headless/i;
export const isBot = (req) => BOT.test(req.headers.get("user-agent") || "");

export function fail(e) {
  if (e?.status) return json({ error: e.status === 413 ? "Request too large" : "Bad request" }, e.status);
  console.error(e);
  return json({ error: "Something went wrong" }, 500);
}

export function baseUrl() {
  return (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}
