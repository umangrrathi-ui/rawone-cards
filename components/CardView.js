"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { themeById } from "../lib/themes";
import { customVars, luminance } from "../lib/color";
import LeadForm from "./LeadForm";

const wa = (n) => `https://wa.me/${String(n).replace(/\D/g, "")}`;
const host = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
};
const mapsHref = (c) => c.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;

const DEFAULT_ORDER = ["call", "whatsapp", "maps", "email", "instagram", "website", "linkedin", "facebook", "youtube", "x"];

function allActions(card) {
  const map = {
    call: card.phone && { label: "Call", value: card.phone, href: `tel:${card.phone}` },
    whatsapp: card.whatsapp && { label: "WhatsApp", value: card.whatsapp, href: wa(card.whatsapp), ext: true },
    maps: (card.mapsUrl || card.address) && { label: "Location", value: card.address || "Open map", href: mapsHref(card), ext: true },
    email: card.email && { label: "Email", value: card.email, href: `mailto:${card.email}` },
    instagram: card.instagram && { label: "Instagram", value: `@${card.instagram}`, href: `https://instagram.com/${card.instagram}`, ext: true },
    website: card.website && { label: "Website", value: host(card.website), href: card.website, ext: true },
    linkedin: card.linkedin && { label: "LinkedIn", value: card.linkedin, href: `https://www.linkedin.com/in/${card.linkedin}`, ext: true },
    facebook: card.facebook && { label: "Facebook", value: card.facebook, href: `https://facebook.com/${card.facebook}`, ext: true },
    youtube: card.youtube && { label: "YouTube", value: card.youtube, href: `https://youtube.com/${card.youtube.startsWith("@") ? card.youtube : `@${card.youtube}`}`, ext: true },
    x: card.x && { label: "X", value: `@${card.x}`, href: `https://x.com/${card.x}`, ext: true },
  };
  const order = [...new Set([...(Array.isArray(card.order) ? card.order : []), ...DEFAULT_ORDER])];
  return order.filter((k) => map[k]).map((k) => ({ key: k, ...map[k] }));
}

export const actionsOf = (card) => allActions(card).slice(0, 5);

// Effect behind the photo. Plays once when the card opens, then stays still.
// fx: "glow" (soft lights bloom and settle) | "sparkle" (dust bursts out and fades) | "wave" (rings ripple out and fade)
const SPARKS = Array.from({ length: 30 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180; // golden-angle spread
  const r = 20 + ((i * 29) % 22); // final distance from the photo centre, in cqw
  return {
    x: `${(Math.cos(a) * r).toFixed(1)}cqw`,
    y: `${(Math.sin(a) * r).toFixed(1)}cqw`,
    s: `${5 + ((i * 7) % 10)}px`,
    d: `${(0.35 + ((i * 53) % 100) / 100).toFixed(2)}s`,
    round: i % 3 === 0,
  };
});

function Bloom({ fx }) {
  if (fx === "sparkle") {
    return (
      <div className="m-bloom m-fx-sparkle" aria-hidden="true">
        <span className="m-glow m-glow1" />
        {SPARKS.map((p, i) => (
          <span key={i} className={p.round ? "m-dust" : "m-spark"} style={{ "--x": p.x, "--y": p.y, "--s": p.s, "--d": p.d }} />
        ))}
      </div>
    );
  }
  if (fx === "wave") {
    return (
      <div className="m-bloom m-fx-wave" aria-hidden="true">
        {[0.3, 0.75, 1.2].map((d) => (
          <span key={d} className="m-wave" style={{ "--d": `${d}s` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="m-bloom m-fx-glow" aria-hidden="true">
      <span className="m-glow m-glow1" />
      <span className="m-glow m-glow2" />
      <span className="m-glow m-glow3" />
    </div>
  );
}

const REASONS = [
  ["fake", "Fake profile"],
  ["scam", "Scam or fraud"],
  ["impersonation", "Pretending to be someone else"],
  ["offensive", "Offensive content"],
  ["other", "Something else"],
];

function Report({ slug, preview }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("");
  async function send(e) {
    e.preventDefault();
    if (preview) return;
    const f = new FormData(e.currentTarget);
    setState("sending");
    const r = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, reason: f.get("reason"), note: f.get("note") }) }).catch(() => null);
    setState(r && r.ok ? "sent" : "error");
  }
  if (state === "sent") return <p className="m-report-done">Thanks. RAWONE will review this card.</p>;
  if (!open)
    return (
      <button type="button" className="m-report-link" onClick={() => setOpen(true)}>
        <Icon name="flag" size={14} /> Report this card
      </button>
    );
  return (
    <form className="m-report" onSubmit={send}>
      <label className="m-field">
        <span>What&apos;s wrong?</span>
        <select name="reason" required defaultValue="">
          <option value="" disabled>
            Choose a reason
          </option>
          {REASONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="m-field">
        <span>Details (optional)</span>
        <input name="note" maxLength={300} />
      </label>
      {state === "error" ? <p className="m-err">Could not send. Try again.</p> : null}
      <button className="m-send" type="submit" disabled={state === "sending"}>
        Send report
      </button>
    </form>
  );
}

// Neutral portrait placeholder, shown until a real photo is uploaded.
function Silhouette() {
  return (
    <svg className="m-sil" viewBox="0 0 200 240" aria-hidden="true" focusable="false">
      <circle cx="100" cy="92" r="44" />
      <path d="M18 240c4-52 38-84 82-84s78 32 82 84z" />
    </svg>
  );
}

/**
 * One-screen mobile card. `preview` disables links, tracking and the form
 * (used by the showroom and the admin live preview).
 */
export default function CardView({ card, preview = false }) {
  const t = themeById(card.theme);
  const every = allActions(card);
  const acts = every.slice(0, 5);
  const more = every.slice(5);
  const vars = customVars(card, t.bg);
  const fx = card.fx && card.fx !== "auto" ? card.fx : t.fx;
  const spots = card.logoSpots || "both";
  const topLogo = card.logo && (spots === "both" || spots === "top");
  const badgeLogo = card.logo && (spots === "both" || spots === "badge");
  const [wideLogo, setWideLogo] = useState(false);
  const [logoTone, setLogoTone] = useState(null);
  const logoRef = useRef(null);
  const measureLogo = (img) => {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 24;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, 24, 24);
      const px = g.getImageData(0, 0, 24, 24).data;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 40) continue;
        sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        n++;
      }
      setLogoTone(n ? (sum / n < 110 ? "dark" : sum / n > 170 ? "light" : "mid") : null);
    } catch {
      setLogoTone(null);
    }
  };
  const checkLogo = (img) => img && img.naturalWidth && setWideLogo(img.naturalWidth / img.naturalHeight > 2.2);
  useEffect(() => {
    const img = logoRef.current;
    if (img?.complete && img.naturalWidth) {
      checkLogo(img);
      measureLogo(img); // the image can finish loading before React attaches onLoad
    } else if (!card.logo) {
      setWideLogo(false);
      setLogoTone(null);
    }
  }, [card.logo]);
  // Dark logo on a dark card (or the reverse) disappears: measure the logo once and add a plate behind it.
  const bgDark = card.bg1 ? luminance(card.bg1) < 0.22 : t.mode === "dark";
  const plateSetting = card.logoPlate || "auto"; // auto | on | off
  const autoPlate = (logoTone === "dark" && bgDark) || (logoTone === "light" && !bgDark) ? (bgDark ? "light" : "dark") : null;
  const plate = plateSetting === "on" ? "custom" : plateSetting === "auto" ? autoPlate : null;
  const plateColor = plate === "custom" ? card.logoBg || "#ffffff" : undefined;
  const logoScale = (card.logoSize || 100) / 100;
  const photoScale = (card.photoSize || 100) / 100;
  const photoZoom = (card.photoZoom || 100) / 100;
  const photoY = card.photoY ?? 30;
  const photoX = card.photoX ?? 50;
  // Optional day/night tint, picked from the visitor's own clock after load (so server and browser markup match).
  const [tod, setTod] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!card.dayNight) return setTod(null);
      const h = new Date().getHours() + new Date().getMinutes() / 60;
      setTod(h >= 5.5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 19.5 ? "dusk" : "night");
    }, 0);
    return () => clearTimeout(t);
  }, [card.dayNight]);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState("");
  const closeRef = useRef(null);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!sheet) return;
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);

  const closeSheet = () => {
    setSheet(false);
    moreRef.current?.focus();
  };

  async function share() {
    if (preview) return;
    const url = location.origin + location.pathname;
    try {
      if (navigator.share) await navigator.share({ title: card.name, text: card.title || "", url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
        setTimeout(() => setToast(""), 1800);
      }
    } catch {
      /* user closed the share sheet */
    }
  }

  const link = (href, ext) => (preview ? { href: "#", onClick: (e) => e.preventDefault() } : { href, ...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {}) });
  const hasDetails = true;

  return (
    <div className="m-wrap">
      <article className={`m t-${t.id}`} data-layout={t.layout} data-mode={t.mode} data-motion={card.motion === "still" ? "still" : undefined} style={vars}>
        <div className="m-bg" aria-hidden="true" />
        {tod ? <div className="m-tod" data-tod={tod} aria-hidden="true" /> : null}
        <div className="m-screen">
          <header className="m-top" data-in data-logopos={card.logoPos || "left"} style={{ "--i": 0 }}>
            <span className={`m-brand${wideLogo ? " is-wide" : ""}`}>
              {topLogo ? (
                <span className={`m-logo-wrap${plate ? ` has-plate is-${plate}` : ""}`} style={plateColor ? { background: plateColor } : undefined}>
                  <img
                    ref={logoRef}
                    className="m-logo"
                    src={card.logo}
                    alt={wideLogo ? card.company || "Logo" : ""}
                    style={{ height: `${28 * logoScale}px` }}
                    onLoad={(e) => {
                      checkLogo(e.currentTarget);
                      measureLogo(e.currentTarget);
                    }}
                  />
                </span>
              ) : null}
              {card.company ? <span className="m-co">{card.company}</span> : null}
            </span>
            <button type="button" className="m-icon-btn" onClick={share} aria-label="Share this card">
              <Icon name="share" size={18} />
            </button>
          </header>

          <section className="m-hero">
            <div className="m-ph">
              {fx !== "none" ? <Bloom fx={fx} /> : null}
              <div className={`m-photo${card.photo ? "" : " is-empty"}`} style={{ "--ps": photoScale }}>
                {card.photo ? (
                  <img
                    src={card.photo}
                    alt={card.name}
                    style={{ objectPosition: `${photoX}% ${photoY}%`, transform: photoZoom !== 1 ? `scale(${photoZoom})` : undefined, transformOrigin: `${photoX}% ${photoY}%` }}
                  />
                ) : (
                  <Silhouette />
                )}
              </div>
              {badgeLogo && !wideLogo ? (
                <span className="m-badge">
                  <img src={card.logo} alt="" />
                </span>
              ) : null}
            </div>
            <div className="m-id">
              <h1 className="m-name" data-in style={{ "--i": 1 }}>
                {card.name}
              </h1>
              {card.title ? (
                <p className="m-title" data-in style={{ "--i": 2 }}>
                  {card.title}
                </p>
              ) : null}
              {card.tagline ? (
                <p className="m-tag" data-in style={{ "--i": 3 }}>
                  {card.tagline}
                </p>
              ) : null}
            </div>
          </section>

          {acts.length ? (
            <nav className="m-acts" aria-label="Contact options">
              {acts.map((a, i) => (
                <a key={a.key} className="m-act" data-track={preview ? undefined : a.key} data-in style={{ "--i": 4 + i * 0.6 }} {...link(a.href, a.ext)}>
                  <span className="m-chip">
                    <Icon name={a.key} size={21} />
                  </span>
                  <span className="m-lbl">{a.label}</span>
                </a>
              ))}
            </nav>
          ) : null}

          <footer className="m-dock" data-in style={{ "--i": 7 }}>
            <a className="m-save" data-track={preview ? undefined : "save"} {...(preview ? link("#") : { href: `/api/vcard/${card.slug}`, download: `${card.slug}.vcf` })}>
              <Icon name="save" size={20} />
              <span>Save contact</span>
            </a>
            {hasDetails ? (
              <button ref={moreRef} type="button" className="m-more" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet} aria-label="More details">
                <Icon name="more" size={22} />
              </button>
            ) : null}
          </footer>
        </div>

        <div className={`m-sheet-wrap${sheet ? " is-open" : ""}`} aria-hidden={!sheet}>
          <div className="m-scrim" onClick={closeSheet} />
          <div className="m-sheet" role="dialog" aria-modal="true" aria-label={`More about ${card.name}`} inert={!sheet}>
            <div className="m-grab" aria-hidden="true" />
            <div className="m-sheet-head">
              <div className="m-sheet-id">
                {card.logo ? <img className="m-sheet-logo" src={card.logo} alt="" /> : null}
                <div>
                  <h2 className="m-sheet-h">{card.name}</h2>
                  {card.company ? <p className="m-sheet-co">{card.company}</p> : null}
                </div>
              </div>
              <button ref={closeRef} type="button" className="m-icon-btn" onClick={closeSheet} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </div>
            {card.about ? <p className="m-about">{card.about}</p> : null}
            <ul className="m-rows">
              {card.address ? (
                <li>
                  <a {...link(mapsHref(card), true)} data-track={preview ? undefined : "maps"}>
                    <Icon name="maps" size={20} />
                    <span>{card.address}</span>
                  </a>
                </li>
              ) : null}
              {card.hours ? (
                <li>
                  <span className="m-row">
                    <Icon name="clock" size={20} />
                    <span>{card.hours}</span>
                  </span>
                </li>
              ) : null}
              {card.email ? (
                <li>
                  <a {...link(`mailto:${card.email}`)} data-track={preview ? undefined : "email"}>
                    <Icon name="email" size={20} />
                    <span>{card.email}</span>
                  </a>
                </li>
              ) : null}
              {card.website ? (
                <li>
                  <a {...link(card.website, true)} data-track={preview ? undefined : "website"}>
                    <Icon name="website" size={20} />
                    <span>{host(card.website)}</span>
                  </a>
                </li>
              ) : null}
              {more.map((a) => (
                <li key={a.key}>
                  <a {...link(a.href, a.ext)} data-track={preview ? undefined : a.key}>
                    <Icon name={a.key} size={20} />
                    <span>{a.label}</span>
                  </a>
                </li>
              ))}
            </ul>
            {card.leadForm !== false ? <LeadForm slug={card.slug} name={card.name} preview={preview} /> : null}
            <div className="m-sheet-foot">
              {card.footer !== false ? (
                <a className="m-powered" href="https://rawone.in" target="_blank" rel="noopener noreferrer">
                  Powered by RAWONE
                </a>
              ) : null}
              <Report slug={card.slug} preview={preview} />
            </div>
          </div>
        </div>

        {toast ? (
          <p className="m-toast" role="status">
            {toast}
          </p>
        ) : null}
      </article>
    </div>
  );
}
