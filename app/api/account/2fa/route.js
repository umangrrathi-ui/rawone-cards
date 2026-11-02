import QRCode from "qrcode";
import { body, json, tooMany } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { hit } from "../../../../lib/limiter";
import { currentUser, isStaff, startSession } from "../../../../lib/auth";
import { encrypt, newTotpSecret, totpOk } from "../../../../lib/crypto";
import { getUser, updateUser, audit } from "../../../../lib/users";
import { cacheGet, cacheSet, cacheDel } from "../../../../lib/redis";

// Staff 2FA setup: GET gives a new secret + QR, POST confirms it with a code.
const pending = (globalThis.__2fa ??= new Map());
const getPending = async (id) => (await cacheGet(`2fa:${id}`))?.s || pending.get(id);

export const GET = handle(async () => {
  const user = await currentUser();
  if (!user || !isStaff(user)) return json({ error: "Not allowed" }, 403);
  const s = newTotpSecret();
  await cacheSet(`2fa:${user.id}`, { s }, 600);
  pending.set(user.id, s);
  const uri = `otpauth://totp/RAWONE%20Cards:${encodeURIComponent(user.email)}?secret=${s}&issuer=RAWONE%20Cards`;
  const qr = await QRCode.toString(uri, { type: "svg", margin: 1 });
  return json({ secret: s, qr });
});

export const POST = handle(async (req) => {
  const user = await currentUser();
  if (!user || !isStaff(user)) return json({ error: "Not allowed" }, 403);
  if (!(await hit(`2fa:${user.id}`, 10, 900))) return tooMany();
  const b = await body(req);
  const s = await getPending(user.id);
  if (!s || !totpOk(s, String(b.code || "").trim())) return json({ error: "That code didn't match. Try the newest one." }, 400);
  await updateUser(user.id, { totp_secret: encrypt(s) });
  await cacheDel(`2fa:${user.id}`);
  pending.delete(user.id);
  await audit(user.id, "2fa_on", `user:${user.id}`);
  await startSession(await getUser(user.id));
  return json({ ok: true, next: "/admin" });
});
