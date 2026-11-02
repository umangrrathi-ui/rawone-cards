import { body, clientIp, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { hit } from "../../../../lib/limiter";
import { email as cleanEmail } from "../../../../lib/validate";
import { checkCode, getUser, getUserAuth, updateUser } from "../../../../lib/users";
import { startSession } from "../../../../lib/auth";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  if (!(await hit(`verify:ip:${ip}`, 20, 900))) return tooMany();
  const b = await body(req);
  const email = cleanEmail(b.email);
  const bad = json({ error: "That code is wrong or has expired" }, 400);
  if (!email || !/^\d{6}$/.test(String(b.code || ""))) return bad;
  const u = await getUserAuth(email);
  if (!u || u.status !== "pending") return bad;
  const r = await checkCode(u.id, "verify", b.code);
  if (r === "locked") return json({ error: "Too many wrong codes. Ask for a new code." }, 400);
  if (r !== "ok") return bad;
  await updateUser(u.id, { status: "active", last_login_at: new Date() });
  await startSession(await getUser(u.id));
  return json({ ok: true, next: "/dashboard" });
});
