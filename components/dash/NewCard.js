"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/client";

export default function NewCard({ label = "New card", disabled, reason }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function create() {
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/cards", { body: {} });
      router.push(`/dashboard/cards/${r.id}`);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }
  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
      <button className="ui-btn" type="button" onClick={create} disabled={busy || disabled} title={disabled ? reason : undefined}>
        {busy ? "Creating…" : label}
      </button>
      {disabled && reason ? <span className="ui-note">{reason}</span> : null}
      {err ? <span className="ui-err">{err}</span> : null}
    </div>
  );
}
