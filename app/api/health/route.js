import { dbOk } from "../../../lib/db";

export const dynamic = "force-dynamic";

// Public: only { ok, database }. Never config values.
export async function GET() {
  const database = await dbOk();
  return Response.json({ ok: database, database }, { status: database ? 200 : 503 });
}
