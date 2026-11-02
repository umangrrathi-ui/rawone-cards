import { body, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { hit } from "../../../../lib/limiter";
import { need, startSession } from "../../../../lib/auth";
import { hashPassword, verifyPassword } from "../../../../lib/crypto";
import { passwordProblem } from "../../../../lib/validate";
import { getUser, getUserSecret, updateUser } from "../../../../lib/users";

export const POST = handle(async (req) => {
  const { user, res } = await need();
  if (res) return res;
  if (!(await hit(`pw:${user.id}`, 10, 900))) return tooMany();
  const b = await body(req);
  const sec = await getUserSecret(user.id);
  if (!verifyPassword(b.current, sec.pass_hash)) return json({ error: "Current password is wrong", errors: { current: "Current password is wrong" } }, 400);
  const p = passwordProblem(b.next, user.email);
  if (p) return json({ error: p, errors: { next: p } }, 400);
  await updateUser(user.id, { pass_hash: hashPassword(b.next) }); // other devices logged out
  await startSession(await getUser(user.id));
  return json({ ok: true });
});
