import crypto from "node:crypto";
import { cookies } from "next/headers";
import { json } from "./api";

const COOKIE = "rc_session";
const MAX_AGE = 30 * 24 * 3600;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET missing or too short");
  return s;
}

const sign = (payload) => crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export function makeToken() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${exp}.owner`;
  return `${payload}.${sign(payload)}`;
}

function verify(token) {
  if (!token || typeof token !== "string") return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const good = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [exp, role] = payload.split(".");
  if (Number(exp) < Date.now() / 1000) return null;
  return { role };
}

export function passwordOk(input) {
  const want = process.env.ADMIN_PASSWORD || "";
  if (want.length < 8) return false;
  const a = crypto.createHash("sha256").update(String(input ?? "")).digest();
  const b = crypto.createHash("sha256").update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function getSession() {
  const jar = await cookies();
  try {
    return verify(jar.get(COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function setSession() {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !String(process.env.BASE_URL || "").startsWith("http://"),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// Guard for every admin API route.
export async function need() {
  const s = await getSession();
  if (!s) return { res: json({ error: "unauthorized" }, 401) };
  return { s };
}
