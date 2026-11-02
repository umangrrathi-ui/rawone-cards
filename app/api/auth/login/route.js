import { body, clientIp, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { count, hit, reset } from "../../../../lib/limiter";
import { turnstileOk } from "../../../../lib/turnstile";
import { email as cleanEmail } from "../../../../lib/validate";
import { decrypt, fakeVerify, sha256, totpOk, verifyPassword } from "../../../../lib/crypto";
import { getUser, getUserAuth, updateUser } from "../../../../lib/users";
import { isStaff, startSession } from "../../../../lib/auth";
import { sendCode } from "../../../../lib/codes";

const WIN = 900; // 15 min
const WRONG = "Wrong email or password";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  const b = await body(req);
  const email = cleanEmail(b.email) || "";
  const acct = sha256(email).slice(0, 24);

  // Brute-force brakes (playbook 4.1): account+IP 10, IP 20, account 50, global 300 per 15 min.
  const [ai, i, a, g] = await Promise.all([count(`lf:ai:${acct}:${ip}`), count(`lf:ip:${ip}`), count(`lf:a:${acct}`), count("lf:all")]);
  if (ai >= 10 || i >= 20 || a >= 50 || g >= 300) return tooMany();
  if (i >= 3 && !(await turnstileOk(b.turnstile, ip))) return json({ error: "Please complete the check", needTurnstile: true }, 400);

  const failed = async (msg = WRONG) => {
    await Promise.all([hit(`lf:ai:${acct}:${ip}`, 1e9, WIN), hit(`lf:ip:${ip}`, 1e9, WIN), hit(`lf:a:${acct}`, 1e9, WIN), hit("lf:all", 1e9, WIN)]);
    return json({ error: msg, needTurnstile: i + 1 >= 3 }, 401);
  };

  const u = email ? await getUserAuth(email) : null;
  if (!u) {
    fakeVerify(b.password);
    return failed();
  }
  if (!verifyPassword(b.password, u.pass_hash)) return failed();

  if (u.status === "blocked") return json({ error: "This account is blocked. Contact support@rawone.in." }, 403);
  if (u.status === "pending") {
    await sendCode(u, "verify", ip);
    return json({ ok: true, next: `/verify?email=${encodeURIComponent(u.email)}` });
  }
  if (u.totp_secret) {
    if (!b.code) return json({ need2fa: true });
    if (!totpOk(decrypt(u.totp_secret), String(b.code).trim())) return failed("Wrong authenticator code");
  }

  await reset(`lf:ai:${acct}:${ip}`);
  await updateUser(u.id, { last_login_at: new Date() });
  const user = await getUser(u.id);
  await startSession(user);
  return json({ ok: true, next: isStaff(user) ? "/admin" : "/dashboard" });
});
