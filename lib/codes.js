import { sixDigits, sha256 } from "./crypto";
import { hit } from "./limiter";
import { issueCode } from "./users";
import { codeMail, sendMail } from "./mail";

// Sends a 6-digit code, at most 3 per email per 15 min and 10 per IP per hour.
// Returns false when rate-limited (callers still answer generically).
export async function sendCode(user, purpose, ip) {
  const em = sha256(user.email).slice(0, 24);
  if (!(await hit(`code:e:${em}`, 3, 900)) || !(await hit(`code:ip:${ip}`, 10, 3600))) return false;
  const code = sixDigits();
  await issueCode(user.id, purpose, code);
  await sendMail({ to: user.email, ...codeMail(purpose, user.name, code) });
  return true;
}
