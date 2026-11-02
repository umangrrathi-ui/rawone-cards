import { body, clientIp, isBot, json, tooMany } from "../../../lib/api";
import { handle } from "../../../lib/handler";
import { hit } from "../../../lib/limiter";
import { addLead, getLiveCard } from "../../../lib/cards";
import { cleanLead } from "../../../lib/validate";

// "Share your number" form on a public card.
export const POST = handle(async (req) => {
  if (isBot(req)) return json({ error: "Not allowed" }, 403);
  const ip = clientIp(req);
  if (!(await hit(`lead:ip:${ip}`, 5, 600))) return tooMany();
  const b = await body(req, 4096);
  if (b.website2) return json({ ok: true }); // honeypot filled = bot; pretend success
  if (b.consent !== true) return json({ error: "Tick the box so your number can be shared" }, 400);
  const slug = String(b.slug || "");
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return json({ error: "Not found" }, 404);
  const live = await getLiveCard(slug);
  if (!live || live.view.leadForm === false) return json({ error: "Not found" }, 404);
  if (!(await hit(`lead:card:${live.id}`, 100, 86400))) return tooMany();
  const lead = cleanLead(b);
  if (!lead) return json({ error: "Enter your name and a valid mobile number" }, 400);
  await addLead(live.id, lead); // a repeat number is accepted silently
  return json({ ok: true });
});
