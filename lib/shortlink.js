import { baseUrl } from "./api";
import { getByCode } from "./cards";

// Permanent links printed on NFC chips (/n/code) and QR codes (/q/code).
// They follow the card even if the owner changes its link name.
export async function redirectFromCode(req, ctx, s) {
  try {
    const { code } = await ctx.params;
    if (!/^[a-z0-9]{8}$/.test(code)) return new Response("Not found", { status: 404 });
    const c = await getByCode(code);
    if (!c) return new Response("Not found", { status: 404 });
    return Response.redirect(`${baseUrl()}/${c.slug}?s=${s}`, 302);
  } catch (e) {
    console.error("shortlink", e.message);
    return new Response("Something went wrong", { status: 500 });
  }
}
