import { THEME_IDS } from "./themes";
import { HEX } from "./color";

// Whitelist-only validation. Unknown keys are dropped; every string is length-capped.

const str = (v, n) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, n);

export function phone(v) {
  let s = String(v ?? "").replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s.startsWith("+91")) s = s.slice(3);
  else if (s.startsWith("0091")) s = s.slice(4);
  else if (s.length === 11 && s.startsWith("0")) s = s.slice(1);
  else if (s.length === 12 && s.startsWith("91")) s = s.slice(2);
  if (/^[6-9]\d{9}$/.test(s)) return `+91${s}`;
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

export function url(v) {
  const s = str(v, 300);
  if (!s) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function email(v) {
  const s = str(v, 160).toLowerCase();
  if (!s) return "";
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(s) ? s : null;
}

// username on a social network: letters, digits, dot, underscore, hyphen
function handle(v, re = /^[A-Za-z0-9._-]{1,60}$/) {
  let s = str(v, 200);
  if (!s) return "";
  s = s.replace(/^https?:\/\/(www\.)?[^/]+\//i, "").replace(/^@/, "").replace(/^(in|company|channel|c)\//, "").split(/[/?#]/)[0];
  return re.test(s) ? s : null;
}

/* ---------- slugs ---------- */
const RESERVED = new Set(
  (
    "admin api app login logout signup register verify forgot reset dashboard settings account showroom privacy terms n q media " +
    "help support about pricing contact blog rawone rawonelabs www mail email card cards static assets _next favicon.ico robots.txt " +
    "sitemap.xml health status root owner security billing pay payment upi " +
    "sbi hdfc icici axis kotak yesbank pnb bob canara paytm phonepe gpay googlepay bhim npci rbi sebi uidai aadhaar pan incometax gst " +
    "google facebook instagram whatsapp meta amazon flipkart apple microsoft government gov police"
  ).split(/\s+/)
);
const RISKY = /(bank|kyc|official|helpdesk|customercare|refund|lottery|verify|password|login)/;

export function slugProblem(s) {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(s) || s.includes("--")) return "Use 3–40 lowercase letters, numbers or single hyphens";
  if (RESERVED.has(s) || RISKY.test(s)) return "That link name isn't available";
  return null;
}

/* ---------- card details ---------- */
export const ACTION_KEYS = ["call", "whatsapp", "maps", "email", "instagram", "website", "linkedin", "facebook", "youtube", "x"];

export function cleanData(input = {}) {
  const errors = {};
  const out = {
    name: str(input.name, 80),
    title: str(input.title, 80),
    company: str(input.company, 80),
    tagline: str(input.tagline, 140),
    about: str(input.about, 600),
    address: str(input.address, 200),
    hours: str(input.hours, 80),
    leadForm: input.leadForm !== false,
  };
  if (!out.name) errors.name = "Add a name";

  const checks = {
    phone: [phone(input.phone), "Enter a 10-digit mobile number or +country number"],
    whatsapp: [phone(input.whatsapp), "Enter a 10-digit mobile number or +country number"],
    email: [email(input.email), "Enter a valid email"],
    website: [url(input.website), "Enter a valid web address"],
    mapsUrl: [url(input.mapsUrl), "Paste a Google Maps link"],
    instagram: [handle(input.instagram, /^[A-Za-z0-9._]{1,30}$/), "Enter an Instagram username"],
    linkedin: [handle(input.linkedin), "Enter a LinkedIn profile link or username"],
    facebook: [handle(input.facebook, /^[A-Za-z0-9.]{3,60}$/), "Enter a Facebook page link or username"],
    youtube: [handle(input.youtube, /^@?[A-Za-z0-9._-]{3,60}$/), "Enter a YouTube channel link or handle"],
    x: [handle(input.x, /^[A-Za-z0-9_]{1,15}$/), "Enter an X username"],
  };
  for (const [k, [v, msg]] of Object.entries(checks)) {
    if (v === null) errors[k] = msg;
    else out[k] = v;
  }

  // button order: only known keys, no repeats
  const order = Array.isArray(input.order) ? input.order.filter((k) => ACTION_KEYS.includes(k)) : [];
  out.order = [...new Set(order)].slice(0, ACTION_KEYS.length);
  return { data: out, errors };
}

/* ---------- style ---------- */
const FX = ["auto", "sparkle", "wave", "glow", "none"];
const num = (v, min, max, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : def;
};
export function cleanStyle(input = {}) {
  const hex = (v) => (HEX.test(String(v || "")) ? String(v).toLowerCase() : "");
  return {
    brand: hex(input.brand),
    bg1: hex(input.bg1),
    bg2: hex(input.bg2),
    motion: input.motion === "still" ? "still" : "drift",
    fx: FX.includes(input.fx) ? input.fx : "auto",
    logoSpots: ["both", "top", "badge", "off"].includes(input.logoSpots) ? input.logoSpots : "both",
    // photo + logo adjustments (percent values; 100 = default size)
    logoSize: num(input.logoSize, 40, 160, 100),
    logoPlate: ["auto", "on", "off"].includes(input.logoPlate) ? input.logoPlate : "auto",
    logoBg: hex(input.logoBg),
    logoPos: ["left", "center", "right"].includes(input.logoPos) ? input.logoPos : "left",
    photoSize: num(input.photoSize, 70, 130, 100),
    photoZoom: num(input.photoZoom, 80, 250, 100),
    photoX: num(input.photoX, 0, 100, 50),
    photoY: num(input.photoY, 0, 100, 30), // 30 = a little toward the top, so heads are not cropped
    dayNight: input.dayNight === true,
  };
}

export const themeOk = (t) => THEME_IDS.includes(t);

/* ---------- leads ---------- */
export function cleanLead(input = {}) {
  const name = str(input.name, 80);
  const p = phone(input.phone);
  const note = str(input.note, 300);
  if (!name || !p) return null;
  return { name, phone: p, note };
}

/* ---------- accounts ---------- */
const COMMON = new Set(
  "password password1 password123 12345678 123456789 1234567890 qwerty123 qwertyuiop iloveyou admin123 welcome123 abc12345 india123 india@123 11111111 00000000 87654321 asdfghjkl letmein123 passw0rd p@ssw0rd 1q2w3e4r5t zaq12wsx sunshine1 monkey123 football1 superman1 princess1 dragon123"
    .split(" ")
);
export function passwordProblem(pw, emailAddr = "") {
  const s = String(pw || "");
  if (s.length < 10) return "Use at least 10 characters";
  if (s.length > 200) return "That password is too long";
  if (COMMON.has(s.toLowerCase())) return "That password is too common";
  if (emailAddr && s.toLowerCase().includes(emailAddr.split("@")[0].toLowerCase()) && emailAddr.split("@")[0].length > 3)
    return "Don't use your email name in the password";
  return null;
}

export const cleanName = (v) => str(v, 80);
