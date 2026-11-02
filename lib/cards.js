import { createHash } from "node:crypto";
import { q } from "./db";
import { blindIndex, randomId, seal, unseal } from "./crypto";
import { cacheDel, cacheGet, cacheSet } from "./redis";
import { mediaUrl } from "./media";
import { PLANS, planOf } from "./plans";

const parse = (v) => {
  if (v && typeof v === "object") return v;
  try {
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
};

function fromRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    code: r.code,
    slug: r.slug,
    theme: r.theme,
    status: r.status,
    data: parse(r.data),
    style: parse(r.style),
    photoKey: r.photo_key || "",
    logoKey: r.logo_key || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Flat object the card renderer understands. */
/** Fingerprint of the editable content. Lets the editor detect that another tab or device saved a newer version. */
export const cardRev = (card) =>
  createHash("sha1").update(JSON.stringify([card.slug, card.theme, card.data, card.style])).digest("hex").slice(0, 16);

export function toView(card, owner) {
  return {
    slug: card.slug,
    code: card.code,
    theme: card.theme,
    ...card.data,
    ...card.style,
    photo: mediaUrl(card.photoKey),
    logo: mediaUrl(card.logoKey),
    footer: owner ? PLANS[planOf(owner)].footer : true,
  };
}

/* ---------- owner-scoped (every query filters on user_id) ---------- */
export async function listMyCards(userId) {
  return q(
    `SELECT c.id, c.slug, c.code, c.theme, c.status, c.data, c.updated_at,
       (SELECT COUNT(*) FROM card_events e WHERE e.card_id = c.id AND e.type = 'view' AND e.created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY) AS views30,
       (SELECT COUNT(*) FROM leads l WHERE l.card_id = c.id) AS leads
     FROM cards c WHERE c.user_id = ? ORDER BY c.id DESC`,
    [userId]
  ).then((rows) => rows.map((r) => ({ ...r, data: parse(r.data) })));
}

export async function countMyCards(userId) {
  const r = await q("SELECT COUNT(*) AS n FROM cards WHERE user_id = ?", [userId]);
  return Number(r[0].n);
}

export async function getMyCard(userId, id) {
  const r = await q("SELECT * FROM cards WHERE id = ? AND user_id = ?", [id, userId]);
  return fromRow(r[0]);
}

export async function slugTaken(slug, exceptId = 0) {
  const r = await q("SELECT id FROM cards WHERE slug = ? AND id <> ?", [slug, exceptId]);
  return r.length > 0;
}

export async function createCard(userId, { slug, theme, data, style }) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await q("INSERT INTO cards (user_id, code, slug, theme, data, style) VALUES (?,?,?,?,?,?)", [
        userId,
        randomId(8),
        slug,
        theme,
        JSON.stringify(data),
        JSON.stringify(style),
      ]);
      return { id: r.insertId };
    } catch (e) {
      if (e.code !== "ER_DUP_ENTRY") throw e;
      if (String(e.message).includes("slug")) return { error: "slug" };
    }
  }
  throw new Error("could not allocate card code");
}

const EDITABLE = { slug: "slug", theme: "theme", status: "status", data: "data", style: "style", photoKey: "photo_key", logoKey: "logo_key" };

export async function updateMyCard(userId, id, fields) {
  const before = await getMyCard(userId, id);
  if (!before) return { error: "missing" };
  if (before.status === "blocked" && fields.status) delete fields.status; // only staff can unblock
  const sets = [];
  const vals = [];
  for (const [k, col] of Object.entries(EDITABLE)) {
    if (!(k in fields)) continue;
    let v = fields[k];
    if (k === "data" || k === "style") v = JSON.stringify(v);
    if ((k === "photoKey" || k === "logoKey") && !v) v = null;
    sets.push(`\`${col}\` = ?`);
    vals.push(v);
  }
  if (!sets.length) return { card: before };
  try {
    await q(`UPDATE cards SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, [...vals, id, userId]);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return { error: "slug" };
    throw e;
  }
  await cacheDel(`card:${before.slug}`, ...(fields.slug && fields.slug !== before.slug ? [`card:${fields.slug}`] : []));
  return { card: await getMyCard(userId, id), before };
}

export async function deleteMyCard(userId, id) {
  const c = await getMyCard(userId, id);
  if (!c) return null;
  await q("DELETE FROM cards WHERE id = ? AND user_id = ?", [id, userId]);
  await cacheDel(`card:${c.slug}`);
  return c;
}

/* ---------- public ---------- */
// Live card + owner plan, cached 5 min. Blocked owners and blocked cards never render.
export async function getLiveCard(slug) {
  const key = `card:${slug}`;
  const hit = await cacheGet(key);
  if (hit) return hit.missing ? null : hit;
  const r = await q(
    `SELECT c.*, u.plan, u.plan_until, u.status AS owner_status FROM cards c JOIN users u ON u.id = c.user_id
     WHERE c.slug = ? AND c.status = 'live' AND u.status = 'active'`,
    [slug]
  );
  if (!r[0]) {
    await cacheSet(key, { missing: true }, 60);
    return null;
  }
  const card = fromRow(r[0]);
  const out = { id: card.id, card, view: toView(card, { plan: r[0].plan, plan_until: r[0].plan_until }) };
  await cacheSet(key, out, 300);
  return out;
}

export async function getByCode(code) {
  const r = await q("SELECT id, slug, status FROM cards WHERE code = ?", [code]);
  return r[0] || null;
}

export async function cardIdBySlug(slug) {
  const live = await getLiveCard(slug);
  return live ? live.id : null;
}

/* ---------- events / stats ---------- */
export const EVENT_TYPES = ["view", "save", "call", "whatsapp", "maps", "email", "instagram", "website", "linkedin", "facebook", "youtube", "x", "share"];

export async function addEvent(cardId, type, src, visitor) {
  await q("INSERT INTO card_events (card_id, type, src, visitor) VALUES (?,?,?,?)", [cardId, type, src, visitor]);
}

export async function stats(cardId, days) {
  const off = Number(process.env.TZ_OFFSET_MIN || 330);
  const rows = await q(
    `SELECT type, src, COUNT(*) AS n, COUNT(DISTINCT visitor) AS u FROM card_events
     WHERE card_id = ? AND created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY GROUP BY type, src`,
    [cardId, days]
  );
  const daily = await q(
    `SELECT DATE(created_at + INTERVAL ? MINUTE) AS d, COUNT(*) AS n FROM card_events
     WHERE card_id = ? AND type = 'view' AND created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY GROUP BY d ORDER BY d`,
    [off, cardId, days]
  );
  const uniq = await q(
    "SELECT COUNT(DISTINCT visitor) AS u FROM card_events WHERE card_id = ? AND type = 'view' AND created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY",
    [cardId, days]
  );
  const byType = {};
  const bySrc = { nfc: 0, qr: 0, link: 0 };
  for (const r of rows) {
    byType[r.type] = (byType[r.type] || 0) + Number(r.n);
    if (r.type === "view") bySrc[r.src] = Number(r.n);
  }
  const map = new Map(daily.map((r) => [new Date(r.d).toISOString().slice(0, 10), Number(r.n)]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() + off * 60000 - i * 864e5).toISOString().slice(0, 10);
    series.push({ d, n: map.get(d) || 0 });
  }
  return { days, byType, bySrc, unique: Number(uniq[0].u), series };
}

/* ---------- leads ---------- */
export async function addLead(cardId, { name, phone, note }) {
  try {
    await q("INSERT INTO leads (card_id, name, phone, phone_h, note, consent_at) VALUES (?,?,?,?,?, UTC_TIMESTAMP())", [cardId, seal(name), seal(phone), blindIndex(phone), note ? seal(note) : null]);
    return { dup: false };
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return { dup: true };
    throw e;
  }
}

export const listLeads = (cardId) =>
  q("SELECT id, name, phone, note, created_at FROM leads WHERE card_id = ? ORDER BY id DESC LIMIT 5000", [cardId]).then((rows) =>
    rows.map((r) => ({ ...r, name: unseal(r.name), phone: unseal(r.phone), note: unseal(r.note) }))
  );

export const deleteLead = (cardId, leadId) => q("DELETE FROM leads WHERE id = ? AND card_id = ?", [leadId, cardId]);

/* ---------- abuse reports ---------- */
export const REPORT_REASONS = ["fake", "scam", "offensive", "impersonation", "other"];
export const addReport = (cardId, reason, note) => q("INSERT INTO abuse_reports (card_id, reason, note) VALUES (?,?,?)", [cardId, reason, note || null]);

/* ---------- staff ---------- */
export async function adminCards(search = "") {
  const like = `%${String(search).slice(0, 80)}%`;
  return q(
    `SELECT c.id, c.slug, c.status, c.theme, c.updated_at, u.email, u.id AS user_id,
       (SELECT COUNT(*) FROM abuse_reports r WHERE r.card_id = c.id AND r.status = 'open') AS open_reports
     FROM cards c JOIN users u ON u.id = c.user_id
     WHERE (? = '' OR c.slug LIKE ? OR u.email LIKE ?) ORDER BY open_reports DESC, c.id DESC LIMIT 200`,
    [search, like, like]
  );
}

export async function adminSetCardStatus(id, status) {
  const r = await q("SELECT slug FROM cards WHERE id = ?", [id]);
  if (!r[0]) return false;
  await q("UPDATE cards SET status = ? WHERE id = ?", [status, id]);
  await cacheDel(`card:${r[0].slug}`);
  return true;
}

export const adminReports = () =>
  q(
    `SELECT r.id, r.card_id, r.reason, r.note, r.created_at, c.slug, c.status FROM abuse_reports r JOIN cards c ON c.id = r.card_id
     WHERE r.status = 'open' ORDER BY r.id DESC LIMIT 200`
  );

export const closeReports = (cardId) => q("UPDATE abuse_reports SET status = 'closed' WHERE card_id = ?", [cardId]);

export async function clearCardCacheForUser(userId) {
  const r = await q("SELECT slug FROM cards WHERE user_id = ?", [userId]);
  await cacheDel(...r.map((x) => `card:${x.slug}`));
}
