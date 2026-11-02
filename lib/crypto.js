import crypto from "node:crypto";

/* ---------- passwords (scrypt) ---------- */
const N = 16384;
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(pw), salt, 32, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `s1$${N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export function verifyPassword(pw, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "s1") return false;
  const salt = Buffer.from(parts[2], "base64url");
  const want = Buffer.from(parts[3], "base64url");
  const got = crypto.scryptSync(String(pw), salt, want.length, { N: Number(parts[1]), r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// Same cost as a real check, so "no such email" takes as long as "wrong password".
const FAKE = hashPassword("timing-equaliser-not-a-password");
export function fakeVerify(pw) {
  verifyPassword(pw, FAKE);
  return false;
}

/* ---------- misc ---------- */
export const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

export function sixDigits() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function randomId(len = 8) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(len), (b) => abc[b % abc.length]).join("");
}

/* ---------- AES-256-GCM for small secrets at rest (2FA) ---------- */
function dataKey() {
  const k = process.env.DATA_KEY || "";
  if (k.length < 16) throw new Error("DATA_KEY missing or too short");
  return crypto.createHash("sha256").update(k).digest();
}
export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", dataKey(), iv);
  const out = Buffer.concat([c.update(String(text), "utf8"), c.final()]);
  return `${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${out.toString("base64url")}`;
}
export function decrypt(blob) {
  const [iv, tag, data] = String(blob).split(".");
  const d = crypto.createDecipheriv("aes-256-gcm", dataKey(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

/* ---------- TOTP (RFC 6238, SHA-1, 30 s, 6 digits) ---------- */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(buf) {
  let bits = 0;
  let val = 0;
  let out = "";
  for (const b of buf) {
    val = (val << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(val >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
function unbase32(s) {
  const clean = String(s).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let val = 0;
  const out = [];
  for (const ch of clean) {
    val = (val << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
export const newTotpSecret = () => base32(crypto.randomBytes(20));

function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", unbase32(secret)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}
export function totpOk(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ""))) return false;
  const step = Math.floor(now / 30000);
  for (const d of [-1, 0, 1]) {
    const a = Buffer.from(hotp(secret, step + d));
    const b = Buffer.from(String(code));
    if (crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}
export const totpNow = (secret, now = Date.now()) => hotp(secret, Math.floor(now / 30000));
