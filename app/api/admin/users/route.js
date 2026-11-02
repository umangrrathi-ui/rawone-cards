import { json } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { need } from "../../../../lib/auth";
import { listUsers } from "../../../../lib/users";

export const GET = handle(async (req) => {
  const { res } = await need({ staff: true });
  if (res) return res;
  const qs = new URL(req.url).searchParams;
  return json({ users: await listUsers({ search: (qs.get("q") || "").slice(0, 80) }) });
});
