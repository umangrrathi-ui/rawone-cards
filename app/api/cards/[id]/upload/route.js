import { body, json, tooMany } from "../../../../../lib/api";
import { handle } from "../../../../../lib/handler";
import { hit } from "../../../../../lib/limiter";
import { myCard } from "../../../../../lib/cardapi";
import { updateMyCard, toView } from "../../../../../lib/cards";
import { del, processLogo, processPhoto, put } from "../../../../../lib/media";

// { kind: "photo" | "logo", image: dataURL | null }. null removes it.
export const POST = handle(async (req, ctx) => {
  const { user, card, res } = await myCard(ctx);
  if (res) return res;
  if (!(await hit(`upload:${user.id}`, 20, 3600))) return tooMany();
  const b = await body(req, 4_600_000); // 3 MB image as base64 + JSON
  const kind = b.kind === "logo" ? "logo" : "photo";
  const field = kind === "logo" ? "logoKey" : "photoKey";
  let key = "";
  if (b.image) {
    const buf = kind === "logo" ? await processLogo(b.image) : await processPhoto(b.image);
    key = await put(kind, buf);
  }
  const r = await updateMyCard(user.id, card.id, { [field]: key });
  if (r.error) {
    await del(key);
    return json({ error: "Not found" }, 404);
  }
  await del(card[field]);
  return json({ ok: true, view: toView(r.card, user) });
});
