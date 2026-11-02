"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/client";

export default function TwoFactor() {
  const router = useRouter();
  const [setup, setSetup] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/api/account/2fa", { method: "GET" }).then(setSetup).catch((e) => setErr(e.message));
  }, []);
  async function confirm(e) {
    e.preventDefault();
    setErr("");
    try {
      const r = await api("/api/account/2fa", { body: { code: new FormData(e.currentTarget).get("code") } });
      router.push(r.next || "/admin");
      router.refresh();
    } catch (x) {
      setErr(x.message);
    }
  }
  return (
    <main className="ui-page" style={{ maxWidth: 560 }}>
      <h1 className="ui-h1">Turn on two-factor</h1>
      <p className="ui-sub">Admin access needs a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password).</p>
      <div className="ui-panel" style={{ marginTop: 20 }}>
        {setup ? (
          <>
            <ol className="ui-note" style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
              <li>Open your authenticator app and scan this QR code.</li>
              <li>Enter the 6-digit code it shows.</li>
            </ol>
            <div style={{ width: 200, margin: "16px 0", background: "#fff" }} dangerouslySetInnerHTML={{ __html: setup.qr }} />
            <p className="ui-note">
              Can&apos;t scan? Enter this key: <code style={{ wordBreak: "break-all" }}>{setup.secret}</code>
            </p>
            <form onSubmit={confirm} style={{ display: "grid", gap: 12, marginTop: 16, maxWidth: 260 }}>
              <input className="ui-in au-code" name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required />
              {err ? <p className="ui-alert">{err}</p> : null}
              <button className="ui-btn-2" type="submit">
                Turn on
              </button>
            </form>
          </>
        ) : (
          <p className="ui-note">{err || "Loading…"}</p>
        )}
      </div>
    </main>
  );
}
