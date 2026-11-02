"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { themeById } from "../lib/themes";
import { customVars } from "../lib/color";
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

export function actionsOf(card) {
  const a = [];
  if (card.phone) a.push({ key: "call", label: "Call", href: `tel:${card.phone}` });
  if (card.whatsapp) a.push({ key: "whatsapp", label: "WhatsApp", href: wa(card.whatsapp), ext: true });
  if (card.mapsUrl || card.address) a.push({ key: "maps", label: "Location", href: mapsHref(card), ext: true });
  if (card.email) a.push({ key: "email", label: "Email", href: `mailto:${card.email}` });
  if (card.instagram) a.push({ key: "instagram", label: "Instagram", href: `https://instagram.com/${card.instagram}`, ext: true });
  if (card.website) a.push({ key: "website", label: "Website", href: card.website, ext: true });
  return a.slice(0, 5);
}

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
  const acts = actionsOf(card);
  const vars = customVars(card, t.bg);
  const [wideLogo, setWideLogo] = useState(false);
  const logoRef = useRef(null);
  const checkLogo = (img) => img && img.naturalWidth && setWideLogo(img.naturalWidth / img.naturalHeight > 2.2);
  useEffect(() => {
    if (logoRef.current?.complete) checkLogo(logoRef.current);
    else if (!card.logo) setWideLogo(false);
  }, [card.logo]);
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
  const hasDetails = card.about || card.address || card.hours || card.website || card.email || card.leadForm;

  return (
    <div className="m-wrap">
      <article className={`m t-${t.id}`} data-layout={t.layout} data-mode={t.mode} style={vars}>
        <div className="m-bg" aria-hidden="true" />
        <div className="m-screen">
          <header className="m-top" data-in style={{ "--i": 0 }}>
            <span className={`m-brand${wideLogo ? " is-wide" : ""}`}>
              {card.logo ? (
                <img
                  ref={logoRef}
                  className="m-logo"
                  src={card.logo}
                  alt={wideLogo ? card.company || "Logo" : ""}
                  onLoad={(e) => checkLogo(e.currentTarget)}
                />
              ) : null}
              {card.company ? <span className="m-co">{card.company}</span> : null}
            </span>
            <button type="button" className="m-icon-btn" onClick={share} aria-label="Share this card">
              <Icon name="share" size={18} />
            </button>
          </header>

          <section className="m-hero">
            <div className="m-ph">
              <Bloom fx={t.fx} />
              <div className={`m-photo${card.photo ? "" : " is-empty"}`}>
                {card.photo ? <img src={card.photo} alt={card.name} /> : <Silhouette />}
              </div>
              {card.logo && !wideLogo ? (
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
            </ul>
            {card.leadForm ? <LeadForm slug={card.slug} name={card.name} preview={preview} /> : null}
            <a className="m-powered" href="https://rawone.in" target="_blank" rel="noopener noreferrer">
              Powered by RAWONE
            </a>
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
