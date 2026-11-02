import { json } from "../../../../../../lib/api";
import { handle } from "../../../../../../lib/handler";
import { myCard } from "../../../../../../lib/cardapi";
import { listLeads } from "../../../../../../lib/cards";
import { limitsOf } from "../../../../../../lib/plans";

// Cells starting with = + - @ are prefixed with ' so spreadsheets don't run them as formulas.
const cell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const GET = handle(async (req, ctx) => {
  const { user, card, res } = await myCard(ctx);
  if (res) return res;
  if (!limitsOf(user).csv) return json({ error: "CSV export is on the Pro and Top plans" }, 403);
  const leads = await listLeads(card.id);
  const lines = [["Name", "Phone", "Message", "Date (UTC)"].map(cell).join(",")];
  for (const l of leads) lines.push([l.name, l.phone, l.note, new Date(l.created_at).toISOString()].map(cell).join(","));
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${card.slug}-leads.csv"` },
  });
});
