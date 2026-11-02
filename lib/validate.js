import { THEME_IDS } from "./themes";
import { HEX } from "./color";

const str = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);

// India-first phone normalising: keeps +CC for foreign numbers.
export function phone(v) {
  let s = String(v ?? "").replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s.startsWith("+91")) s = s.slice(3);
  else if (s.startsWith("0091")) s = s.slice(4);
  else if (s.length === 11 && s.startsWith("0")) s = s.slice(1);
  else if (s.length === 12 && s.startsWith("91")) s = s.slice(2);
  if (/^[6-9]\d{9}$/.test(s)) return `+91${s}`;
  if (/^\+\d{8,15}$/.test(s)) return s;
  return null;
}

export function url(v) {
  const s = str(v, 300);
  if (!s) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return ["http:", "https:"].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

function email(v) {
  const s = str(v, 120).toLowerCase();
  if (!s) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
}

function insta(v) {
  let s = str(v, 120);
  if (!s) return "";
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s : null;
}

// Only JPEG/PNG: iPhone contacts can't read WebP photos inside a vCard.
function image(v, maxBytes) {
  const s = String(v ?? "");
  if (!s) return "";
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(s);
  if (!m) return null;
  if (Math.floor((m[2].length * 3) / 4) > maxBytes) return null;
  return s;
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;
const RESERVED = new Set(["admin", "api", "showroom", "print", "login", "new"]);

export function cleanCard(input) {
  const errors = {};
  const out = {
    slug: str(input.slug, 40).toLowerCase(),
    theme: str(input.theme, 30),
    status: input.status === "off" ? "off" : "active",
    name: str(input.name, 80),
    title: str(input.title, 80),
    company: str(input.company, 80),
    tagline: str(input.tagline, 140),
    about: str(input.about, 600),
    address: str(input.address, 200),
    hours: str(input.hours, 80),
    leadForm: input.leadForm !== false,
    brand: HEX.test(String(input.brand || "")) ? String(input.brand).toLowerCase() : "",
    bg1: HEX.test(String(input.bg1 || "")) ? String(input.bg1).toLowerCase() : "",
    bg2: HEX.test(String(input.bg2 || "")) ? String(input.bg2).toLowerCase() : "",
  };
  if (!out.name) errors.name = "Add a name";
  if (!SLUG.test(out.slug) || RESERVED.has(out.slug)) errors.slug = "Use 3–40 lowercase letters, numbers or hyphens";
  if (!THEME_IDS.includes(out.theme)) errors.theme = "Pick a design";

  const checks = {
    phone: phone(input.phone),
    whatsapp: phone(input.whatsapp),
    email: email(input.email),
    website: url(input.website),
    mapsUrl: url(input.mapsUrl),
    instagram: insta(input.instagram),
    photo: image(input.photo, 350_000),
    logo: image(input.logo, 200_000),
  };
  const msg = {
    phone: "Enter a 10-digit mobile or +country number",
    whatsapp: "Enter a 10-digit mobile or +country number",
    email: "Enter a valid email",
    website: "Enter a valid web address",
    mapsUrl: "Paste a Google Maps link",
    instagram: "Enter an Instagram username",
    photo: "Photo must be JPG or PNG under 350 KB",
    logo: "Logo must be JPG or PNG under 200 KB",
  };
  for (const [k, v] of Object.entries(checks)) {
    if (v === null) errors[k] = msg[k];
    else out[k] = v;
  }
  return { card: out, errors };
}

export function cleanLead(input) {
  const name = str(input.name, 80);
  const p = phone(input.phone);
  const note = str(input.note, 300);
  if (!name || !p) return null;
  return { name, phone: p, note };
}
