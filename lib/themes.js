import { DEMO_LOGOS } from "./demoLogos";

// Corporate one-screen designs. Look lives in styles/themes.css under `.t-<id>`.
// layout: "cover" (photo fills the top) | "center" (round photo, centred) | "left" (left-aligned, square photo)

export const THEMES = [
  {
    id: "executive", fx: "sparkle", bg: "#0a1a33", name: "Executive Navy", for: "Founders & directors", layout: "cover", mode: "dark",
    note: "Deep navy that drifts towards indigo, a champagne hairline and a full-width portrait.",
    demo: { name: "Vikram Desai", title: "Managing Director", company: "Desai Realty Group", tagline: "Residential and commercial projects across Ahmedabad since 2004.", address: "Iscon Cross Road, SG Highway, Ahmedabad", hours: "Mon–Sat, 10–7" },
  },
  {
    id: "clinic", fx: "wave", bg: "#ffffff", name: "Clinic White", for: "Doctors & clinics", layout: "center", mode: "light",
    note: "White that slowly washes into ice blue and mint. Calm, clinical, trustworthy.",
    demo: { name: "Dr. Meera Shah", title: "MD, Consultant Physician", company: "Shah Family Clinic", tagline: "Diabetes, thyroid and BP care. Evening OPD on all weekdays.", address: "Sunrise Complex, Satellite, Ahmedabad", hours: "Mon–Sat, 10–1 and 5–8" },
  },
  {
    id: "emerald", fx: "sparkle", bg: "#0b2a22", name: "Emerald Private", for: "Jewellers & wealth advisors", layout: "center", mode: "dark",
    note: "Bottle green shifting to deep teal, a champagne arch around the portrait and a classic serif name.",
    demo: { name: "Harsh Soni", title: "Director", company: "Soni Fine Jewellers", tagline: "Certified diamonds and bridal jewellery, by appointment.", address: "CG Road, Navrangpura, Ahmedabad", hours: "11 am – 8 pm, Wed closed" },
  },
  {
    id: "graphite", fx: "wave", bg: "#16181c", name: "Graphite", for: "Sales & corporate teams", layout: "left", mode: "dark",
    note: "Charcoal moving through slate and steel. Left-aligned, sharp and quiet.",
    demo: { name: "Aditya Rao", title: "Regional Sales Manager, West", company: "Velocity Lubricants Ltd.", tagline: "Dealer and distributor enquiries for Gujarat and Rajasthan.", address: "Corporate Road, Prahlad Nagar, Ahmedabad", hours: "Mon–Sat, 9.30–6.30" },
  },
  {
    id: "counsel", fx: "glow", bg: "#efeeeb", name: "Counsel", for: "CAs, lawyers & consultants", layout: "left", mode: "light",
    note: "Soft stone that warms to sand, a burgundy accent and a book-face serif.",
    demo: { name: "CA Pooja Bhatt", title: "Partner", company: "Bhatt & Associates", tagline: "Audit, GST and compliance for growing businesses.", address: "Ashram Road, Ahmedabad", hours: "Mon–Fri, 10–6.30" },
  },
  {
    id: "horizon", fx: "glow", bg: "#eef4ff", name: "Horizon", for: "Real estate & consultants", layout: "cover", mode: "light",
    note: "A pale sky that drifts from blue to lavender to aqua, with cobalt buttons.",
    demo: { name: "Ananya Kapoor", title: "Senior Property Advisor", company: "Horizon Homes", tagline: "3 and 4 BHK homes in Shela, Bopal and South Bopal.", address: "Bopal, Ahmedabad", hours: "Site visits all week" },
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

export function demoCard(t) {
  const slug = `demo-${t.id}`;
  return {
    slug,
    code: slug,
    theme: t.id,
    phone: "+919825000000",
    whatsapp: "+919825000000",
    email: "hello@example.com",
    website: "https://example.com",
    instagram: "example",
    mapsUrl: "https://maps.google.com",
    leadForm: true,
    photo: "",
    logo: DEMO_LOGOS[t.id] || "",
    about: "",
    ...t.demo,
  };
}

export function initials(name) {
  const clean = String(name || "")
    .replace(/^(dr|ca|adv|ar|prof|pt|chef|dj|mr|mrs|ms)\.?\s+/i, "")
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
