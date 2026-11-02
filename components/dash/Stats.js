"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/client";

const BTN = { save: "Save contact", call: "Call", whatsapp: "WhatsApp", maps: "Location", email: "Email", instagram: "Instagram", website: "Website", linkedin: "LinkedIn", facebook: "Facebook", youtube: "YouTube", x: "X", share: "Share" };

export default function Stats({ id, name, csv }) {
  const [days, setDays] = useState(30);
  const [s, setS] = useState(null);
  const [leads, setLeads] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [st, ld] = await Promise.all([api(`/api/cards/${id}/stats?days=${days}`, { method: "GET" }), api(`/api/cards/${id}/leads`, { method: "GET" })]);
      setS(st);
      setLeads(ld.leads);
      if (st.days < days) setDays(st.days);
    } catch (e) {
      setErr(e.message);
    }
  }, [id, days]);
  useEffect(() => {
    const t = setTimeout(load, 0); // run after paint, not synchronously inside the effect
    return () => clearTimeout(t);
  }, [load]);

  async function delLead(lid) {
    await api(`/api/cards/${id}/leads/${lid}`, { method: "DELETE" }).catch(() => {});
    setLeads((l) => l.filter((x) => x.id !== lid));
  }

  const max = s ? Math.max(1, ...s.series.map((p) => p.n)) : 1;
  const views = s?.byType.view || 0;
  return (
    <main className="ui-page">
      <div className="ui-head">
        <div>
          <a href={`/dashboard/cards/${id}`} className="ui-note">
            ← Edit card
          </a>
          <h1 className="ui-h1" style={{ marginTop: 6 }}>
            Stats & leads
          </h1>
          <p className="ui-sub">{name}</p>
        </div>
        <div className="ed-seg" role="group" aria-label="Period">
          {[7, 30, 180, 360].map((d) => (
            <button key={d} type="button" aria-pressed={days === d} disabled={s && d > s.maxDays} title={s && d > s.maxDays ? "Higher plan" : undefined} onClick={() => setDays(d)}>
              {`${d} days`}
            </button>
          ))}
        </div>
      </div>
      {err ? <p className="ui-alert">{err}</p> : null}
      {s ? (
        <>
          <div className="st-kpis">
            <div className="st-kpi">
              <b>{views}</b>
              <span>Card opens</span>
            </div>
            <div className="st-kpi">
              <b>{s.unique}</b>
              <span>Unique visitors</span>
            </div>
            <div className="st-kpi">
              <b>{s.bySrc.nfc}</b>
              <span>NFC taps</span>
            </div>
            <div className="st-kpi">
              <b>{s.bySrc.qr}</b>
              <span>QR scans</span>
            </div>
            <div className="st-kpi">
              <b>{s.byType.save || 0}</b>
              <span>Contacts saved</span>
            </div>
          </div>
          <div className="ui-panel">
            <h2 className="ui-h2">Card opens per day</h2>
            <div className="st-bars" role="img" aria-label={`Card opens per day over the last ${s.days} days, ${views} in total`}>
              {s.series.map((p) => (
                <div key={p.d} className={`st-bar${p.n ? "" : " is-zero"}`} style={{ height: `${(p.n / max) * 100}%` }} title={`${p.d}: ${p.n}`} />
              ))}
            </div>
            <div className="st-axis">
              <span>{s.series[0]?.d}</span>
              <span>{s.series.at(-1)?.d}</span>
            </div>
          </div>
          <div className="ui-panel">
            <h2 className="ui-h2">Button taps</h2>
            <table className="ui-table">
              <tbody>
                {Object.keys(BTN)
                  .filter((k) => s.byType[k])
                  .sort((a, b) => s.byType[b] - s.byType[a])
                  .map((k) => (
                    <tr key={k}>
                      <td>{BTN[k]}</td>
                      <td className="num">{s.byType[k]}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!Object.keys(BTN).some((k) => s.byType[k]) ? <p className="ui-note">No taps yet. Share your card to start seeing them.</p> : null}
          </div>
        </>
      ) : !err ? (
        <p className="ui-note">Loading…</p>
      ) : null}

      <div className="ui-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <h2 className="ui-h2" style={{ margin: 0 }}>
            Leads {leads ? `(${leads.length})` : ""}
          </h2>
          {csv ? (
            <a className="ui-btn-ghost" href={`/api/cards/${id}/leads/csv`}>
              Download CSV
            </a>
          ) : (
            <span className="ui-note">CSV download is on the Pro and Top plans</span>
          )}
        </div>
        {leads && leads.length ? (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>
                      <a href={`tel:${l.phone}`}>{l.phone}</a>
                    </td>
                    <td>{l.note}</td>
                    <td>{new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>
                      <button className="ui-x" type="button" onClick={() => delLead(l.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : leads ? (
          <p className="ui-note">No leads yet. People who use &quot;Share your number&quot; on your card show up here.</p>
        ) : null}
      </div>
    </main>
  );
}
