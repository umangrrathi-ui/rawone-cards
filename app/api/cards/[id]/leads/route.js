import { json } from "../../../../../lib/api";
import { handle } from "../../../../../lib/handler";
import { myCard } from "../../../../../lib/cardapi";
import { listLeads } from "../../../../../lib/cards";

export const GET = handle(async (req, ctx) => {
  const { card, res } = await myCard(ctx);
  if (res) return res;
  return json({ leads: await listLeads(card.id) });
});
