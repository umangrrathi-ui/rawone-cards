import { handle } from "../../../../lib/handler";
import { getLiveCard } from "../../../../lib/cards";
import { buildVcard } from "../../../../lib/vcard";
import { get } from "../../../../lib/media";
import { baseUrl } from "../../../../lib/api";

export const GET = handle(async (req, ctx) => {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return new Response("Not found", { status: 404 });
  const live = await getLiveCard(slug);
  if (!live) return new Response("Not found", { status: 404 });
  const photo = live.card.photoKey ? await get(live.card.photoKey) : null;
  const card = { ...live.view, photoData: photo ? `data:${photo.type};base64,${photo.buf.toString("base64")}` : "" };
  const vcf = buildVcard(card, `${baseUrl()}/${slug}`);
  return new Response(vcf, {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}.vcf"`,
      "cache-control": "no-store",
    },
  });
});
