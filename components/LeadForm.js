"use client";
import { useState } from "react";

// "Share your number" form. Consent box starts unticked (DPDP Act).
export default function LeadForm({ slug, name, preview }) {
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");
  const first = String(name || "").replace(/^(dr|ca|adv|ar|prof|pt|chef|dj)\.?\s+/i, "").split(/\s+/)[0];

  async function submit(e) {
    e.preventDefault();
    if (preview) return;
    const f = new FormData(e.currentTarget);
    if (!f.get("consent")) {
      setErr("Tick the box so we can share your number.");
      return;
    }
    setState("sending");
    setErr("");
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          name: f.get("name"),
          phone: f.get("phone"),
          note: f.get("note"),
          consent: true,
          website2: f.get("website2"),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not send. Check the number and try again.");
      setState("sent");
    } catch (x) {
      setErr(x.message);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <section className="m-lead is-sent" aria-live="polite">
        <h2 className="m-lead-h">Sent to {first}</h2>
        <p className="m-lead-p">They have your number and will get back to you.</p>
      </section>
    );
  }

  return (
    <section className="m-lead" aria-labelledby={`lead-${slug}`}>
      <h2 className="m-lead-h" id={`lead-${slug}`}>
        Share your number with {first}
      </h2>
      <form onSubmit={submit} noValidate>
        <label className="m-field">
          <span>Your name</span>
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
        <label className="m-field">
          <span>Mobile number</span>
          <input name="phone" required inputMode="tel" maxLength={16} autoComplete="tel" />
        </label>
        <label className="m-field">
          <span>Message (optional)</span>
          <input name="note" maxLength={300} />
        </label>
        <input className="m-hp" name="website2" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label className="m-consent">
          <input type="checkbox" name="consent" />
          <span>I agree to share my name and number with {first} so they can contact me.</span>
        </label>
        {err ? (
          <p className="m-err" role="alert">
            {err}
          </p>
        ) : null}
        <button className="m-send" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send my number"}
        </button>
      </form>
    </section>
  );
}
