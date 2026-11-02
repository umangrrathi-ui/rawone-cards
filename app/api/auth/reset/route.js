import { body, clientIp, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { hit } from "../../../../lib/limiter";
import { isPwned, PWNED_MESSAGE } from "../../../../lib/pwned";
import { email as cleanEmail, passwordProblem } from "../../../../lib/validate";
import { hashPassword } from "../../../../lib/crypto";
import { checkCode, getUser, getUserAuth, updateUser } from "../../../../lib/users";
import { startSession } from "../../../../lib/auth";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  if (!(await hit(`reset:ip:${ip}`, 20, 900))) return tooMany();
  const b = await body(req);
  const email = cleanEmail(b.email);
  const bad = json({ error: "That code is wrong or has expired" }, 400);
  if (!email || !/^\d{6}$/.test(String(b.code || ""))) return bad;
  const pwErr = passwordProblem(b.password, email);
  if (pwErr) return json({ error: pwErr, errors: { password: pwErr } }, 400);
  if (await isPwned(b.password)) return json({ error: PWNED_MESSAGE, errors: { password: PWNED_MESSAGE } }, 400);
  const u = await getUserAuth(email);
  if (!u || u.status !== "active") return bad;
  const r = await checkCode(u.id, "reset", b.code);
  if (r === "locked") return json({ error: "Too many wrong codes. Ask for a new code." }, 400);
  if (r !== "ok") return bad;
  await updateUser(u.id, { pass_hash: hashPassword(b.password) }); // logs out every other device
  await startSession(await getUser(u.id));
  return json({ ok: true, next: "/dashboard" });
});
