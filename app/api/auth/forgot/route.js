import { body, clientIp, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { hit } from "../../../../lib/limiter";
import { email as cleanEmail } from "../../../../lib/validate";
import { getUserAuth } from "../../../../lib/users";
import { sendCode } from "../../../../lib/codes";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  if (!(await hit(`forgot:ip:${ip}`, 10, 3600))) return tooMany();
  const b = await body(req);
  const email = cleanEmail(b.email);
  if (email) {
    const u = await getUserAuth(email);
    if (u && u.status === "active") await sendCode(u, "reset", ip);
  }
  return json({ ok: true });
});
