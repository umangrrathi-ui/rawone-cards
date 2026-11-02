"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CardView from "../CardView";
import { THEMES } from "../../lib/themes";
import { api } from "../../lib/client";

const BRAND = ["#1f3c88", "#0e7c86", "#7a1f2b", "#c9a24b", "#0f7b5f", "#2347d9", "#e8501a", "#1b1d22"];
const BGS = [
  ["Navy", "#0a1a33", "#23315f"],
  ["Ice", "#ffffff", "#d7eefa"],
  ["Emerald", "#0b2a22", "#0f3f4a"],
  ["Graphite", "#16181c", "#2b3039"],
  ["Sand", "#f5efe6", "#e9dccb"],
  ["Blush", "#fdf2f4", "#f1d6e1"],
  ["Plum", "#1a1326", "#3a1c4a"],
  ["Mint", "#f2fbf7", "#cdeee1"],
];
const TABS = [
  ["details", "Details"],
  ["images", "Photo & logo"],
  ["style", "Style"],
  ["share", "Share & publish"],
];
const SECTIONS = [
  ["About you", [["name", "Name", { required: true, maxLength: 80 }], ["title", "Designation", { maxLength: 80 }], ["company", "Company", { maxLength: 80 }], ["tagline", "One-line pitch", { maxLength: 140, wide: true, hint: "Shows under your name. Keep it to one or two lines." }]]],
  ["Contact", [["phone", "Call number", { inputMode: "tel" }], ["whatsapp", "WhatsApp number", { inputMode: "tel" }], ["email", "Email", { type: "email" }], ["website", "Website", { placeholder: "example.com" }]]],
  ["Location", [["address", "Address", { wide: true, maxLength: 200 }], ["mapsUrl", "Google Maps link", { placeholder: "https://maps.app.goo.gl/…" }], ["hours", "Timing", { placeholder: "Mon–Sat, 10–7", maxLength: 80 }]]],
  ["Social", [["instagram", "Instagram", { placeholder: "username" }], ["linkedin", "LinkedIn", { placeholder: "profile link or name" }], ["facebook", "Facebook", { placeholder: "page link" }], ["youtube", "YouTube", { placeholder: "@channel" }], ["x", "X (Twitter)", { placeholder: "username" }]]],
];

// Shrinks a photo in the browser so uploads stay well under 3 MB.
function shrink(file, kind) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error("Upload a JPG, PNG or WebP image"));
    if (file.size > 15 * 1024 * 1024) return reject(new Error("That file is too big. Use one under 15 MB."));
    const img = new Image();
    img.onload = () => {
      const max = kind === "logo" ? 800 : 1600;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(kind === "logo" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => reject(new Error("That file is not a valid image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function Editor({ initial, host }) {
  const router = useRouter();
  const [tab, setTab] = useState("details");
  const [theme, setTheme] = useState(initial.card.theme);
  const [slug, setSlug] = useState(initial.card.slug);
  const [status, setStatus] = useState(initial.card.status);
  const [data, setData] = useState(initial.card.data);
  const [style, setStyle] = useState(initial.card.style);
  const [img, setImg] = useState({ photo: initial.view.photo, logo: initial.view.logo });
  const [links, setLinks] = useState(initial.links);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [errors, setErrors] = useState({});
  const [confirmDel, setConfirmDel] = useState(false);
  const id = initial.card.id;

  useEffect(() => {
    const warn = (e) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const preview = useMemo(
    () => ({ slug, code: initial.card.code, theme, ...data, ...style, photo: img.photo, logo: img.logo, footer: initial.view.footer }),
    [slug, theme, data, style, img, initial]
  );

  const setD = (k, v) => {
    setData((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };
  const setS = (patch) => {
    setStyle((s) => ({ ...s, ...patch }));
    setDirty(true);
  };

  async function save(extra = {}) {
    setBusy("save");
    setMsg({ text: "", ok: true });
    setErrors({});
    try {
      const r = await api(`/api/cards/${id}`, { method: "PUT", body: { theme, data, style, slug, ...extra } });
      setData(r.card.data);
      setStyle(r.card.style);
      setSlug(r.card.slug);
      setStatus(r.card.status);
      setLinks(r.links);
      setDirty(false);
      setMsg({ text: extra.status === "live" ? "Published. Your card is live." : extra.status === "off" ? "Unpublished." : "Saved", ok: true });
      router.refresh();
    } catch (e) {
      setErrors(e.data?.errors || {});
      setMsg({ text: e.message, ok: false });
    } finally {
      setBusy("");
    }
  }

  async function upload(kind, file) {
    setBusy(kind);
    setMsg({ text: "", ok: true });
    try {
      const image = file ? await shrink(file, kind) : null;
      const r = await api(`/api/cards/${id}/upload`, { body: { kind, image } });
      setImg({ photo: r.view.photo, logo: r.view.logo });
      setMsg({ text: file ? (kind === "logo" ? "Logo updated" : "Photo updated") : "Removed", ok: true });
    } catch (e) {
      setMsg({ text: e.message, ok: false });
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await api(`/api/cards/${id}`, { method: "DELETE" });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setMsg({ text: e.message, ok: false });
      setBusy("");
    }
  }

  const copy = (t) => navigator.clipboard?.writeText(t).then(() => setMsg({ text: "Copied", ok: true }));

  const field = ([k, label, o = {}]) => (
    <label key={k} className={`ui-field${o.wide ? " is-wide" : ""}`}>
      <span>
        {label}
        {o.required ? " *" : ""}
      </span>
      <input
        className="ui-in"
        value={data[k] || ""}
        onChange={(e) => setD(k, e.target.value)}
        type={o.type || "text"}
        inputMode={o.inputMode}
        placeholder={o.placeholder}
        maxLength={o.maxLength || 200}
        aria-invalid={errors[k] ? "true" : undefined}
      />
      {o.hint && !errors[k] ? <small>{o.hint}</small> : null}
      {errors[k] ? <span className="ui-err">{errors[k]}</span> : null}
    </label>
  );

  return (
    <main className="ui-page">
      <div className="ui-head">
        <div>
          <a href="/dashboard" className="ui-note">
            ← Your cards
          </a>
          <h1 className="ui-h1" style={{ marginTop: 6 }}>
            {data.name || "Untitled card"}
          </h1>
          <p className="ui-sub">
            <span className="ui-status" data-s={status}>
              {{ draft: "Draft, not public yet", live: "Live", off: "Unpublished", blocked: "Blocked by RAWONE" }[status]}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="ui-btn-ghost" href={`/dashboard/cards/${id}/stats`}>
            Stats & leads
          </a>
          {status === "live" ? (
            <a className="ui-btn-ghost" href={`/${slug}`} target="_blank" rel="noopener noreferrer">
              Open card
            </a>
          ) : null}
          {status !== "live" && status !== "blocked" ? (
            <button className="ui-btn" type="button" disabled={!!busy} onClick={() => save({ status: "live" })}>
              Publish
            </button>
          ) : null}
        </div>
      </div>

      <div className="ed">
        <section>
          <div className="ed-tabs" role="tablist">
            {TABS.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>

          <div className="ui-panel">
            {tab === "details" ? (
              <>
                {SECTIONS.map(([title, fields]) => (
                  <div key={title}>
                    <h2 className="ed-sect">{title}</h2>
                    <div className="ed-grid">{fields.map(field)}</div>
                  </div>
                ))}
                <h2 className="ed-sect">More about you</h2>
                <label className="ui-field">
                  <span>About</span>
                  <textarea className="ui-in" value={data.about || ""} maxLength={600} onChange={(e) => setD("about", e.target.value)} />
                  <small>Shows in the details sheet when someone taps the ••• button.</small>
                </label>
                <h2 className="ed-sect">Leads</h2>
                <label className="ed-check">
                  <input type="checkbox" checked={data.leadForm !== false} onChange={(e) => setD("leadForm", e.target.checked)} />
                  <span>Show a &quot;Share your number with me&quot; form. Numbers land in Stats & leads.</span>
                </label>
              </>
            ) : null}

            {tab === "images" ? (
              <>
                <h2 className="ed-sect">Your photo</h2>
                <div className="ed-up">
                  <div className="ed-thumb" style={img.photo ? { backgroundImage: `url(${img.photo})` } : undefined} />
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className="ui-btn-ghost">
                      {busy === "photo" ? "Uploading…" : img.photo ? "Change photo" : "Upload photo"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files[0] && upload("photo", e.target.files[0])} />
                    </label>
                    {img.photo ? (
                      <button className="ui-x" type="button" onClick={() => upload("photo", null)}>
                        Remove photo
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="ui-note" style={{ marginTop: 10 }}>
                  A clear, front-facing photo works best. JPG, PNG or WebP, up to 3 MB.
                </p>

                <h2 className="ed-sect">Company logo</h2>
                <div className="ed-up">
                  <div className="ed-thumb is-logo" style={img.logo ? { backgroundImage: `url(${img.logo})` } : undefined} />
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className="ui-btn-ghost">
                      {busy === "logo" ? "Uploading…" : img.logo ? "Change logo" : "Upload logo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files[0] && upload("logo", e.target.files[0])} />
                    </label>
                    {img.logo ? (
                      <button className="ui-x" type="button" onClick={() => upload("logo", null)}>
                        Remove logo
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="ui-note" style={{ marginTop: 10 }}>
                  A PNG with a transparent background looks best.
                </p>
                <h2 className="ed-sect">Where the logo shows</h2>
                <div className="ed-seg" role="group" aria-label="Logo position">
                  {[
                    ["both", "Top bar + photo"],
                    ["top", "Top bar"],
                    ["badge", "Photo badge"],
                    ["off", "Hide"],
                  ].map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={(style.logoSpots || "both") === v} onClick={() => setS({ logoSpots: v })}>
                      {l}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {tab === "style" ? (
              <>
                <h2 className="ed-sect">Design</h2>
                <div className="ed-themes">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="ed-theme"
                      aria-pressed={theme === t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setDirty(true);
                      }}
                    >
                      <i style={{ background: `linear-gradient(135deg, ${t.bg} 62%, ${t.accent} 62%)`, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }} />
                      <b>{t.name}</b>
                      <span>{t.for}</span>
                    </button>
                  ))}
                </div>

                <h2 className="ed-sect">Brand colour</h2>
                <div className="ed-sw">
                  <div className="ed-seg">
                    <button type="button" aria-pressed={!style.brand} onClick={() => setS({ brand: "" })}>
                      Design default
                    </button>
                  </div>
                  {BRAND.map((c) => (
                    <button key={c} type="button" className="ed-dot" style={{ background: c }} aria-label={`Brand colour ${c}`} aria-pressed={style.brand === c} onClick={() => setS({ brand: c })} />
                  ))}
                  <label className="ed-pick">
                    Custom
                    <input type="color" value={style.brand || "#2347d9"} onChange={(e) => setS({ brand: e.target.value })} />
                  </label>
                </div>

                <h2 className="ed-sect">Background</h2>
                <div className="ed-sw">
                  <div className="ed-seg">
                    <button type="button" aria-pressed={!style.bg1} onClick={() => setS({ bg1: "", bg2: "" })}>
                      Design default
                    </button>
                  </div>
                  {BGS.map(([n, a, b]) => (
                    <button
                      key={n}
                      type="button"
                      className="ed-dot is-sq"
                      style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }}
                      aria-label={`${n} background`}
                      aria-pressed={style.bg1 === a}
                      onClick={() => setS({ bg1: a, bg2: b })}
                    />
                  ))}
                </div>
                <div className="ed-sw" style={{ marginTop: 12 }}>
                  <label className="ed-pick">
                    Colour 1
                    <input type="color" value={style.bg1 || "#0a1a33"} onChange={(e) => setS({ bg1: e.target.value, bg2: style.bg2 || e.target.value })} />
                  </label>
                  <label className="ed-pick">
                    Colour 2
                    <input type="color" value={style.bg2 || "#23315f"} onChange={(e) => setS({ bg1: style.bg1 || "#0a1a33", bg2: e.target.value })} />
                  </label>
                </div>
                <p className="ui-note" style={{ marginTop: 10 }}>
                  Text turns light or dark on its own so it always stays readable.
                </p>

                <h2 className="ed-sect">Background motion</h2>
                <div className="ed-seg">
                  {[
                    ["drift", "Slow colour shift"],
                    ["still", "Still"],
                  ].map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={(style.motion || "drift") === v} onClick={() => setS({ motion: v })}>
                      {l}
                    </button>
                  ))}
                </div>

                <h2 className="ed-sect">Photo effect when the card opens</h2>
                <div className="ed-seg">
                  {[
                    ["auto", "Design default"],
                    ["sparkle", "Sparkle"],
                    ["wave", "Wave"],
                    ["glow", "Glow"],
                    ["none", "None"],
                  ].map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={(style.fx || "auto") === v} onClick={() => setS({ fx: v })}>
                      {l}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {tab === "share" ? (
              <>
                <h2 className="ed-sect">Your card link</h2>
                <div className="ed-link">
                  <span>{host}/</span>
                  <input
                    className="ui-in"
                    value={slug}
                    maxLength={40}
                    aria-invalid={errors.slug ? "true" : undefined}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                      setDirty(true);
                    }}
                  />
                </div>
                {errors.slug ? <p className="ui-err">{errors.slug}</p> : <p className="ui-note">Lowercase letters, numbers and hyphens. Your NFC card and QR keep working if you change it.</p>}
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button className="ui-btn-ghost" type="button" onClick={() => copy(links.page)}>
                    Copy link
                  </button>
                  {status === "live" ? (
                    <button className="ui-btn-ghost" type="button" disabled={!!busy} onClick={() => save({ status: "off" })}>
                      Unpublish
                    </button>
                  ) : status !== "blocked" ? (
                    <button className="ui-btn" type="button" disabled={!!busy} onClick={() => save({ status: "live" })}>
                      Publish
                    </button>
                  ) : null}
                </div>

                <h2 className="ed-sect">QR code</h2>
                <div className="ed-up">
                  <img src={`/api/cards/${id}/qr`} alt="QR code for this card" width={120} height={120} style={{ borderRadius: 10, border: "1px solid var(--ui-line)" }} />
                  <div style={{ display: "grid", gap: 8 }}>
                    <a className="ui-btn-ghost" href={`/api/cards/${id}/qr?format=png`}>
                      Download PNG
                    </a>
                    <a className="ui-btn-ghost" href={`/api/cards/${id}/qr`}>
                      Download SVG (for print)
                    </a>
                  </div>
                </div>

                <h2 className="ed-sect">NFC card link</h2>
                <p className="ui-note">This permanent link goes on the NFC chip. RAWONE writes it for you when you order a card.</p>
                <div className="ed-link" style={{ marginTop: 8 }}>
                  <input className="ui-in" readOnly value={links.nfc} onFocus={(e) => e.target.select()} />
                  <button className="ui-btn-ghost" type="button" style={{ border: 0, borderLeft: "1px solid var(--ui-line)", borderRadius: 0 }} onClick={() => copy(links.nfc)}>
                    Copy
                  </button>
                </div>

                <h2 className="ed-sect">Delete this card</h2>
                {confirmDel ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="ui-note">This deletes the card, its stats and leads. It can&apos;t be undone.</span>
                    <button className="ui-btn-bad" type="button" disabled={busy === "delete"} onClick={remove}>
                      Yes, delete it
                    </button>
                    <button className="ui-btn-ghost" type="button" onClick={() => setConfirmDel(false)}>
                      Keep it
                    </button>
                  </div>
                ) : (
                  <button className="ui-btn-bad" type="button" onClick={() => setConfirmDel(true)}>
                    Delete card
                  </button>
                )}
              </>
            ) : null}
          </div>

          <div className="ed-bar">
            <button className="ui-btn-2" type="button" disabled={!dirty || !!busy} onClick={() => save()}>
              {busy === "save" ? "Saving…" : "Save changes"}
            </button>
            <span className="ed-saved" role="status" style={msg.ok ? undefined : { color: "var(--ui-bad)" }}>
              {msg.text || (dirty ? "You have unsaved changes" : "All changes saved")}
            </span>
          </div>
        </section>

        <aside className="ed-preview" aria-label="Live preview">
          <div className="sr-phone">
            <div className="sr-screen">
              <CardView key={`${theme}-${style.fx}`} card={preview} preview />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
