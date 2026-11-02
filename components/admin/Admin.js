"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/client";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const yearFromNow = () => new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);

export default function Admin({ isAdmin }) {
  const [tab, setTab] = useState("users");
  const [qtext, setQtext] = useState("");
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState("");
  const [until, setUntil] = useState({});

  const load = useCallback(async () => {
    setRows(null);
    try {
      if (tab === "users") setRows((await api(`/api/admin/users?q=${encodeURIComponent(qtext)}`, { method: "GET" })).users);
      if (tab === "cards") setRows((await api(`/api/admin/cards?q=${encodeURIComponent(qtext)}`, { method: "GET" })).cards);
      if (tab === "reports") setRows((await api("/api/admin/reports", { method: "GET" })).reports);
    } catch (e) {
      setMsg(e.message);
      setRows([]);
    }
  }, [tab, qtext]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function act(url, b, done) {
    setMsg("");
    try {
      await api(url, { method: "PUT", body: b });
      setMsg(done);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <main className="ui-page">
      <div className="ui-head">
        <div>
          <h1 className="ui-h1">Admin</h1>
          <p className="ui-sub">Every change here is written to the audit log.</p>
        </div>
        <div className="ed-seg" role="tablist">
          {["users", "cards", "reports"].map((t) => (
            <button key={t} type="button" role="tab" aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {tab !== "reports" ? (
        <input className="ui-in" style={{ maxWidth: 360, marginBottom: 16 }} placeholder={tab === "users" ? "Search name or email" : "Search link or owner email"} value={qtext} onChange={(e) => setQtext(e.target.value)} aria-label="Search" />
      ) : null}
      {msg ? <p className="ui-alert is-ok" style={{ marginBottom: 16 }}>{msg}</p> : null}
      <div className="ui-panel ui-table-wrap">
        {!rows ? (
          <p className="ui-note">Loading…</p>
        ) : !rows.length ? (
          <p className="ui-note">Nothing here.</p>
        ) : tab === "users" ? (
          <table className="ui-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Plan</th>
                <th className="num">Cards</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                    <br />
                    <span className="ui-note">{u.email}</span>
                    {u.role !== "user" ? <span className="ui-plan" style={{ marginLeft: 6 }}>{u.role}</span> : null}
                  </td>
                  <td>{u.status}</td>
                  <td>
                    {u.plan === "pro" ? `Pro until ${fmt(u.plan_until)}` : "Free"}
                  </td>
                  <td className="num">{u.cards}</td>
                  <td>{fmt(u.created_at)}</td>
                  <td>
                    {isAdmin && u.role === "user" ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="date" className="ui-in" style={{ minHeight: 36, width: 150 }} value={until[u.id] || yearFromNow()} onChange={(e) => setUntil({ ...until, [u.id]: e.target.value })} aria-label="Pro until" />
                          <button className="ui-btn-ghost" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/users/${u.id}`, { plan: "pro", until: until[u.id] || yearFromNow() }, `${u.email} is Pro`)}>
                            Set Pro
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {u.plan === "pro" ? (
                            <button className="ui-btn-ghost" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/users/${u.id}`, { plan: "free" }, `${u.email} is on Free`)}>
                              Make Free
                            </button>
                          ) : null}
                          {u.status === "active" ? (
                            <button className="ui-btn-bad" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/users/${u.id}`, { status: "blocked" }, `${u.email} blocked`)}>
                              Block
                            </button>
                          ) : u.status === "blocked" ? (
                            <button className="ui-btn-ghost" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/users/${u.id}`, { status: "active" }, `${u.email} unblocked`)}>
                              Unblock
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <span className="ui-note">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "cards" ? (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Card</th>
                <th>Owner</th>
                <th>Status</th>
                <th className="num">Open reports</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.status === "live" ? (
                      <a href={`/${c.slug}`} target="_blank" rel="noopener noreferrer">
                        /{c.slug}
                      </a>
                    ) : (
                      `/${c.slug}`
                    )}
                  </td>
                  <td>{c.email}</td>
                  <td>{c.status}</td>
                  <td className="num">{c.open_reports}</td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {c.status !== "blocked" ? (
                      <button className="ui-btn-bad" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/cards/${c.id}`, { status: "blocked" }, `/${c.slug} blocked`)}>
                        Block
                      </button>
                    ) : (
                      <button className="ui-btn-ghost" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/cards/${c.id}`, { status: "off" }, `/${c.slug} restored as unpublished`)}>
                        Unblock
                      </button>
                    )}
                    {Number(c.open_reports) ? (
                      <button className="ui-btn-ghost" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/cards/${c.id}`, { closeReports: true }, "Reports closed")}>
                        Close reports
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Card</th>
                <th>Reason</th>
                <th>Details</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer">
                      /{r.slug}
                    </a>
                  </td>
                  <td>{r.reason}</td>
                  <td>{r.note}</td>
                  <td>{fmt(r.created_at)}</td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="ui-btn-bad" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/cards/${r.card_id}`, { status: "blocked", closeReports: true }, `/${r.slug} blocked`)}>
                      Block card
                    </button>
                    <button className="ui-btn-ghost" style={{ minHeight: 36 }} type="button" onClick={() => act(`/api/admin/cards/${r.card_id}`, { closeReports: true }, "Report dismissed")}>
                      Dismiss
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
