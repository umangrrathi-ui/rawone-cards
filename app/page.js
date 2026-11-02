import CardView from "../components/CardView";
import { Brand } from "../components/auth/AuthShell";
import { THEMES, demoCard } from "../lib/themes";

export const metadata = {
  title: "RAWONE Cards: digital visiting card with NFC and QR",
  description: "Make a digital visiting card in minutes. Share by NFC tap, QR or WhatsApp. One-tap Save contact, lead capture and simple stats.",
};

const FEATURES = [
  ["One tap to save", "People save your number, email, website and photo straight into their contacts."],
  ["NFC and QR", "One link works from a tapped NFC card, a printed QR or a WhatsApp message."],
  ["Call back leads", "Visitors can leave their number. You see it in your dashboard. Details are stored encrypted."],
  ["Your brand", "Your logo, brand colour and photo. Text adjusts itself so it always reads well."],
  ["Edit any time", "Changed your number or clinic timing? Update once, every shared link shows it."],
  ["Simple stats", "See taps, scans and button clicks over time, so you know what works."],
  ["Private by design", "No ads, and visitor IDs are stored hashed. You can export or delete your data whenever you want."],
  ["Services and products", "Show what you offer with photos. Coming soon."],
];

const PLAN_CARDS = [
  { name: "Free", for: "Try it, no card needed", items: ["1 card", "All designs", "Save contact and lead form", "30 days of stats"], cta: "Start free" },
  { name: "Pro", for: "For working professionals", items: ["3 cards", "No RAWONE footer", "Leads export (CSV)", "180 days of stats"], cta: "Start free, upgrade later", hot: true },
  { name: "Top", for: "For clinics, shops and teams", items: ["5 cards", "Everything in Pro", "360 days of stats", "Google review helper"], cta: "Start free, upgrade later" },
];

const FAQ = [
  ["Do I need an NFC card?", "No. The QR code and link work on every phone. An NFC card just makes sharing a single tap."],
  ["Does the other person need an app?", "No. Your card opens in their phone browser."],
  ["Can I write the NFC card myself?", "On Android Chrome you can write a tag straight from the editor. On iPhone, ask us or use any NFC writer app with your link."],
  ["Can I change my card later?", "Yes, any time. Your link and QR stay the same."],
  ["Who sees the numbers people leave?", "Only you. They are stored encrypted, and visitors must tick consent before sending."],
];

export default function Home() {
  const a = THEMES.find((t) => t.id === "clinic");
  const b = THEMES.find((t) => t.id === "executive");
  return (
    <div className="ui">
      <header className="ui-top">
        <Brand />
        <div className="ui-top-right">
          <a className="ui-btn-ghost" href="/login">
            Log in
          </a>
          <a className="ui-btn" href="/signup">
            Create your card
          </a>
        </div>
      </header>
      <section className="ld-hero">
        <div>
          <h1 className="ld-h">Your visiting card, on every phone.</h1>
          <p className="ld-p">
            Tap an NFC card or scan a QR and your card opens on their phone: photo, call, WhatsApp, location and a Save contact button. Update it any time,
            and see who opened it.
          </p>
          <div className="ld-cta">
            <a className="ui-btn" href="/signup">
              Create your card, free
            </a>
            <a className="ui-btn-ghost" href="/showroom">
              See the designs
            </a>
          </div>
        </div>
        <div className="ld-phones" aria-hidden="true" inert>
          <div className="sr-phone">
            <div className="sr-screen">
              <CardView card={demoCard(a)} preview />
            </div>
          </div>
          <div className="sr-phone">
            <div className="sr-screen">
              <CardView card={demoCard(b)} preview />
            </div>
          </div>
        </div>
      </section>
      <section className="ld-sec" id="how">
        <h2 className="ld-h2">Ready in five minutes</h2>
        <ol className="ld-steps">
          <li className="ui-panel">
            <b>1</b>
            <h3>Build your card</h3>
            <p>Add your photo, logo and details. Pick a design and your brand colour.</p>
          </li>
          <li className="ui-panel">
            <b>2</b>
            <h3>Publish your link</h3>
            <p>Get your own link and QR code, like card.rawone.co.in/yourname.</p>
          </li>
          <li className="ui-panel">
            <b>3</b>
            <h3>Tap, scan, share</h3>
            <p>Write it onto an NFC card, print the QR, or send it on WhatsApp.</p>
          </li>
        </ol>
      </section>
      <section className="ld-sec" id="features">
        <h2 className="ld-h2">Everything a visiting card should do</h2>
        <div className="ld-grid">
          {FEATURES.map(([t, d]) => (
            <div className="ui-panel ld-point" key={t}>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="ld-sec" id="who">
        <h2 className="ld-h2">Made for people who meet customers</h2>
        <div className="ld-chips">
          {["Doctors & clinics", "Jewellers", "Real estate", "CAs & lawyers", "Sales teams", "Salons & restaurants", "Consultants"].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <p className="ld-note">A normal card gets lost in a drawer. This one brings the customer back to you: one tap to call, WhatsApp or leave their number.</p>
      </section>
      <section className="ld-sec" id="plans">
        <h2 className="ld-h2">Start free. Grow when you need to.</h2>
        <div className="ld-plans">
          {PLAN_CARDS.map((pl) => (
            <div className={`ui-panel ld-plan${pl.hot ? " is-hot" : ""}`} key={pl.name}>
              <h3>{pl.name}</h3>
              <p className="ld-plan-for">{pl.for}</p>
              <ul>
                {pl.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <a className={pl.hot ? "ui-btn" : "ui-btn-ghost"} href="/signup">
                {pl.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="ld-note">Paid plans are activated by our team. Write to support@rawone.in to upgrade.</p>
      </section>
      <section className="ld-sec ld-faq" id="faq">
        <h2 className="ld-h2">Questions</h2>
        {FAQ.map(([q, a]) => (
          <details className="ui-panel" key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <section className="ld-final">
        <h2>Your card, live in five minutes.</h2>
        <a className="ui-btn" href="/signup">
          Create your card, free
        </a>
      </section>
      <footer className="ld-foot">
        RAWONE Cards · <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="mailto:support@rawone.in">support@rawone.in</a>
      </footer>
    </div>
  );
}
