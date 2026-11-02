import { json, toId } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { need } from "../../../../lib/auth";
import { hit } from "../../../../lib/limiter";
import { getMyCard, slugTaken } from "../../../../lib/cards";
import { slugProblem } from "../../../../lib/validate";

// Live "is this link free?" check for the editor. Owner-only and rate limited so it can't be used to list names.
export const GET = handle(async (req) => {
  const { user, res } = await need();
  if (res) return res;
  if (!(await hit(`slugcheck:${user.id}`, 90, 600))) return json({ ok: false, reason: "Slow down a little" }, 429);
  const u = new URL(req.url);
  const s = String(u.searchParams.get("s") || "").toLowerCase();
  const id = toId(u.searchParams.get("id"));
  const card = id ? await getMyCard(user.id, id) : null;
  if (!card) return json({ error: "Not found" }, 404);
  if (s === card.slug) return json({ ok: true, same: true });
  const problem = slugProblem(s);
  if (problem) return json({ ok: false, reason: problem });
  if (await slugTaken(s, card.id)) return json({ ok: false, reason: "That link is taken. Try another." });
  return json({ ok: true });
});
