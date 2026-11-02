import { body, json, toId } from "../../../../../lib/api";
import { handle } from "../../../../../lib/handler";
import { need } from "../../../../../lib/auth";
import { adminSetCardStatus, closeReports } from "../../../../../lib/cards";
import { audit } from "../../../../../lib/users";

// Staff: block a card (e.g. after an abuse report) or restore it; close its reports.
export const PUT = handle(async (req, ctx) => {
  const { user: me, res } = await need({ staff: true });
  if (res) return res;
  const id = toId((await ctx.params).id);
  if (!id) return json({ error: "Not found" }, 404);
  const b = await body(req);
  if (b.status !== undefined) {
    if (!["blocked", "off"].includes(b.status)) return json({ error: "Bad status" }, 400);
    if (!(await adminSetCardStatus(id, b.status))) return json({ error: "Not found" }, 404);
  }
  if (b.closeReports) await closeReports(id);
  await audit(me.id, "card_update", `card:${id}`, { status: b.status, closeReports: !!b.closeReports });
  return json({ ok: true });
});
