import { body, json, toId } from "../../../../../lib/api";
import { handle } from "../../../../../lib/handler";
import { need } from "../../../../../lib/auth";
import { audit, getUser, updateUser } from "../../../../../lib/users";
import { clearCardCacheForUser } from "../../../../../lib/cards";

// Admin only: block/unblock and manual Pro (Phase 1 has no payment gateway).
export const PUT = handle(async (req, ctx) => {
  const { user: me, res } = await need({ admin: true });
  if (res) return res;
  const id = toId((await ctx.params).id);
  const target = id ? await getUser(id) : null;
  if (!target) return json({ error: "Not found" }, 404);
  if (target.id === me.id) return json({ error: "You can't change your own account here" }, 400);
  const b = await body(req);
  const f = {};
  if (b.status !== undefined) {
    if (!["active", "blocked"].includes(b.status) || target.status === "pending") return json({ error: "Bad status" }, 400);
    f.status = b.status;
  }
  if (b.plan !== undefined) {
    if (b.plan === "free") Object.assign(f, { plan: "free", plan_until: null });
    else if (["pro", "top"].includes(b.plan) && /^\d{4}-\d{2}-\d{2}$/.test(String(b.until || ""))) Object.assign(f, { plan: b.plan, plan_until: new Date(`${b.until}T23:59:59Z`) });
    else return json({ error: "Pick a plan and an end date" }, 400);
  }
  await updateUser(target.id, f);
  await clearCardCacheForUser(target.id);
  await audit(me.id, "user_update", `user:${target.id}`, { status: f.status, plan: f.plan, until: b.until });
  return json({ ok: true });
});
