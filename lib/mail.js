// Transactional email through Resend's HTTP API. No SDK needed.
// Without RESEND_API_KEY: dev prints the mail to the server console; production refuses.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function sendMail({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production" && process.env.MAIL_DEV_LOG !== "1") throw new Error("RESEND_API_KEY not set");
    console.log(`\n[dev mail] to=${to}\nsubject: ${subject}\n${text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "RAWONE Cards <no-reply@rawonelabs.co.in>", to: [to], subject, text, html }),
  });
  if (!res.ok) {
    console.error("mail send failed", res.status); // never log the address or code
    throw new Error("mail failed");
  }
}

export function codeMail(kind, name, code) {
  const what = kind === "reset" ? "reset your password" : "verify your email";
  const subject = kind === "reset" ? `${code} is your password reset code` : `${code} is your RAWONE Cards code`;
  const text = `Hi ${name},\n\nUse ${code} to ${what}. It works for 10 minutes.\n\nIf you didn't ask for this, ignore this email. Nobody from RAWONE will ever ask you for this code.\n\nRAWONE Cards`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#16181d">
<p>Hi ${esc(name)},</p><p>Use this code to ${what}. It works for 10 minutes.</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:24px 0">${code}</p>
<p style="color:#5b6170;font-size:14px">If you didn't ask for this, ignore this email. Nobody from RAWONE will ever ask you for this code.</p>
<p style="color:#5b6170;font-size:14px">RAWONE Cards</p></div>`;
  return { subject, text, html };
}
