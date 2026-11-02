"use client";
import { useEffect } from "react";

// Logs one view per page load and every tap on a [data-track] link.
// The ?s=n / ?s=q marker from NFC/QR redirects is stripped so shared links don't inherit it.
export default function Tracker({ slug }) {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get("s");
    const src = s === "n" ? "nfc" : s === "q" ? "qr" : "link";
    if (s) {
      params.delete("s");
      const qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : "") + location.hash);
    }
    const send = (type) => {
      const body = JSON.stringify({ slug, type, src });
      const blob = new Blob([body], { type: "application/json" });
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/t", blob))) {
        fetch("/api/t", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    };
    send("view");
    const onClick = (e) => {
      const a = e.target.closest?.("[data-track]");
      if (a) send(a.getAttribute("data-track"));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [slug]);
  return null;
}
