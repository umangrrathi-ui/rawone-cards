import { body, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { hit } from "../../../../lib/limiter";
import { endSession, need } from "../../../../lib/auth";
import { verifyPassword } from "../../../../lib/crypto";
import { deleteUser, getUserSecret } from "../../../../lib/users";
import { clearCardCacheForUser, listMyCards, getMyCard } from "../../../../lib/cards";
import { del } from "../../../../lib/media";

// Deletes the account, cards, leads, stats and uploaded images.
export const POST = handle(async (req) => {
  const { user, res } = await need();
  if (res) return res;
  if (!(await hit(`del:${user.id}`, 5, 900))) return tooMany();
  const b = await body(req);
  const sec = await getUserSecret(user.id);
  if (!verifyPassword(b.password, sec.pass_hash)) return json({ error: "Password is wrong", errors: { password: "Password is wrong" } }, 400);
  const cards = await listMyCards(user.id);
  for (const c of cards) {
    const full = await getMyCard(user.id, c.id);
    await del(full.photoKey);
    await del(full.logoKey);
  }
  await clearCardCacheForUser(user.id);
  await deleteUser(user.id);
  await endSession();
  return json({ ok: true });
});
