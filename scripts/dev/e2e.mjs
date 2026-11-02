// End-to-end check against a running dev server (local MySQL + Redis).
// Usage: node scripts/dev/e2e.mjs <dev-log-file>   (reads dev OTP mails from the server log)
import fs from "node:fs";
import crypto from "node:crypto";

const BASE = process.env.E2E_BASE || "http://localhost:3000";
const LOG = process.argv[2] || "/tmp/dev2.log";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const run = Date.now().toString(36);
let passed = 0;
const fails = [];
const ok = (cond, name, extra = "") => {
  if (cond) passed++;
  else fails.push(`${name} ${extra}`);
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : " " + extra}`);
};

function client() {
  let cookie = "";
  return async (path, { method = "GET", body, headers = {}, raw = false, redirect = "manual" } = {}) => {
    const h = { "user-agent": UA, origin: BASE, ...headers };
    if (cookie) h.cookie = cookie;
    if (body !== undefined && !h["content-type"]) h["content-type"] = "application/json";
    const r = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body), redirect });
    const sc = r.headers.getSetCookie?.() || [];
    for (const c of sc) if (c.startsWith("rc_s=")) cookie = c.split(";")[0].endsWith("=") ? "" : c.split(";")[0];
    if (raw) return r;
    let j = {};
    try {
      j = await r.json();
    } catch {}
    return { status: r.status, j };
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function codeFor(email) {
  for (let i = 0; i < 20; i++) {
    const log = fs.readFileSync(LOG, "utf8");
    const parts = log.split("[dev mail] to=").filter((p) => p.startsWith(email));
    if (parts.length) {
      const m = /Use (\d{6})/.exec(parts.at(-1));
      if (m) return m[1];
    }
    await sleep(300);
  }
  return null;
}

// RFC 6238 for the admin 2FA test
function totp(secret) {
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, val = 0;
  const out = [];
  for (const ch of secret) {
    val = (val << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac("sha1", Buffer.from(out)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, "0");
}

async function signup(api, email, name) {
  const s = await api("/api/auth/signup", { method: "POST", body: { name, email, password: "Correct-Horse-42!" } });
  ok(s.status === 200, `signup ${email}`, JSON.stringify(s));
  const code = await codeFor(email);
  ok(!!code, `OTP mail for ${email}`);
  const wrong = await api("/api/auth/verify", { method: "POST", body: { email, code: code === "000000" ? "111111" : "000000" } });
  ok(wrong.status === 400, "wrong OTP rejected");
  const v = await api("/api/auth/verify", { method: "POST", body: { email, code } });
  ok(v.status === 200 && v.j.next === "/dashboard", "verify OTP logs in", JSON.stringify(v));
}

const A = client();
const B = client();
const ADM = client();
const anon = client();
const emailA = `a-${run}@example.com`;
const emailB = `b-${run}@example.com`;

// ---------- auth ----------
const weak = await anon("/api/auth/signup", { method: "POST", body: { name: "X", email: `w-${run}@example.com`, password: "password123" } });
ok(weak.status === 400 && weak.j.errors?.password, "weak password refused");
await signup(A, emailA, "Asha Mehta");
const me = await A("/api/cards");
ok(me.status === 200 && Array.isArray(me.j.cards) && me.j.cards.length === 0, "new user has no cards");
const dupe = await anon("/api/auth/signup", { method: "POST", body: { name: "Other", email: emailA, password: "Another-Pass-77" } });
ok(dupe.status === 200, "signup with existing email answers the same (no enumeration)");

// ---------- cards ----------
const c1 = await A("/api/cards", { method: "POST", body: {} });
ok(c1.status === 201 && c1.j.id, "create card", JSON.stringify(c1));
const id = c1.j.id;
const c2 = await A("/api/cards", { method: "POST", body: {} });
ok(c2.status === 403, "Free plan limited to 1 card");
const bad = await A(`/api/cards/${id}`, { method: "PUT", body: { data: { name: "Asha Mehta", email: "not-an-email", website: "javascript:alert(1)" } } });
ok(bad.status === 400 && bad.j.errors?.email && bad.j.errors?.website, "invalid email and javascript: URL refused");
const reserved = await A(`/api/cards/${id}`, { method: "PUT", body: { slug: "admin" } });
ok(reserved.status === 400 && reserved.j.errors?.slug, "reserved slug refused");
const phish = await A(`/api/cards/${id}`, { method: "PUT", body: { slug: "hdfc-kyc-help" } });
ok(phish.status === 400, "phishing-like slug refused");
const slug = `asha-${run}`;
const save = await A(`/api/cards/${id}`, {
  method: "PUT",
  body: {
    theme: "clinic",
    slug,
    data: { name: "Dr. Asha Mehta", title: "Physician", company: "Mehta Clinic", phone: "98250 12345", whatsapp: "+91 98250 12345", email: "asha@example.com", website: "mehta.example.com", instagram: "@asha.mehta", address: "Satellite, Ahmedabad", unknownKey: "<script>" },
    style: { brand: "#7a1f2b", bg1: "#fdf2f4", bg2: "#f1d6e1", fx: "wave", motion: "still", evil: "x" },
    status: "live",
  },
});
ok(save.status === 200 && save.j.card.status === "live", "save + publish", JSON.stringify(save.j).slice(0, 200));
ok(save.j.card.data.phone === "+919825012345" && save.j.card.data.instagram === "asha.mehta", "phone + instagram normalised");
ok(!("unknownKey" in save.j.card.data) && !("evil" in save.j.card.style), "unknown keys dropped");
ok(save.j.card.data.website === "https://mehta.example.com/", "website gets https");

// photo upload: a real PNG made on the fly
const sharp = (await import("sharp")).default;
const png = await sharp({ create: { width: 600, height: 800, channels: 3, background: { r: 120, g: 160, b: 200 } } }).png().toBuffer();
const up = await A(`/api/cards/${id}/upload`, { method: "POST", body: { kind: "photo", image: `data:image/png;base64,${png.toString("base64")}` } });
ok(up.status === 200 && up.j.view.photo.startsWith("/media/p/"), "photo upload re-encoded", JSON.stringify(up).slice(0, 200));
const fake = await A(`/api/cards/${id}/upload`, { method: "POST", body: { kind: "photo", image: `data:image/png;base64,${Buffer.from("<svg onload=alert(1)>").toString("base64")}` } });
ok(fake.status === 400, "non-image upload refused");
const img = await anon(up.j.view.photo, { raw: true });
ok(img.status === 200 && img.headers.get("content-type") === "image/jpeg", "photo served as JPEG");
// privacy: a phone photo carries GPS and camera details. The stored copy must have none.
const geo = await sharp({ create: { width: 800, height: 1000, channels: 3, background: "#456" } })
  .withExif({ IFD0: { Copyright: "private-owner" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "23/1 1/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "72/1 34/1 0/1" } })
  .jpeg().toBuffer();
ok(!!(await sharp(geo).metadata()).exif, "test photo really carries GPS/EXIF");
const upGeo = await A(`/api/cards/${id}/upload`, { method: "POST", body: { kind: "photo", image: `data:image/jpeg;base64,${geo.toString("base64")}` } });
const storedGeo = Buffer.from(await (await anon(upGeo.j.view.photo, { raw: true })).arrayBuffer());
ok(upGeo.status === 200 && !(await sharp(storedGeo).metadata()).exif, "GPS and camera data are stripped from stored photos");
// a tiny file that would unpack to a huge picture must be refused, not crash the server
const bomb = await sharp({ create: { width: 7500, height: 7500, channels: 3, background: "#000" } }).png({ compressionLevel: 9 }).toBuffer();
const upBomb = bomb.length < 3 * 1024 * 1024 ? await A(`/api/cards/${id}/upload`, { method: "POST", body: { kind: "photo", image: `data:image/png;base64,${bomb.toString("base64")}` } }) : { status: 400 };
ok(upBomb.status === 400 || upBomb.status === 413, "oversized-pixel image is refused cleanly", String(upBomb.status));

// ---------- public ----------
const page = await anon(`/${slug}`, { raw: true });
const html = await page.text();
ok(page.status === 200 && html.includes("Dr. Asha Mehta"), "public card renders");
ok(!html.includes("&lt;script&gt;") && !html.includes("<script>alert"), "no injected script in page");
const card = (await A(`/api/cards/${id}`)).j;
const nfc = await anon(`/n/${card.card.code}`, { raw: true });
ok(nfc.status === 302 && nfc.headers.get("location").endsWith(`/${slug}?s=n`), "NFC link redirects", nfc.headers.get("location"));
await anon("/api/t", { method: "POST", body: { slug, type: "view", src: "nfc" } });
await anon("/api/t", { method: "POST", body: { slug, type: "save", src: "nfc" } });
await anon("/api/t", { method: "POST", body: { slug, type: "view", src: "qr" } });
const bot = await anon("/api/t", { method: "POST", body: { slug, type: "view", src: "qr" }, headers: { "user-agent": "curl/8.0" } });
ok(bot.status === 200, "bot tracking ignored quietly");
const st = await A(`/api/cards/${id}/stats?days=7`);
ok(st.j.bySrc?.nfc === 1 && st.j.bySrc?.qr === 1 && st.j.byType?.save === 1, "stats count NFC, QR, saves", JSON.stringify(st.j.bySrc));
const st365 = await A(`/api/cards/${id}/stats?days=360`);
ok(st365.j.days === 30, "Free plan stats capped at 30 days");
const vcf = await anon(`/api/vcard/${slug}`, { raw: true });
const vtext = await vcf.text();
ok(vcf.status === 200 && vtext.includes("BEGIN:VCARD") && vtext.includes("FN:Dr. Asha Mehta") && vtext.includes("PHOTO;ENCODING=b;TYPE=JPEG"), "vCard with photo");

// ---------- leads ----------
const noConsent = await anon("/api/lead", { method: "POST", body: { slug, name: "Ravi", phone: "9898989898" } });
ok(noConsent.status === 400, "lead without consent refused");
const lead = await anon("/api/lead", { method: "POST", body: { slug, name: "=HYPERLINK(\"x\")", phone: "9898989898", note: "Call me", consent: true } });
ok(lead.status === 200, "lead saved with consent");
const leads = await A(`/api/cards/${id}/leads`);
ok(leads.j.leads?.length === 1 && leads.j.leads[0].phone === "+919898989898", "owner sees the lead");
const csv = await A(`/api/cards/${id}/leads/csv`);
ok(csv.status === 403, "CSV export blocked on Free");

// ---------- isolation (IDOR) ----------
await signup(B, emailB, "Bhavin Shah");
for (const [m, p] of [["GET", `/api/cards/${id}`], ["PUT", `/api/cards/${id}`], ["DELETE", `/api/cards/${id}`], ["GET", `/api/cards/${id}/leads`], ["GET", `/api/cards/${id}/stats`], ["POST", `/api/cards/${id}/upload`]]) {
  const r = await B(p, { method: m, body: m === "GET" || m === "DELETE" ? undefined : {} });
  ok(r.status === 404, `other user can't ${m} ${p.replace(String(id), ":id")}`, String(r.status));
}
const noAuth = await anon(`/api/cards/${id}`);
ok(noAuth.status === 401, "logged-out access refused");

// ---------- CSRF / content type ----------
const cross = await A(`/api/cards/${id}`, { method: "PUT", body: { theme: "graphite" }, headers: { origin: "https://evil.example" } });
ok(cross.status === 403, "cross-site write blocked");
const form = await A("/api/cards", { method: "POST", body: "a=1", headers: { "content-type": "application/x-www-form-urlencoded" } });
ok(form.status === 415, "non-JSON write refused");

// ---------- brute force ----------
let last = 0;
for (let i = 0; i < 12; i++) last = (await anon("/api/auth/login", { method: "POST", body: { email: emailB, password: "wrong-password-xx" } })).status;
ok(last === 429, "login locked after repeated failures", String(last));

// ---------- admin + 2FA ----------
const adminEmail = "admin@example.com";
const exists = await ADM("/api/auth/login", { method: "POST", body: { email: adminEmail, password: "Correct-Horse-42!" } });
if (exists.status !== 200) await signup(ADM, adminEmail, "RAWONE Admin");
let adm = await ADM("/api/admin/users");
if (adm.status === 403) {
  const setup = await ADM("/api/account/2fa");
  ok(!!setup.j.secret, "2FA setup gives a secret");
  const on = await ADM("/api/account/2fa", { method: "POST", body: { code: totp(setup.j.secret) } });
  ok(on.status === 200, "2FA turned on");
  adm = await ADM("/api/admin/users");
} else if (exists.j?.need2fa) ok(true, "admin login asks for 2FA");
ok(adm.status === 200, "admin can list users after 2FA", String(adm.status));
const userA = adm.j.users?.find((u) => u.email === emailA);
const until = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const pro = await ADM(`/api/admin/users/${userA?.id}`, { method: "PUT", body: { plan: "pro", until } });
ok(pro.status === 200, "admin sets Pro manually");
const top = await ADM(`/api/admin/users/${userA?.id}`, { method: "PUT", body: { plan: "top", until } });
ok(top.status === 200, "admin sets Top manually");
const st180 = await A(`/api/cards/${id}/stats?days=360`);
ok(st180.j.days === 360, "Top plan can see 360 days of stats");
const c3 = await A("/api/cards", { method: "POST", body: {} });
ok(c3.status === 201, "Pro user can create a second card");
const cur = await A(`/api/cards/${id}`);
ok(typeof cur.j.card.rev === "string" && cur.j.card.rev.length === 16, "card carries a revision");
const okSave = await A(`/api/cards/${id}`, { method: "PUT", body: { style: { logoSize: 400, photoZoom: 10, photoY: 70, dayNight: true }, rev: cur.j.card.rev } });
ok(okSave.status === 200 && okSave.j.card.style.logoSize === 160 && okSave.j.card.style.photoZoom === 80 && okSave.j.card.style.photoY === 70 && okSave.j.card.style.dayNight === true, "photo/logo adjustments are clamped and saved");
const stale = await A(`/api/cards/${id}`, { method: "PUT", body: { data: { name: "Old tab" }, rev: cur.j.card.rev } });
ok(stale.status === 409 && stale.j.conflict === true, "a stale tab can't overwrite newer edits");
const csv2 = await A(`/api/cards/${id}/leads/csv`, { raw: true });
const csvText = await csv2.text();
ok(csv2.status === 200 && csvText.includes("'=HYPERLINK"), "CSV escapes formula cells");
const notAdmin = await A("/api/admin/users");
ok(notAdmin.status === 403, "normal user can't open admin API");

// report + block
const rep = await anon("/api/report", { method: "POST", body: { slug, reason: "fake", note: "test" } });
ok(rep.status === 200, "visitor can report a card");
const reps = await ADM("/api/admin/reports");
ok(reps.j.reports?.some((r) => r.slug === slug), "report reaches admin");
await ADM(`/api/admin/cards/${id}`, { method: "PUT", body: { status: "blocked", closeReports: true } });
const blocked = await anon(`/${slug}`, { raw: true });
ok(blocked.status === 404, "blocked card is gone from public");
const unblockTry = await A(`/api/cards/${id}`, { method: "PUT", body: { status: "live" } });
ok(unblockTry.status === 400, "owner can't unblock a blocked card");

// ---------- headers ----------
const h = (await anon("/login", { raw: true })).headers;
ok(/default-src 'self'/.test(h.get("content-security-policy") || ""), "CSP header");
ok(h.get("x-content-type-options") === "nosniff" && !!h.get("strict-transport-security"), "nosniff + HSTS");
ok(!h.get("x-powered-by"), "no x-powered-by");

// ---------- account delete ----------
const delB = await B("/api/account/delete", { method: "POST", body: { password: "Correct-Horse-42!" } });
ok(delB.status === 200, "user can delete account");
const after = await B("/api/cards");
ok(after.status === 401, "deleted user is logged out");

console.log(`\n${passed} passed, ${fails.length} failed`);
if (fails.length) {
  console.log(fails.join("\n"));
  process.exit(1);
}
