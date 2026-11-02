import { json, toId } from "./api";
import { need } from "./auth";
import { getMyCard } from "./cards";

// Owner guard: logged in + the card id belongs to this user (IDOR check in SQL).
export async function myCard(ctx) {
  const { user, res } = await need();
  if (res) return { res };
  const { id } = await ctx.params;
  const cid = toId(id);
  if (!cid) return { res: json({ error: "Not found" }, 404) };
  const card = await getMyCard(user.id, cid);
  if (!card) return { res: json({ error: "Not found" }, 404) };
  return { user, card };
}
