import { body, isBot, json, visitorId } from "../../../lib/api";
import { hit } from "../../../lib/limiter";
import { addEvent, cardIdBySlug, EVENT_TYPES } from "../../../lib/cards";

// Card analytics beacon. Never fails loudly: tracking must not break the card.
export async function POST(req) {
  try {
    if (isBot(req)) return json({ ok: true });
    const b = await body(req, 2048);
    const slug = String(b.slug || "");
    const type = String(b.type || "");
    const src = ["nfc", "qr", "link"].includes(b.src) ? b.src : "link";
    if (!/^[a-z0-9-]{3,40}$/.test(slug) || !EVENT_TYPES.includes(type)) return json({ ok: true });
    const v = visitorId(req);
    if (!(await hit(`t:${v}`, 30, 60))) return json({ ok: true });
    const id = await cardIdBySlug(slug);
    if (id) await addEvent(id, type, src, v);
  } catch (e) {
    console.error("track", e.message);
  }
  return json({ ok: true });
}
