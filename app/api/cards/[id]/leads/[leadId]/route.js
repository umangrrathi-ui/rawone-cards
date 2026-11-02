import { json, toId } from "../../../../../../lib/api";
import { handle } from "../../../../../../lib/handler";
import { myCard } from "../../../../../../lib/cardapi";
import { deleteLead } from "../../../../../../lib/cards";

export const DELETE = handle(async (req, ctx) => {
  const { card, res } = await myCard(ctx);
  if (res) return res;
  const leadId = toId((await ctx.params).leadId);
  if (!leadId) return json({ error: "Not found" }, 404);
  await deleteLead(card.id, leadId);
  return json({ ok: true });
});
