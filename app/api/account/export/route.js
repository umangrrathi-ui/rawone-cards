import { handle } from "../../../../lib/handler";
import { need } from "../../../../lib/auth";
import { exportUser } from "../../../../lib/users";

// DPDP: a user can download everything we hold about them.
export const GET = handle(async () => {
  const { user, res } = await need();
  if (res) return res;
  const data = await exportUser(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="rawone-cards-my-data.json"' },
  });
});
