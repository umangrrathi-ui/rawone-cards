import { body, clientIp, json } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { email as cleanEmail } from "../../../../lib/validate";
import { getUserAuth } from "../../../../lib/users";
import { sendCode } from "../../../../lib/codes";

// Always answers the same way, whether or not the email exists.
export const POST = handle(async (req) => {
  const b = await body(req);
  const email = cleanEmail(b.email);
  const purpose = b.purpose === "reset" ? "reset" : "verify";
  if (email) {
    const u = await getUserAuth(email);
    if (u && ((purpose === "verify" && u.status === "pending") || (purpose === "reset" && u.status === "active"))) {
      await sendCode(u, purpose, clientIp(req));
    }
  }
  return json({ ok: true });
});
