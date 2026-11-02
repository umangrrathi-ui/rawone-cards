import { json } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { need } from "../../../../lib/auth";
import { adminCards } from "../../../../lib/cards";

export const GET = handle(async (req) => {
  const { res } = await need({ staff: true });
  if (res) return res;
  return json({ cards: await adminCards((new URL(req.url).searchParams.get("q") || "").slice(0, 80)) });
});
