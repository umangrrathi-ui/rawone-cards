import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { q } from "./db";

// Two backends with one interface: MySQL (production) and a JSON file (STORE=file, local testing only).
const FILE = process.env.STORE === "file";

export function newCode() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(7);
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

const parse = (s) => {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

function rowToCard(r) {
  if (!r) return null;
  return {
    id: r.id,
    code: r.code,
    slug: r.slug,
    theme: r.theme,
    status: r.status,
    name: r.name,
    company: r.company || "",
    ...parse(r.data),
    photo: r.photo || "",
    logo: r.logo || "",
    createdAt: r.created_at,
  };
}

const SPLIT = ["id", "code", "slug", "theme", "status", "name", "company", "photo", "logo", "createdAt"];
function dataOf(card) {
  const d = {};
  for (const [k, v] of Object.entries(card)) if (!SPLIT.includes(k)) d[k] = v;
  return JSON.stringify(d);
}

/* ---------------- file backend ---------------- */
const DB_FILE = path.join(process.cwd(), "data", "dev-store.json");
function load() {
  if (!globalThis.__fileDb) {
    try {
      globalThis.__fileDb = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch {
      globalThis.__fileDb = { seq: 0, cards: [], events: [], leads: [] };
    }
  }
  return globalThis.__fileDb;
}
function save() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(globalThis.__fileDb));
}
const nextId = () => ++load().seq;
const now = () => new Date().toISOString();

/* ---------------- cards ---------------- */
export async function getCard(id) {
  if (FILE) return rowToCard(load().cards.find((c) => c.id === id));
  const r = await q("SELECT * FROM cards WHERE id = ?", [id]);
  return rowToCard(r[0]);
}

export async function getCardBySlug(slug) {
  if (FILE) return rowToCard(load().cards.find((c) => c.slug === slug));
  const r = await q("SELECT * FROM cards WHERE slug = ?", [slug]);
  return rowToCard(r[0]);
}

export async function getCardByCode(code) {
  if (FILE) return rowToCard(load().cards.find((c) => c.code === code));
  const r = await q("SELECT id, slug, status FROM cards WHERE code = ?", [code]);
  return r[0] || null;
}

export async function slugTaken(slug, exceptId = 0) {
  if (FILE) return load().cards.some((c) => c.slug === slug && c.id !== exceptId);
  const r = await q("SELECT id FROM cards WHERE slug = ? AND id <> ?", [slug, exceptId]);
  return r.length > 0;
}

export async function listCards() {
  const since = new Date(Date.now() - 30 * 864e5);
  if (FILE) {
    const db = load();
    return db.cards
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        code: c.code,
        theme: c.theme,
        status: c.status,
        name: c.name,
        company: c.company,
        views30: db.events.filter((e) => e.card_id === c.id && e.type === "view" && new Date(e.created_at) >= since).length,
        leads: db.leads.filter((l) => l.card_id === c.id).length,
      }))
      .sort((a, b) => b.id - a.id);
  }
  return q(
    `SELECT c.id, c.slug, c.code, c.theme, c.status, c.name, c.company,
       (SELECT COUNT(*) FROM card_events e WHERE e.card_id = c.id AND e.type = 'view' AND e.created_at >= ?) AS views30,
       (SELECT COUNT(*) FROM card_leads l WHERE l.card_id = c.id) AS leads
     FROM cards c ORDER BY c.id DESC`,
    [since]
  );
}

export async function createCard(card) {
  let code = newCode();
  if (FILE) {
    const db = load();
    while (db.cards.some((c) => c.code === code)) code = newCode();
    const row = {
      id: nextId(),
      code,
      slug: card.slug,
      theme: card.theme,
      status: card.status,
      name: card.name,
      company: card.company,
      data: dataOf(card),
      photo: card.photo,
      logo: card.logo,
      created_at: now(),
    };
    db.cards.push(row);
    save();
    return row.id;
  }
  for (let i = 0; i < 5; i++) {
    try {
      const r = await q(
        "INSERT INTO cards (code, slug, theme, status, name, company, data, photo, logo) VALUES (?,?,?,?,?,?,?,?,?)",
        [code, card.slug, card.theme, card.status, card.name, card.company, dataOf(card), card.photo || null, card.logo || null]
      );
      return r.insertId;
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY" && String(e.message).includes("code")) code = newCode();
      else throw e;
    }
  }
  throw new Error("could not allocate code");
}

export async function updateCard(id, card) {
  if (FILE) {
    const row = load().cards.find((c) => c.id === id);
    if (!row) return false;
    Object.assign(row, {
      slug: card.slug,
      theme: card.theme,
      status: card.status,
      name: card.name,
      company: card.company,
      data: dataOf(card),
      photo: card.photo,
      logo: card.logo,
    });
    save();
    return true;
  }
  const r = await q("UPDATE cards SET slug=?, theme=?, status=?, name=?, company=?, data=?, photo=?, logo=? WHERE id=?", [
    card.slug,
    card.theme,
    card.status,
    card.name,
    card.company,
    dataOf(card),
    card.photo || null,
    card.logo || null,
    id,
  ]);
  return r.affectedRows > 0;
}

export async function deleteCard(id) {
  if (FILE) {
    const db = load();
    db.cards = db.cards.filter((c) => c.id !== id);
    db.events = db.events.filter((e) => e.card_id !== id);
    db.leads = db.leads.filter((l) => l.card_id !== id);
    save();
    return;
  }
  await q("DELETE FROM cards WHERE id = ?", [id]);
}

/* ---------------- events ---------------- */
export async function addEvent(cardId, type, src, visitor) {
  if (FILE) {
    load().events.push({ id: nextId(), card_id: cardId, type, src, visitor, created_at: now() });
    save();
    return;
  }
  await q("INSERT INTO card_events (card_id, type, src, visitor) VALUES (?,?,?,?)", [cardId, type, src, visitor]);
}

export async function stats(cardId, days = 30) {
  const since = new Date(Date.now() - days * 864e5);
  let rows;
  if (FILE) {
    rows = load().events.filter((e) => e.card_id === cardId && new Date(e.created_at) >= since);
  } else {
    rows = await q("SELECT type, src, visitor, created_at FROM card_events WHERE card_id = ? AND created_at >= ?", [cardId, since]);
  }
  const off = Number(process.env.TZ_OFFSET_MIN || 330) * 60000;
  const byType = {};
  const bySrc = { nfc: 0, qr: 0, link: 0 };
  const visitors = new Set();
  const daily = {};
  for (const r of rows) {
    byType[r.type] = (byType[r.type] || 0) + 1;
    if (r.type === "view") {
      bySrc[r.src] = (bySrc[r.src] || 0) + 1;
      visitors.add(r.visitor);
      const d = new Date(new Date(r.created_at).getTime() + off).toISOString().slice(0, 10);
      daily[d] = (daily[d] || 0) + 1;
    }
  }
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() + off - i * 864e5).toISOString().slice(0, 10);
    series.push({ d, n: daily[d] || 0 });
  }
  return { days, byType, bySrc, unique: visitors.size, series };
}

/* ---------------- leads ---------------- */
export async function addLead(cardId, { name, phone, note }) {
  if (FILE) {
    const db = load();
    if (db.leads.some((l) => l.card_id === cardId && l.phone === phone)) return { dup: true };
    db.leads.push({ id: nextId(), card_id: cardId, name, phone, note, created_at: now() });
    save();
    return { dup: false };
  }
  try {
    await q("INSERT INTO card_leads (card_id, name, phone, note) VALUES (?,?,?,?)", [cardId, name, phone, note || null]);
    return { dup: false };
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return { dup: true };
    throw e;
  }
}

export async function listLeads(cardId) {
  if (FILE) return load().leads.filter((l) => l.card_id === cardId).sort((a, b) => b.id - a.id);
  return q("SELECT id, name, phone, note, created_at FROM card_leads WHERE card_id = ? ORDER BY id DESC LIMIT 2000", [cardId]);
}

export async function deleteLead(cardId, leadId) {
  if (FILE) {
    const db = load();
    db.leads = db.leads.filter((l) => !(l.card_id === cardId && l.id === leadId));
    save();
    return;
  }
  await q("DELETE FROM card_leads WHERE id = ? AND card_id = ?", [leadId, cardId]);
}

export async function dbOk() {
  if (FILE) return true;
  try {
    await q("SELECT 1");
    return true;
  } catch (e) {
    console.error("db", e.code || e.message);
    return false;
  }
}
