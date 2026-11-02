"use client";
import { useEffect, useRef } from "react";

// Cloudflare Turnstile widget. Renders nothing when no site key is configured.
export default function Turnstile({ siteKey }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!siteKey) return;
    const render = () => window.turnstile?.render(ref.current, { sitekey: siteKey, theme: "light" });
    if (window.turnstile) render();
    else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }
  }, [siteKey]);
  if (!siteKey) return null;
  return <div ref={ref} />;
}

export const turnstileToken = (form) => form.querySelector('[name="cf-turnstile-response"]')?.value || "";
