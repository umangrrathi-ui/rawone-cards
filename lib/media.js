import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";
import { randomId } from "./crypto";

// Photos and logos. Cloudflare R2 when configured, local disk (./data/media) otherwise.
// Every upload is decoded and re-encoded by sharp: EXIF/GPS is dropped, odd formats never reach visitors.

export const MAX_UPLOAD = 3 * 1024 * 1024; // 3 MB
const KEY = /^[pl]\/[a-z0-9]{16}\.(jpg|png)$/;
const DIR = process.env.MEDIA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "media");

function r2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  globalThis.__r2 ??= new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  return { client: globalThis.__r2, base: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}` };
}

export const validKey = (k) => KEY.test(String(k || ""));

function decode(dataUrl) {
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(dataUrl || ""));
  if (!m) throw Object.assign(new Error("bad image"), { status: 400, msg: "Upload a JPG, PNG or WebP image" });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_UPLOAD) throw Object.assign(new Error("too big"), { status: 413, msg: "Image must be under 3 MB" });
  return buf;
}

async function checked(buf) {
  const img = sharp(buf, { limitInputPixels: 40_000_000, failOn: "error" });
  const meta = await img.metadata().catch(() => null);
  if (!meta || !["jpeg", "png", "webp"].includes(meta.format)) {
    throw Object.assign(new Error("not an image"), { status: 400, msg: "That file is not a valid image" });
  }
  return img;
}

/** Portrait photo -> JPEG (vCard-friendly), max 1000 px, metadata stripped. */
export async function processPhoto(dataUrl) {
  const img = await checked(decode(dataUrl));
  return img.rotate().resize(1000, 1000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

/** Logo -> PNG (keeps transparency), max 400 px. */
export async function processLogo(dataUrl) {
  const img = await checked(decode(dataUrl));
  return img.rotate().resize(400, 400, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
}

export async function put(kind, buf) {
  const key = `${kind === "logo" ? "l" : "p"}/${randomId(16)}.${kind === "logo" ? "png" : "jpg"}`;
  const type = kind === "logo" ? "image/png" : "image/jpeg";
  const s3 = r2();
  if (s3) {
    const res = await s3.client.fetch(`${s3.base}/${key}`, { method: "PUT", body: buf, headers: { "content-type": type } });
    if (!res.ok) throw new Error(`r2 put ${res.status}`);
  } else {
    await fs.mkdir(path.join(DIR, path.dirname(key)), { recursive: true });
    await fs.writeFile(path.join(DIR, key), buf);
  }
  return key;
}

export async function get(key) {
  if (!validKey(key)) return null;
  const type = key.endsWith(".png") ? "image/png" : "image/jpeg";
  const s3 = r2();
  try {
    if (s3) {
      const res = await s3.client.fetch(`${s3.base}/${key}`);
      if (!res.ok) return null;
      return { buf: Buffer.from(await res.arrayBuffer()), type };
    }
    return { buf: await fs.readFile(path.join(DIR, key)), type };
  } catch {
    return null;
  }
}

export async function del(key) {
  if (!validKey(key)) return;
  const s3 = r2();
  try {
    if (s3) await s3.client.fetch(`${s3.base}/${key}`, { method: "DELETE" });
    else await fs.unlink(path.join(DIR, key));
  } catch {
    /* already gone */
  }
}

export const mediaUrl = (key) => (validKey(key) ? `/media/${key}` : "");
