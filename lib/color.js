// Small colour helpers for per-card custom colours. Keeps text readable whatever the client picks.

export const HEX = /^#[0-9a-f]{6}$/i;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

export function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}

const isDark = (hex) => luminance(hex) < 0.22;

/**
 * Turns a card's custom colours into CSS variable overrides.
 * brand = buttons/accents, bg1 + bg2 = the two background colours the card drifts between.
 */
export function customVars(card, themeBg) {
  const v = {};
  const brand = HEX.test(card.brand || "") ? card.brand : null;
  const bg1 = HEX.test(card.bg1 || "") ? card.bg1 : null;
  const bg2 = HEX.test(card.bg2 || "") ? card.bg2 : bg1;

  if (bg1) {
    const dark = isDark(bg1);
    const ink = dark ? "#f5f6f8" : "#14171f";
    v["--p1"] = bg1;
    v["--p4"] = mix(bg1, bg2, 0.35);
    v["--p2"] = mix(bg2, dark ? "#ffffff" : "#ffffff", dark ? 0.12 : 0.25);
    v["--p3"] = mix(bg2, bg1, 0.4);
    v["--ink"] = ink;
    v["--ink2"] = dark ? "rgba(245,246,248,.8)" : "rgba(20,23,31,.76)";
    v["--muted"] = dark ? "rgba(245,246,248,.62)" : "rgba(20,23,31,.6)";
    v["--line"] = dark ? "rgba(255,255,255,.12)" : "rgba(20,23,31,.08)";
    v["--glass"] = dark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.6)";
    v["--chip"] = dark ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.85)";
    v["--ph1"] = mix(bg1, bg2, 0.6);
    v["--ph2"] = bg1;
    v["--sil"] = dark ? "rgba(255,255,255,.18)" : "rgba(20,23,31,.12)";
    v["--sheet"] = dark ? mix(bg1, "#ffffff", 0.06) : "#ffffff";
    v["--sheet-ink"] = dark ? "#f5f6f8" : "#14171f";
    v["--sheet-line"] = dark ? "rgba(255,255,255,.1)" : "rgba(20,23,31,.08)";
    v["--sheet-soft"] = dark ? "rgba(255,255,255,.05)" : mix(bg1, "#ffffff", 0.6);
  }
  if (brand) {
    const base = bg1 || (HEX.test(themeBg || "") ? themeBg : null);
    // keep the brand colour, but nudge it if it would vanish on the background
    let a = brand;
    if (base && contrast(a, base) < 2.2) a = mix(brand, isDark(base) ? "#ffffff" : "#000000", 0.35);
    const ink = contrast("#ffffff", a) >= contrast("#14171f", a) ? "#ffffff" : "#14171f";
    v["--accent"] = a;
    v["--accent-ink"] = ink;
    v["--chip-ink"] = a;
    v["--sheet-accent"] = a;
    v["--sheet-accent-ink"] = ink;
    v["--bloom1"] = a;
    v["--focus"] = a;
  }
  if (bg2) {
    v["--bloom2"] = mix(bg2, bg1 && isDark(bg1) ? "#ffffff" : "#000000", 0.08);
    v["--bloom3"] = mix(bg2, bg1 || bg2, 0.5);
  }
  return v;
}
