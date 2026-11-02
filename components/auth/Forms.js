"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../lib/client";
import Turnstile, { turnstileToken } from "./Turnstile";

function Field({ label, name, type = "text", errors, hint, ...rest }) {
  const err = errors?.[name];
  return (
    <label className="ui-field">
      <span>{label}</span>
      <input className="ui-in" name={name} type={type} aria-invalid={err ? "true" : undefined} {...rest} />
      {hint && !err ? <small>{hint}</small> : null}
      {err ? <span className="ui-err">{err}</span> : null}
    </label>
  );
}

function useForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  async function run(fn) {
    setBusy(true);
    setError("");
    setErrors({});
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      setErrors(e.data?.errors || {});
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, errors, run };
}

export function SignupForm({ siteKey }) {
  const router = useRouter();
  const f = useForm();
  async function submit(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const email = String(d.get("email") || "").trim();
    const ok = await f.run(() => api("/api/auth/signup", { body: { name: d.get("name"), email, password: d.get("password"), turnstile: turnstileToken(e.currentTarget) } }));
    if (ok) router.push(`/verify?email=${encodeURIComponent(email)}`);
  }
  return (
    <form className="au-form" onSubmit={submit} noValidate>
      <Field label="Your name" name="name" autoComplete="name" required maxLength={80} errors={f.errors} />
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={f.errors} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters" errors={f.errors} />
      <Turnstile siteKey={siteKey} />
      {f.error ? <p className="ui-alert" role="alert">{f.error}</p> : null}
      <button className="ui-btn" type="submit" disabled={f.busy}>
        {f.busy ? "Creating account…" : "Create account"}
      </button>
      <p className="ui-note">By signing up you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
    </form>
  );
}

export function VerifyForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = sp.get("email") || "";
  const f = useForm();
  const [sent, setSent] = useState("");
  async function submit(e) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") || "").replace(/\D/g, "");
    const r = await f.run(() => api("/api/auth/verify", { body: { email, code } }));
    if (r) router.push(r.next || "/dashboard");
  }
  async function resend() {
    await api("/api/auth/resend", { body: { email, purpose: "verify" } }).catch(() => {});
    setSent("If that email is waiting for a code, a new one is on its way.");
  }
  return (
    <form className="au-form" onSubmit={submit} noValidate>
      <p className="au-p">We sent a 6-digit code to {email ? <b>{email}</b> : "your email"}. It works for 10 minutes.</p>
      <label className="ui-field">
        <span>Code</span>
        <input className="ui-in au-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
      </label>
      {f.error ? <p className="ui-alert" role="alert">{f.error}</p> : null}
      {sent ? <p className="ui-alert is-ok">{sent}</p> : null}
      <button className="ui-btn" type="submit" disabled={f.busy}>
        {f.busy ? "Checking…" : "Verify email"}
      </button>
      <button className="ui-btn-ghost" type="button" onClick={resend}>
        Send a new code
      </button>
    </form>
  );
}

export function LoginForm({ siteKey }) {
  const router = useRouter();
  const f = useForm();
  const [need2fa, setNeed2fa] = useState(false);
  const [needCheck, setNeedCheck] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const r = await f.run(async () => {
      try {
        return await api("/api/auth/login", { body: { email: d.get("email"), password: d.get("password"), code: d.get("code") || undefined, turnstile: turnstileToken(e.currentTarget) } });
      } catch (err) {
        if (err.data?.needTurnstile) setNeedCheck(true);
        throw err;
      }
    });
    if (!r) return;
    if (r.need2fa) return setNeed2fa(true);
    router.push(r.next || "/dashboard");
    router.refresh();
  }
  return (
    <form className="au-form" onSubmit={submit} noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={f.errors} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required errors={f.errors} />
      {need2fa ? <Field label="Authenticator code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus errors={f.errors} /> : null}
      {needCheck ? <Turnstile siteKey={siteKey} /> : null}
      {f.error ? <p className="ui-alert" role="alert">{f.error}</p> : null}
      <button className="ui-btn" type="submit" disabled={f.busy}>
        {f.busy ? "Logging in…" : "Log in"}
      </button>
      <p className="au-alt">
        <a href="/forgot">Forgot password?</a>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const router = useRouter();
  const f = useForm();
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState("ask");
  async function ask(e) {
    e.preventDefault();
    const em = String(new FormData(e.currentTarget).get("email") || "").trim();
    const r = await f.run(() => api("/api/auth/forgot", { body: { email: em } }));
    if (r) {
      setEmail(em);
      setStage("reset");
    }
  }
  async function reset(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const r = await f.run(() => api("/api/auth/reset", { body: { email, code: String(d.get("code") || "").replace(/\D/g, ""), password: d.get("password") } }));
    if (r) router.push(r.next || "/dashboard");
  }
  if (stage === "ask")
    return (
      <form className="au-form" onSubmit={ask} noValidate>
        <Field label="Email" name="email" type="email" autoComplete="email" required errors={f.errors} />
        {f.error ? <p className="ui-alert" role="alert">{f.error}</p> : null}
        <button className="ui-btn" type="submit" disabled={f.busy}>
          {f.busy ? "Sending…" : "Send reset code"}
        </button>
      </form>
    );
  return (
    <form className="au-form" onSubmit={reset} noValidate>
      <p className="au-p">If {email} has an account, a 6-digit code is on its way. Enter it with your new password.</p>
      <label className="ui-field">
        <span>Code</span>
        <input className="ui-in au-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
      </label>
      <Field label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters" errors={f.errors} />
      {f.error ? <p className="ui-alert" role="alert">{f.error}</p> : null}
      <button className="ui-btn" type="submit" disabled={f.busy}>
        {f.busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
