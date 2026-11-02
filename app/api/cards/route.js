import { body, json, tooMany } from "../../../lib/api";
import { handle } from "../../../lib/handler";
import { hit } from "../../../lib/limiter";
import { need } from "../../../lib/auth";
import { countMyCards, createCard, listMyCards, slugTaken } from "../../../lib/cards";
import { limitsOf } from "../../../lib/plans";
import { cleanData, cleanStyle, slugProblem, themeOk } from "../../../lib/validate";
import { randomId } from "../../../lib/crypto";
import { THEMES } from "../../../lib/themes";

export const GET = handle(async () => {
  const { user, res } = await need();
  if (res) return res;
  return json({ cards: await listMyCards(user.id) });
});

function baseSlug(name) {
  const s = String(name || "")
    .toLowerCase()
    .replace(/^(dr|ca|adv|ar|prof|mr|mrs|ms)\.?\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return s.length >= 3 ? s : `card-${randomId(5)}`;
}

export const POST = handle(async (req) => {
  const { user, res } = await need();
  if (res) return res;
  if (!(await hit(`newcard:${user.id}`, 10, 86400))) return tooMany();
  if ((await countMyCards(user.id)) >= limitsOf(user).cards)
    return json({ error: "You've reached your plan's card limit. Upgrade to Pro for more cards." }, 403);
  const b = await body(req);
  const theme = themeOk(b.theme) ? b.theme : THEMES[0].id;
  const { data } = cleanData({ name: user.name, ...(b.data || {}) });
  let slug = baseSlug(data.name);
  for (let i = 0; i < 6 && (slugProblem(slug) || (await slugTaken(slug))); i++) slug = `${baseSlug(data.name).slice(0, 30)}-${randomId(4)}`;
  const r = await createCard(user.id, { slug, theme, data, style: cleanStyle({}) });
  if (r.error) return json({ error: "Could not create the card. Try again." }, 409);
  return json({ id: r.id }, 201);
});
