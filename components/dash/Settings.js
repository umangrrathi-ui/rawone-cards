"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/client";

function Msg({ m }) {
  return m ? <p className={`ui-alert${m.ok ? " is-ok" : ""}`}>{m.text}</p> : null;
}

function Pw({ label, name, autoComplete, err }) {
  return (
    <label className="ui-field">
      <span>{label}</span>
      <input className="ui-in" name={name} type="password" autoComplete={autoComplete} aria-invalid={err ? "true" : undefined} />
      {err ? <span className="ui-err">{err}</span> : null}
    </label>
  );
}

export default function Settings({ email, plan, planUntil, staff, totp }) {
  const router = useRouter();
  const [msg, setMsg] = useState({});
  const [errs, setErrs] = useState({});
  const [confirm, setConfirm] = useState(false);
  const say = (k, text, ok = true) => setMsg((m) => ({ ...m, [k]: { text, ok } }));

  async function changePw(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setErrs({});
    try {
      await api("/api/account/password", { body: { current: d.get("current"), next: d.get("next") } });
      e.target.reset();
      say("pw", "Password changed. Other devices were logged out.");
    } catch (x) {
      setErrs(x.data?.errors || {});
      say("pw", x.message, false);
    }
  }
  async function logoutAll() {
    await api("/api/account/logout-all").catch(() => {});
    router.push("/login");
  }
  async function del(e) {
    e.preventDefault();
    try {
      await api("/api/account/delete", { body: { password: new FormData(e.currentTarget).get("password") } });
      router.push("/");
    } catch (x) {
      setErrs(x.data?.errors || {});
      say("del", x.message, false);
    }
  }

  return (
    <main className="ui-page" style={{ maxWidth: 720 }}>
      <div className="ui-head">
        <div>
          <h1 className="ui-h1">Settings</h1>
          <p className="ui-sub">{email}</p>
        </div>
      </div>
      <section className="ui-panel">
        <h2 className="ui-h2">Plan</h2>
        <p className="ui-note">
          You&apos;re on <b>{plan === "pro" ? "Pro" : "Free"}</b>
          {plan === "pro" && planUntil ? ` until ${new Date(planUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
          {plan !== "pro" ? " To upgrade to Pro (₹999/year), WhatsApp RAWONE on +91 88667 64009 or email support@rawone.in." : ""}
        </p>
      </section>
      <section className="ui-panel">
        <h2 className="ui-h2">Change password</h2>
        <form onSubmit={changePw} style={{ display: "grid", gap: 14, maxWidth: 420 }} noValidate>
          <Pw label="Current password" name="current" autoComplete="current-password" err={errs.current} />
          <Pw label="New password" name="next" autoComplete="new-password" err={errs.next} />
          <Msg m={msg.pw} />
          <button className="ui-btn-2" type="submit" style={{ justifySelf: "start" }}>
            Change password
          </button>
        </form>
      </section>
      {staff ? (
        <section className="ui-panel">
          <h2 className="ui-h2">Two-factor authentication</h2>
          <p className="ui-note">{totp ? "On. You enter a code from your authenticator app when you log in." : "Required for admin access."}</p>
          {!totp ? (
            <a className="ui-btn-2" href="/admin/2fa" style={{ marginTop: 12 }}>
              Turn on two-factor
            </a>
          ) : null}
        </section>
      ) : null}
      <section className="ui-panel">
        <h2 className="ui-h2">Devices</h2>
        <p className="ui-note">Logs you out on every phone and computer, including this one.</p>
        <button className="ui-btn-ghost" type="button" style={{ marginTop: 12 }} onClick={logoutAll}>
          Log out everywhere
        </button>
      </section>
      <section className="ui-panel">
        <h2 className="ui-h2">Your data</h2>
        <p className="ui-note">Download your account, cards and leads as a file.</p>
        <a className="ui-btn-ghost" href="/api/account/export" style={{ marginTop: 12 }}>
          Download my data
        </a>
      </section>
      <section className="ui-panel">
        <h2 className="ui-h2">Delete account</h2>
        <p className="ui-note">Deletes your account, every card, all stats, leads and uploaded photos. Live cards and NFC cards stop working.</p>
        {confirm ? (
          <form onSubmit={del} style={{ display: "grid", gap: 14, maxWidth: 420, marginTop: 12 }} noValidate>
            <Pw label="Enter your password to confirm" name="password" autoComplete="current-password" err={errs.password} />
            <Msg m={msg.del} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ui-btn-bad" type="submit">
                Delete my account
              </button>
              <button className="ui-btn-ghost" type="button" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className="ui-btn-bad" type="button" style={{ marginTop: 12 }} onClick={() => setConfirm(true)}>
            Delete account
          </button>
        )}
      </section>
    </main>
  );
}
