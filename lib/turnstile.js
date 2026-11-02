// Cloudflare Turnstile bot check. Off when TURNSTILE_SECRET is not set (local dev).
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY || "";

export async function turnstileOk(token, ip) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token || typeof token !== "string" || token.length > 2048) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip || "" }),
    });
    const j = await res.json();
    return j.success === true;
  } catch (e) {
    console.error("turnstile", e.message);
    return false;
  }
}
