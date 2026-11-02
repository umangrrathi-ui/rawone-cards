import { body, clientIp, json, tooMany } from "../../../lib/api";
import { handle } from "../../../lib/handler";
import { hit } from "../../../lib/limiter";
import { addReport, getLiveCard, REPORT_REASONS } from "../../../lib/cards";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  if (!(await hit(`report:ip:${ip}`, 5, 3600))) return tooMany();
  const b = await body(req, 4096);
  const slug = String(b.slug || "");
  const reason = REPORT_REASONS.includes(b.reason) ? b.reason : null;
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !reason) return json({ error: "Pick a reason" }, 400);
  const live = await getLiveCard(slug);
  if (!live) return json({ error: "Not found" }, 404);
  await addReport(live.id, reason, String(b.note || "").slice(0, 300));
  return json({ ok: true });
});
