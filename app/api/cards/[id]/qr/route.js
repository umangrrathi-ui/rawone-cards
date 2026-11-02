import QRCode from "qrcode";
import { handle } from "../../../../../lib/handler";
import { myCard } from "../../../../../lib/cardapi";
import { baseUrl } from "../../../../../lib/api";

// QR points at /q/<code>: it never changes even if the user renames their link.
export const GET = handle(async (req, ctx) => {
  const { card, res } = await myCard(ctx);
  if (res) return res;
  const format = new URL(req.url).searchParams.get("format") === "png" ? "png" : "svg";
  const target = `${baseUrl()}/q/${card.code}`;
  const opts = { errorCorrectionLevel: "M", margin: 2, color: { dark: "#111318", light: "#ffffff" } };
  if (format === "png") {
    const buf = await QRCode.toBuffer(target, { ...opts, width: 1200 });
    return new Response(buf, { headers: { "content-type": "image/png", "content-disposition": `attachment; filename="${card.slug}-qr.png"` } });
  }
  const svg = await QRCode.toString(target, { ...opts, type: "svg" });
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "content-disposition": `attachment; filename="${card.slug}-qr.svg"` } });
});
