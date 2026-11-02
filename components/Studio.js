"use client";
import { useState } from "react";
import CardView from "./CardView";
import { THEMES, demoCard } from "../lib/themes";

const BRAND = ["#1f3c88", "#0e7c86", "#7a1f2b", "#c9a24b", "#0f7b5f", "#2347d9", "#e8590c", "#1b1d22"];
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

// Live playground: pick a design, a brand colour and a background; the phone updates instantly.
export default function Studio() {
  const [theme, setTheme] = useState(THEMES[0].id);
  const [brand, setBrand] = useState("");
  const [bg, setBg] = useState(["", ""]);
  const [logo, setLogo] = useState(true);
  const base = demoCard(THEMES.find((t) => t.id === theme));
  const card = { ...base, brand, bg1: bg[0], bg2: bg[1], logo: logo ? base.logo : "" };

  return (
    <main className="st">
      <section className="st-panel" aria-label="Customise">
        <h1 className="st-title">Customise a card</h1>
        <p className="st-lede">Pick a design, then set the client&apos;s brand colour and background. Text colour adjusts itself so it stays readable.</p>

        <h2 className="st-h">Design</h2>
        <div className="st-designs">
          {THEMES.map((t) => (
            <button key={t.id} type="button" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
              {t.name}
            </button>
          ))}
        </div>

        <h2 className="st-h">Brand colour</h2>
        <div className="st-row">
          <button type="button" className="st-reset" aria-pressed={!brand} onClick={() => setBrand("")}>
            Design default
          </button>
          {BRAND.map((c) => (
            <button key={c} type="button" className="st-sw" style={{ background: c }} aria-label={`Brand colour ${c}`} aria-pressed={brand === c} onClick={() => setBrand(c)} />
          ))}
          <label className="st-pick">
            <span>Custom</span>
            <input type="color" value={brand || "#2347d9"} onChange={(e) => setBrand(e.target.value)} />
          </label>
        </div>

        <h2 className="st-h">Background</h2>
        <div className="st-row">
          <button type="button" className="st-reset" aria-pressed={!bg[0]} onClick={() => setBg(["", ""])}>
            Design default
          </button>
          {BGS.map(([n, a, b]) => (
            <button
              key={n}
              type="button"
              className="st-sw st-sw2"
              style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }}
              aria-label={`${n} background`}
              aria-pressed={bg[0] === a}
              onClick={() => setBg([a, b])}
            />
          ))}
        </div>
        <div className="st-row">
          <label className="st-pick">
            <span>Colour 1</span>
            <input type="color" value={bg[0] || "#0a1a33"} onChange={(e) => setBg([e.target.value, bg[1] || e.target.value])} />
          </label>
          <label className="st-pick">
            <span>Colour 2</span>
            <input type="color" value={bg[1] || "#23315f"} onChange={(e) => setBg([bg[0] || "#0a1a33", e.target.value])} />
          </label>
        </div>

        <h2 className="st-h">Logo</h2>
        <label className="st-check">
          <input type="checkbox" checked={logo} onChange={(e) => setLogo(e.target.checked)} />
          <span>Show the company logo (top bar, photo badge and details sheet)</span>
        </label>
      </section>

      <section className="st-preview" aria-label="Preview">
        <div className="sr-phone">
          <div className="sr-screen">
            <CardView key={theme} card={card} preview />
          </div>
        </div>
      </section>
    </main>
  );
}
