import { json } from "../../../../lib/api";
import { handle } from "../../../../lib/handler";
import { endSession, need } from "../../../../lib/auth";
import { logoutEverywhere } from "../../../../lib/users";

export const POST = handle(async () => {
  const { user, res } = await need();
  if (res) return res;
  await logoutEverywhere(user.id);
  await endSession();
  return json({ ok: true });
});
