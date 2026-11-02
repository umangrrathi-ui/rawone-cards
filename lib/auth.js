import crypto from "node:crypto";
import { cookies } from "next/headers";
import { json } from "./api";
import { getUser } from "./users";
import { cacheGet, cacheSet } from "./redis";

const COOKIE = "rc_s";
const MAX_AGE = 30 * 24 * 3600;

function secret() {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 16) throw new Error("SESSION_SECRET missing or too short");
  return s;
}
const sign = (p) => crypto.createHmac("sha256", secret()).update(p).digest("base64url");

// token = exp.uid.ver.sig
export function makeToken(user) {
  const payload = `${Math.floor(Date.now() / 1000) + MAX_AGE}.${user.id}.${user.token_ver}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || typeof token !== "string" || token.length > 200) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [exp, uid, ver] = payload.split(".").map(Number);
  if (!exp || exp < Date.now() / 1000) return null;
  return { uid, ver };
}

// Fresh user every request (60 s Redis cache, cleared on any account change).
async function loadUser(id) {
  const hit = await cacheGet(`u:${id}`);
  if (hit) return hit;
  const u = await getUser(id);
  if (u) await cacheSet(`u:${id}`, u, 60);
  return u;
}

export async function currentUser() {
  try {
    const jar = await cookies();
    const t = readToken(jar.get(COOKIE)?.value);
    if (!t) return null;
    const u = await loadUser(t.uid);
    if (!u || u.token_ver !== t.ver || u.status !== "active") return null;
    return u;
  } catch {
    return null;
  }
}

const secure = () => process.env.NODE_ENV === "production" && !String(process.env.BASE_URL || "").startsWith("http://");

export async function startSession(user) {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(user), { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function endSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", maxAge: 0 });
}

export const isStaff = (u) => !!u && (u.role === "admin" || u.role === "support");

/**
 * Guard for API routes. `staff` = admin or support with 2FA on; `admin` = admin with 2FA on.
 * Returns { user } or { res } (an error response to return as-is).
 */
export async function need({ staff = false, admin = false } = {}) {
  const user = await currentUser();
  if (!user) return { res: json({ error: "Please log in again" }, 401) };
  if (staff || admin) {
    const ok = admin ? user.role === "admin" : isStaff(user);
    if (!ok) return { res: json({ error: "Not allowed" }, 403) };
    if (!user.totp) return { res: json({ error: "Turn on two-factor authentication first" }, 403) };
  }
  return { user };
}

export const adminEmails = () =>
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
