import crypto from "node:crypto";
import { q } from "./db";
import { sha256, unseal } from "./crypto";
import { cacheDel } from "./redis";

const PUBLIC = "id, email, name, role, status, token_ver, plan, plan_until, created_at, last_login_at, (totp_secret IS NOT NULL) AS totp";

export async function getUser(id) {
  const r = await q(`SELECT ${PUBLIC} FROM users WHERE id = ?`, [id]);
  return r[0] ? { ...r[0], totp: !!r[0].totp } : null;
}

// Includes secrets: only for the login / 2FA code paths.
export async function getUserAuth(email) {
  const r = await q("SELECT id, email, name, role, status, token_ver, pass_hash, totp_secret FROM users WHERE email = ?", [email]);
  return r[0] || null;
}

export async function getUserSecret(id) {
  const r = await q("SELECT pass_hash, totp_secret FROM users WHERE id = ?", [id]);
  return r[0] || null;
}

export async function createUser({ email, name, passHash, role }) {
  try {
    const r = await q("INSERT INTO users (email, name, pass_hash, role) VALUES (?,?,?,?)", [email, name, passHash, role || "user"]);
    return r.insertId;
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return null;
    throw e;
  }
}

export async function updateUser(id, fields) {
  const allowed = ["name", "status", "plan", "plan_until", "pass_hash", "totp_secret", "role", "last_login_at"];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return;
  const bump = keys.some((k) => ["pass_hash", "totp_secret", "status", "role"].includes(k));
  await q(`UPDATE users SET ${keys.map((k) => `\`${k}\` = ?`).join(", ")}${bump ? ", token_ver = token_ver + 1" : ""} WHERE id = ?`, [
    ...keys.map((k) => fields[k]),
    id,
  ]);
  await cacheDel(`u:${id}`);
}

export async function logoutEverywhere(id) {
  await q("UPDATE users SET token_ver = token_ver + 1 WHERE id = ?", [id]);
  await cacheDel(`u:${id}`);
}

export async function deleteUser(id) {
  await q("DELETE FROM users WHERE id = ?", [id]);
  await cacheDel(`u:${id}`);
}

/* ---------- 6-digit email codes ---------- */
export async function issueCode(userId, purpose, code) {
  await q("DELETE FROM email_codes WHERE user_id = ? AND purpose = ?", [userId, purpose]);
  await q("INSERT INTO email_codes (user_id, purpose, code_hash, expires_at) VALUES (?,?,?, UTC_TIMESTAMP() + INTERVAL 10 MINUTE)", [
    userId,
    purpose,
    sha256(`${userId}:${purpose}:${code}`),
  ]);
}

/** Returns "ok" | "bad" | "expired" | "locked". A code dies after 5 wrong tries or 10 minutes. */
export async function checkCode(userId, purpose, code) {
  const r = await q(
    "SELECT id, code_hash, tries, expires_at < UTC_TIMESTAMP() AS expired FROM email_codes WHERE user_id = ? AND purpose = ? ORDER BY id DESC LIMIT 1",
    [userId, purpose]
  );
  const row = r[0];
  if (!row) return "expired";
  if (row.expired) return "expired";
  if (row.tries >= 5) return "locked";
  const a = Buffer.from(sha256(`${userId}:${purpose}:${String(code || "")}`));
  const b = Buffer.from(row.code_hash);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    await q("DELETE FROM email_codes WHERE user_id = ? AND purpose = ?", [userId, purpose]);
    return "ok";
  }
  await q("UPDATE email_codes SET tries = tries + 1 WHERE id = ?", [row.id]);
  return row.tries + 1 >= 5 ? "locked" : "bad";
}

/* ---------- audit ---------- */
export async function audit(actorId, action, target, meta = null) {
  try {
    await q("INSERT INTO audit_log (actor_id, action, target, meta) VALUES (?,?,?,?)", [actorId, action, String(target).slice(0, 60), meta ? JSON.stringify(meta) : null]);
  } catch (e) {
    console.error("audit", e.message);
  }
}

/* ---------- admin ---------- */
export async function listUsers({ search = "", limit = 50, offset = 0 } = {}) {
  const like = `%${String(search).slice(0, 80)}%`;
  return q(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.plan, u.plan_until, u.created_at, u.last_login_at,
       (SELECT COUNT(*) FROM cards c WHERE c.user_id = u.id) AS cards
     FROM users u WHERE (? = '' OR u.email LIKE ? OR u.name LIKE ?) ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [search, like, like, limit, offset]
  );
}

export async function exportUser(id) {
  const user = await getUser(id);
  const cards = await q("SELECT id, slug, theme, status, data, style, created_at FROM cards WHERE user_id = ?", [id]);
  const leads = await q(
    "SELECT l.card_id, l.name, l.phone, l.note, l.created_at FROM leads l JOIN cards c ON c.id = l.card_id WHERE c.user_id = ?",
    [id]
  );
  const clear = leads.map((l) => ({ ...l, name: unseal(l.name), phone: unseal(l.phone), note: unseal(l.note) }));
  return { user: { email: user.email, name: user.name, plan: user.plan, created_at: user.created_at }, cards, leads: clear };
}
