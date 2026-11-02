"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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

// Shrinks a photo in the browser so uploads stay well under 3 MB. Logos also lose their empty transparent border.
function shrink(file, kind) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error("Upload a JPG, PNG or WebP image"));
    if (file.size > 15 * 1024 * 1024) return reject(new Error("That file is too big. Use one under 15 MB."));
    const img = new Image();
    img.onload = () => {
      const max = kind === "logo" ? 800 : 1600;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      let c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      if (kind === "logo") {
        try {
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          const w = x1 - x0 + 1, h = y1 - y0 + 1;
          if (x1 >= 0 && (w < c.width * 0.97 || h < c.height * 0.97)) {
            const out = document.createElement("canvas");
            out.width = w;
            out.height = h;
            out.getContext("2d").drawImage(c, x0, y0, w, h, 0, 0, w, h);
            c = out;
          }
        } catch {
          /* keep the untrimmed logo */
        }
      }
      resolve({ url: kind === "logo" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.88), w: img.width, h: img.height });
    };
    img.onerror = () => reject(new Error("That file is not a valid image"));
    img.src = URL.createObjectURL(file);
  });
}

// Picks the most colourful, frequent colour of a logo (skips white, black and greys) so the owner can match the card to it.
function logoColour(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 48;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(im, 0, 0, 48, 48);
        const d = g.getImageData(0, 0, 48, 48).data;
        const bins = new Map();
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 128) continue;
          const [r, gg, b] = [d[i], d[i + 1], d[i + 2]];
          const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
          if (mx < 40 || mn > 225 || mx - mn < 40) continue;
          const k = `${r >> 5},${gg >> 5},${b >> 5}`;
          const o = bins.get(k) || { n: 0, r: 0, g: 0, b: 0 };
          o.n++; o.r += r; o.g += gg; o.b += b;
          bins.set(k, o);
        }
        let best = null;
        for (const o of bins.values()) if (!best || o.n > best.n) best = o;
        resolve(best ? "#" + [best.r, best.g, best.b].map((v) => Math.round(v / best.n).toString(16).padStart(2, "0")).join("") : null);
      } catch {
        resolve(null);
      }
    };
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

const clamp100 = (n) => Math.max(0, Math.min(100, Math.round(n)));

// Drag the picture inside the frame to choose what shows; arrow keys work too.
function CropBox({ src, x, y, zoom, aspect, onChange }) {
  const frame = useRef(null);
  const imgRef = useRef(null);
  const drag = useRef(null);
  const size = () => {
    const f = frame.current;
    const i = imgRef.current;
    if (!f || !i || !i.naturalWidth) return null;
    const fw = f.clientWidth;
    const fh = f.clientHeight;
    const s0 = Math.max(fw / i.naturalWidth, fh / i.naturalHeight);
    return { fw, fh, W: (i.naturalWidth * s0 * zoom) / 100, H: (i.naturalHeight * s0 * zoom) / 100 };
  };
  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, x, y };
  };
  const move = (e) => {
    const d = drag.current;
    const m = size();
    if (!d || !m) return;
    const nx = Math.abs(m.W - m.fw) > 1 ? d.x + ((e.clientX - d.sx) / (m.fw - m.W)) * 100 : d.x;
    const ny = Math.abs(m.H - m.fh) > 1 ? d.y + ((e.clientY - d.sy) / (m.fh - m.H)) * 100 : d.y;
    onChange({ photoX: clamp100(nx), photoY: clamp100(ny) });
  };
  const key = (e) => {
    const step = e.shiftKey ? 8 : 3;
    const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (!map[e.key]) return;
    e.preventDefault();
    onChange({ photoX: clamp100(x + map[e.key][0]), photoY: clamp100(y + map[e.key][1]) });
  };
  return (
    <div
      ref={frame}
      className="ed-crop"
      style={{ aspectRatio: aspect }}
      tabIndex={0}
      role="group"
      aria-label="Photo frame. Drag, or use the arrow keys, to move the picture."
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={key}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt="" draggable={false} style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom / 100})`, transformOrigin: `${x}% ${y}%` }} />
    </div>
  );
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
  const [rev, setRev] = useState(initial.card.rev);
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

  // ---- undo history (changes made within 0.7s count as one step)
  const hist = useRef([]);
  const grouping = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const snap = () => {
    if (grouping.current) return;
    grouping.current = true;
    setTimeout(() => (grouping.current = false), 700);
    hist.current.push({ data, style, theme });
    if (hist.current.length > 30) hist.current.shift();
    setCanUndo(true);
  };
  const undo = () => {
    const h = hist.current.pop();
    setCanUndo(hist.current.length > 0);
    if (!h) return;
    setData(h.data);
    setStyle(h.style);
    setTheme(h.theme);
    setDirty(true);
  };

  const setD = (k, v) => {
    snap();
    setData((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };
  const setS = (patch) => {
    snap();
    setStyle((s) => ({ ...s, ...patch }));
    setDirty(true);
  };
  const pickTheme = (t) => {
    snap();
    setTheme(t);
    setDirty(true);
  };

  // ---- autosave: content saves itself 1.5s after you stop; the link (slug) and publishing stay explicit
  const [slugDirty, setSlugDirty] = useState(false);
  const stopAuto = useRef(false);
  const inflight = useRef(false);
  const version = useRef(0);
  useEffect(() => {
    version.current++;
    if (!dirty || stopAuto.current) return;
    const t = setTimeout(async () => {
      if (inflight.current) return;
      inflight.current = true;
      const v = version.current;
      setBusy("auto");
      try {
        const r = await api(`/api/cards/${id}`, { method: "PUT", body: { theme, data, style, rev } });
        setRev(r.card.rev);
        if (v === version.current) {
          setData(r.card.data);
          setStyle(r.card.style);
          setDirty(false);
        }
        setErrors({});
        setMsg({ text: "Saved automatically", ok: true });
      } catch (e) {
        stopAuto.current = true; // don't retry in a loop; the next edit or Save tries again
        setErrors(e.data?.errors || {});
        setMsg({ text: e.message, ok: false });
      } finally {
        inflight.current = false;
        setBusy((b) => (b === "auto" ? "" : b));
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [data, style, theme, dirty, id, rev]);

  async function save(extra = {}) {
    setBusy("save");
    setMsg({ text: "", ok: true });
    setErrors({});
    stopAuto.current = false;
    try {
      const r = await api(`/api/cards/${id}`, { method: "PUT", body: { theme, data, style, slug, rev, ...extra } });
      setData(r.card.data);
      setStyle(r.card.style);
      setSlug(r.card.slug);
      setStatus(r.card.status);
      setRev(r.card.rev);
      setLinks(r.links);
      setDirty(false);
      setSlugDirty(false);
      setMsg({ text: extra.status === "live" ? "Published. Your card is live." : extra.status === "off" ? "Unpublished." : "Saved", ok: true });
      router.refresh();
    } catch (e) {
      setErrors(e.data?.errors || {});
      setMsg({ text: e.message, ok: false, conflict: !!e.data?.conflict });
    } finally {
      setBusy("");
    }
  }

  async function upload(kind, file) {
    setBusy(kind);
    setMsg({ text: "", ok: true });
    try {
      const out = file ? await shrink(file, kind) : null;
      const r = await api(`/api/cards/${id}/upload`, { body: { kind, image: out ? out.url : null } });
      setImg({ photo: r.view.photo, logo: r.view.logo });
      let text = file ? (kind === "logo" ? "Logo updated" : "Photo updated. Drag it below to place your face.") : "Removed";
      let ok = true;
      if (out && kind === "photo" && Math.min(out.w, out.h) < 600) {
        text = "Photo updated, but it is small and may look blurry. A bigger photo (at least 800 px) looks sharper.";
        ok = false;
      }
      if (out && kind === "photo") setS({ photoX: 50, photoY: 30, photoZoom: 100 });
      setMsg({ text, ok });
    } catch (e) {
      setMsg({ text: e.message, ok: false });
    } finally {
      setBusy("");
    }
  }

  // ---- colour picked from the logo
  const [logoCol, setLogoCol] = useState(null);
  useEffect(() => {
    let live = true;
    if (!img.logo) {
      const t = setTimeout(() => live && setLogoCol(null), 0);
      return () => {
        live = false;
        clearTimeout(t);
      };
    }
    logoColour(img.logo).then((c) => live && setLogoCol(c));
    return () => {
      live = false;
    };
  }, [img.logo]);

  // ---- live check of the card link
  const [slugState, setSlugState] = useState({ s: "", ok: null, reason: "" });
  useEffect(() => {
    if (!slugDirty || slug.length < 3) return;
    const t = setTimeout(async () => {
      try {
        const r = await api(`/api/cards/slug?id=${id}&s=${encodeURIComponent(slug)}`, { method: "GET" });
        setSlugState({ s: slug, ok: !!r.ok, reason: r.reason || "" });
      } catch (e) {
        setSlugState({ s: slug, ok: false, reason: e.data?.reason || e.message });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [slug, slugDirty, id]);

  const [showQr, setShowQr] = useState(false);
  const [showPrev, setShowPrev] = useState(false);

  // Web NFC: only Chrome-based browsers on Android can write a tag from a web page.
  const [nfcOk, setNfcOk] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setNfcOk("NDEFReader" in window), 0);
    return () => clearTimeout(t);
  }, []);
  async function writeNfc() {
    setBusy("nfc");
    setMsg({ text: "Hold the NFC card against the back of your phone…", ok: true });
    try {
      const ndef = new window.NDEFReader();
      await ndef.write({ records: [{ recordType: "url", data: links.nfc }] });
      setMsg({ text: "Done. The card now opens your page when tapped.", ok: true });
    } catch (e) {
      setMsg({ text: e?.name === "NotAllowedError" ? "NFC permission was denied. Allow NFC for this site and try again." : "Couldn't write the card. Hold it steady against the phone and try again.", ok: false });
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

      {(() => {
        const steps = [
          ["Add your photo", !!img.photo, "images"],
          ["Add your logo", !!img.logo, "images"],
          ["Add your phone number", !!data.phone, "details"],
          ["Choose a design", true, "style"],
          ["Publish your card", status === "live", "share"],
        ];
        const done = steps.filter((x) => x[1]).length;
        if (done === steps.length || status === "blocked") return null;
        return (
          <section className="ed-check" aria-label="Getting started">
            <div className="ed-check-top">
              <b>Get your card ready</b>
              <span>
                {done} of {steps.length} done
              </span>
            </div>
            <div className="ed-check-bar" aria-hidden="true">
              <i style={{ width: `${(done / steps.length) * 100}%` }} />
            </div>
            <ul>
              {steps.map(([label, ok, to]) => (
                <li key={label} data-ok={ok}>
                  <button type="button" onClick={() => setTab(to)} disabled={ok}>
                    <span aria-hidden="true">{ok ? "✓" : "○"}</span> {label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {showQr ? (
        <div className="ed-qrfull" role="dialog" aria-modal="true" aria-label="Your QR code" onClick={() => setShowQr(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/cards/${id}/qr?format=png&inline=1`} alt="QR code for your card" />
          <p>{data.name}</p>
          <small>Let them scan this with their camera. Tap anywhere to close.</small>
        </div>
      ) : null}

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
                <h2 className="ed-sect">Crop and move the photo</h2>
                {img.photo ? (
                  <>
                    <p className="ui-note">Drag the picture to move it. If your head is touching the top, set Zoom below 100% and drag the picture down to make room.</p>
                    <CropBox
                      src={img.photo}
                      x={style.photoX ?? 50}
                      y={style.photoY ?? 30}
                      zoom={style.photoZoom ?? 100}
                      aspect={(THEMES.find((t) => t.id === theme)?.layout === "cover") ? "4 / 5" : "1 / 1"}
                      onChange={setS}
                    />
                    <div className="ed-ranges" style={{ marginTop: 14 }}>
                      <label>
                        <span>Zoom</span>
                        <input type="range" min="80" max="250" step="1" value={style.photoZoom ?? 100} onChange={(e) => setS({ photoZoom: +e.target.value })} />
                        <output>{style.photoZoom ?? 100}%</output>
                      </label>
                      <label>
                        <span>Size on card</span>
                        <input type="range" min="70" max="130" step="1" value={style.photoSize ?? 100} onChange={(e) => setS({ photoSize: +e.target.value })} />
                        <output>{style.photoSize ?? 100}%</output>
                      </label>
                      <button type="button" className="ui-x" onClick={() => setS({ photoSize: 100, photoZoom: 100, photoX: 50, photoY: 30 })}>
                        Reset photo
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="ui-note">Upload a photo to crop and move it.</p>
                )}
                <h2 className="ed-sect">Adjust logo</h2>
                {img.logo ? (
                  <>
                    <div className="ed-stepper" role="group" aria-label="Logo size">
                      <span>Logo size</span>
                      <button type="button" aria-label="Make logo smaller" onClick={() => setS({ logoSize: Math.max(40, (style.logoSize ?? 100) - 10) })}>
                        −
                      </button>
                      <output>{style.logoSize ?? 100}%</output>
                      <button type="button" aria-label="Make logo bigger" onClick={() => setS({ logoSize: Math.min(160, (style.logoSize ?? 100) + 10) })}>
                        +
                      </button>
                    </div>
                    <div className="ed-ranges" style={{ marginTop: 10 }}>
                      <label>
                        <span>Fine size</span>
                        <input type="range" min="40" max="160" step="1" value={style.logoSize ?? 100} onChange={(e) => setS({ logoSize: +e.target.value })} />
                        <output>{style.logoSize ?? 100}%</output>
                      </label>
                    </div>

                    <h3 className="ed-sub">Logo position</h3>
                    <div className="ed-seg" role="group" aria-label="Logo position in the top bar">
                      {[
                        ["left", "Left"],
                        ["center", "Center"],
                        ["right", "Right"],
                      ].map(([v, l]) => (
                        <button key={v} type="button" aria-pressed={(style.logoPos || "left") === v} onClick={() => setS({ logoPos: v })}>
                          {l}
                        </button>
                      ))}
                    </div>

                    <h3 className="ed-sub">Logo background</h3>
                    <div className="ed-seg" role="group" aria-label="Logo background">
                      {[
                        ["auto", "Auto"],
                        ["on", "On"],
                        ["off", "Off"],
                      ].map(([v, l]) => (
                        <button key={v} type="button" aria-pressed={(style.logoPlate || "auto") === v} onClick={() => setS({ logoPlate: v })}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <p className="ui-note" style={{ marginTop: 6 }}>
                      Auto adds a light or dark background only when the logo would be hard to see.
                    </p>
                    {(style.logoPlate || "auto") === "on" ? (
                      <div className="lg-swatches" role="group" aria-label="Logo background colour">
                        {["#ffffff", "#f3f4f6", "#0e1118", "#e8501a", "#c9a24b", "#1f3c88"].map((c) => (
                          <button key={c} type="button" className="lg-sw" style={{ background: c }} aria-label={`Background ${c}`} aria-pressed={(style.logoBg || "#ffffff") === c} onClick={() => setS({ logoBg: c })} />
                        ))}
                        <label className="lg-sw-custom">
                          Custom
                          <input type="color" value={style.logoBg || "#ffffff"} onChange={(e) => setS({ logoBg: e.target.value })} />
                        </label>
                      </div>
                    ) : null}
                    <button type="button" className="ui-x" style={{ marginTop: 14 }} onClick={() => setS({ logoSize: 100, logoPos: "left", logoPlate: "auto", logoBg: "" })}>
                      Reset logo
                    </button>
                  </>
                ) : (
                  <p className="ui-note">Upload a logo to adjust it.</p>
                )}
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
                        pickTheme(t.id);
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
                {logoCol ? (
                  <div style={{ marginTop: 10 }}>
                    <button className="ui-btn-ghost" type="button" onClick={() => setS({ brand: logoCol })}>
                      <span className="lg-dot" style={{ background: logoCol }} aria-hidden="true" /> Use my logo colour
                    </button>
                  </div>
                ) : null}
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

                <h2 className="ed-sect">Day and night colour</h2>
                <p className="ui-note">The card softly changes its tint with the visitor&apos;s time of day: warm in the morning and evening, darker at night.</p>
                <div className="ed-seg" style={{ marginTop: 8 }} role="group" aria-label="Day and night colour">
                  {[
                    [false, "Off"],
                    [true, "On"],
                  ].map(([v, l]) => (
                    <button key={l} type="button" aria-pressed={!!style.dayNight === v} onClick={() => setS({ dayNight: v })}>
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
                      setSlugDirty(true);
                    }}
                  />
                </div>
                {errors.slug ? (
                  <p className="ui-err">{errors.slug}</p>
                ) : slugDirty && slugState.s === slug && slugState.ok === true ? (
                  <p className="ui-ok">{host}/{slug} is available. Press Save changes to use it.</p>
                ) : slugDirty && slugState.s === slug && slugState.ok === false ? (
                  <p className="ui-err">{slugState.reason}</p>
                ) : (
                  <p className="ui-note">Lowercase letters, numbers and hyphens. Your NFC card and QR keep working if you change it.</p>
                )}
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

                <h2 className="ed-sect">Share your card</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a className="ui-btn-ghost" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Hi, here is my digital visiting card: ${links.page}`)}`}>
                    Send on WhatsApp
                  </a>
                  <button className="ui-btn-ghost" type="button" onClick={() => setShowQr(true)}>
                    Show my QR full screen
                  </button>
                </div>

                <h2 className="ed-sect">NFC card link</h2>
                <p className="ui-note">This permanent link goes on the NFC chip. RAWONE writes it for you when you order a card.</p>
                <div className="ed-link" style={{ marginTop: 8 }}>
                  <input className="ui-in" readOnly value={links.nfc} onFocus={(e) => e.target.select()} />
                  <button className="ui-btn-ghost" type="button" style={{ border: 0, borderLeft: "1px solid var(--ui-line)", borderRadius: 0 }} onClick={() => copy(links.nfc)}>
                    Copy
                  </button>
                </div>

                <h2 className="ed-sect">Write an NFC card yourself</h2>
                {nfcOk ? (
                  <>
                    <p className="ui-note">Have a blank NFC card or sticker? Tap the button, then hold it against the back of your phone.</p>
                    <button className="ui-btn-ghost" type="button" style={{ marginTop: 8 }} disabled={busy === "nfc"} onClick={writeNfc}>
                      {busy === "nfc" ? "Waiting for the card…" : "Write link to NFC card"}
                    </button>
                  </>
                ) : (
                  <p className="ui-note">Writing a card from the browser works on Android phones with Chrome. On iPhone or a computer, use an NFC writer app, or order a ready card from RAWONE.</p>
                )}

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
            <button className="ui-btn-2" type="button" disabled={(!dirty && !slugDirty) || busy === "save"} onClick={() => save()}>
              {busy === "save" ? "Saving…" : "Save changes"}
            </button>
            <button className="ui-btn-ghost" type="button" disabled={!canUndo} onClick={undo}>
              Undo
            </button>
            <button className="ui-btn-ghost ed-prev-open" type="button" onClick={() => setShowPrev(true)}>
              Preview
            </button>
            <span className="ed-saved" role="status" style={msg.ok ? undefined : { color: "var(--ui-bad)" }}>
              {msg.text || (slugDirty ? "Link change not saved yet" : busy === "auto" ? "Saving…" : dirty ? "Saving in a moment…" : "All changes saved")}
            </span>
          </div>
        </section>

        <aside className={`ed-preview${showPrev ? " is-shown" : ""}`} aria-label="Live preview">
          <button type="button" className="ed-prev-close" onClick={() => setShowPrev(false)}>
            Close preview
          </button>
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
