import { body, clientIp, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { hit } from "../../../../lib/limiter";
import { turnstileOk } from "../../../../lib/turnstile";
import { isPwned, PWNED_MESSAGE } from "../../../../lib/pwned";
import { cleanName, email as cleanEmail, passwordProblem } from "../../../../lib/validate";
import { hashPassword } from "../../../../lib/crypto";
import { createUser, getUserAuth } from "../../../../lib/users";
import { adminEmails } from "../../../../lib/auth";
import { sendCode } from "../../../../lib/codes";
import { sendMail } from "../../../../lib/mail";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  if (!(await hit(`signup:ip:${ip}`, 5, 3600))) return tooMany();
  const b = await body(req);
  if (!(await turnstileOk(b.turnstile, ip))) return json({ error: "Please complete the check and try again" }, 400);

  const name = cleanName(b.name);
  const email = cleanEmail(b.email);
  const errors = {};
  if (!name) errors.name = "Add your name";
  if (!email) errors.email = "Enter a valid email";
  const pwErr = passwordProblem(b.password, email || "");
  if (pwErr) errors.password = pwErr;
  else if (await isPwned(b.password)) errors.password = PWNED_MESSAGE;
  if (Object.keys(errors).length) return json({ error: "Check the highlighted fields", errors }, 400);

  // Same answer whether or not the email exists (no account enumeration).
  const existing = await getUserAuth(email);
  if (existing) {
    if (existing.status === "pending") await sendCode(existing, "verify", ip);
    else if (existing.status === "active") {
      await sendMail({
        to: existing.email,
        subject: "You already have a RAWONE Cards account",
        text: `Hi ${existing.name},\n\nSomeone (maybe you) tried to sign up with this email. You already have an account, so just log in. If you forgot your password, use "Forgot password" on the login page.\n\nRAWONE Cards`,
      }).catch(() => {});
    }
    return json({ ok: true });
  }
  const role = adminEmails().includes(email) ? "admin" : "user";
  const id = await createUser({ email, name, passHash: hashPassword(b.password), role });
  if (id) await sendCode({ id, email, name }, "verify", ip);
  return json({ ok: true });
});
