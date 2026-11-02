// Fictional logo marks for the showroom demos only. Real cards use the client's uploaded logo.
const svg = (body, vb = "0 0 48 48") =>
  "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="${vb}">${body}</svg>`);

export const DEMO_LOGOS = {
  // Desai Realty Group: stacked towers
  executive: svg(`<rect x="6" y="18" width="10" height="24" rx="1.5" fill="#dcc391"/><rect x="19" y="8" width="10" height="34" rx="1.5" fill="#f4f6fa"/><rect x="32" y="14" width="10" height="28" rx="1.5" fill="#dcc391" opacity=".6"/>`),
  // Shah Family Clinic: soft cross
  clinic: svg(`<circle cx="24" cy="24" r="22" fill="#0e7c86"/><path d="M20 12h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="#fff"/>`),
  // Soni Fine Jewellers: faceted gem
  emerald: svg(`<path d="M12 10h24l8 10-20 22L4 20z" fill="none" stroke="#d8c08e" stroke-width="2.4" stroke-linejoin="round"/><path d="M4 20h40M18 10l-4 10 10 22 10-22-4-10" fill="none" stroke="#d8c08e" stroke-width="1.6" stroke-linejoin="round"/>`),
  // Velocity Lubricants: speed chevrons
  graphite: svg(`<path d="M6 10h10l12 14-12 14H6l12-14z" fill="#6e95ff"/><path d="M22 10h10l12 14-12 14H22l12-14z" fill="#f2f3f5"/>`),
  // Bhatt & Associates: pillars
  counsel: svg(`<path d="M24 4 44 14H4z" fill="#7a1f2b"/><rect x="8" y="18" width="5" height="20" fill="#7a1f2b"/><rect x="21.5" y="18" width="5" height="20" fill="#7a1f2b"/><rect x="35" y="18" width="5" height="20" fill="#7a1f2b"/><rect x="4" y="40" width="40" height="4" fill="#7a1f2b"/>`),
  // Horizon Homes: roof over horizon
  horizon: svg(`<path d="M6 26 24 10l18 16" fill="none" stroke="#2347d9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 34h28M16 41h16" stroke="#2347d9" stroke-width="4" stroke-linecap="round" opacity=".55"/>`),
};
