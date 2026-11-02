import { json } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { need } from "../../../../lib/auth";
import { adminReports } from "../../../../lib/cards";

export const GET = handle(async () => {
  const { res } = await need({ staff: true });
  if (res) return res;
  return json({ reports: await adminReports() });
});
