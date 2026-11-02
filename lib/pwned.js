import crypto from "node:crypto";

// Has this password appeared in a known data breach? Uses the Have I Been Pwned range API:
// only the first 5 characters of the password's SHA-1 are sent, never the password.
// If the service can't be reached we let the password through (a down third party must not block sign-ups).
export const PWNED_MESSAGE = "That password has appeared in a data breach. Choose a different one.";

export async function isPwned(password, { url = process.env.PWNED_API || "https://api.pwnedpasswords.com/range/", timeoutMs = 2500 } = {}) {
  if (process.env.PWNED_API === "off") return false; // tests / offline setups
  try {
    const sha = crypto.createHash("sha1").update(String(password)).digest("hex").toUpperCase();
    const prefix = sha.slice(0, 5);
    const rest = sha.slice(5);
    const res = await fetch(url + prefix, { headers: { "Add-Padding": "true", "user-agent": "rawone-cards" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return false;
    const text = await res.text();
    for (const line of text.split("\n")) {
      const [h, n] = line.trim().split(":");
      if (h === rest && Number(n) > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}
