import { get } from "../../../lib/media";

// Serves uploaded photos/logos from R2 or disk through our own domain (keeps CSP at 'self').
export async function GET(req, ctx) {
  const { key } = await ctx.params;
  const k = (key || []).join("/");
  const f = await get(k);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(f.buf, {
    headers: {
      "content-type": f.type,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
