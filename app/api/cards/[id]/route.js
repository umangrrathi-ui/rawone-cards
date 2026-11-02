import { body, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { hit } from "../../../../lib/limiter";
import { myCard } from "../../../../lib/cardapi";
import { cardRev, deleteMyCard, toView, updateMyCard, slugTaken } from "../../../../lib/cards";
import { cleanData, cleanStyle, slugProblem, themeOk } from "../../../../lib/validate";
import { del } from "../../../../lib/media";
import { baseUrl } from "../../../../lib/api";

const out = (card, user) => ({
  card: { id: card.id, slug: card.slug, code: card.code, theme: card.theme, status: card.status, data: card.data, style: card.style, rev: cardRev(card) },
  view: toView(card, user),
  links: { page: `${baseUrl()}/${card.slug}`, nfc: `${baseUrl()}/n/${card.code}`, qr: `${baseUrl()}/q/${card.code}` },
});

export const GET = handle(async (req, ctx) => {
  const { user, card, res } = await myCard(ctx);
  if (res) return res;
  return json(out(card, user));
});

export const PUT = handle(async (req, ctx) => {
  const { user, card, res } = await myCard(ctx);
  if (res) return res;
  if (!(await hit(`save:${user.id}`, 900, 3600))) return tooMany();
  const b = await body(req);
  // Another tab or device saved since this editor loaded: refuse, so an old tab can't wipe newer edits.
  if (b.rev && b.rev !== cardRev(card)) {
    return json({ error: "This card was changed in another tab or on another device. Reload this page to see the latest version.", conflict: true }, 409);
  }
  const fields = {};
  const errors = {};
  if ("theme" in b) {
    if (!themeOk(b.theme)) errors.theme = "Pick a design";
    else fields.theme = b.theme;
  }
  if ("data" in b) {
    const r = cleanData(b.data);
    Object.assign(errors, r.errors);
    fields.data = r.data;
  }
  if ("style" in b) fields.style = cleanStyle(b.style);
  if ("slug" in b && b.slug !== card.slug) {
    const s = String(b.slug || "").toLowerCase();
    const p = slugProblem(s);
    if (p) errors.slug = p;
    else if (await slugTaken(s, card.id)) errors.slug = "That link is taken. Try another.";
    else fields.slug = s;
  }
  if ("status" in b) {
    if (!["draft", "live", "off"].includes(b.status)) errors.status = "Unknown status";
    else if (card.status === "blocked") errors.status = "This card was blocked by RAWONE. Contact support@rawone.in.";
    else fields.status = b.status;
  }
  if (fields.status === "live" && !(fields.data || card.data).name) errors.name = "Add a name before publishing";
  if (Object.keys(errors).length) return json({ error: "Check the highlighted fields", errors }, 400);
  const r = await updateMyCard(user.id, card.id, fields);
  if (r.error === "slug") return json({ error: "That link is taken. Try another.", errors: { slug: "That link is taken" } }, 409);
  if (r.error) return json({ error: "Not found" }, 404);
  return json(out(r.card, user));
});

export const DELETE = handle(async (req, ctx) => {
  const { user, card, res } = await myCard(ctx);
  if (res) return res;
  await deleteMyCard(user.id, card.id);
  await del(card.photoKey);
  await del(card.logoKey);
  return json({ ok: true });
});
