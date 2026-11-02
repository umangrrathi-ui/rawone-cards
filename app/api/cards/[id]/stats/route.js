import { json } from "../../../../../lib/api";
import { handle } from "../../../../../lib/handler";
import { myCard } from "../../../../../lib/cardapi";
import { stats } from "../../../../../lib/cards";
import { limitsOf } from "../../../../../lib/plans";

export const GET = handle(async (req, ctx) => {
  const { user, card, res } = await myCard(ctx);
  if (res) return res;
  const want = Number(new URL(req.url).searchParams.get("days")) || 30;
  const max = limitsOf(user).statsDays;
  const days = Math.min([7, 30, 180, 360].includes(want) ? want : 30, max);
  return json({ ...(await stats(card.id, days)), maxDays: max });
});
