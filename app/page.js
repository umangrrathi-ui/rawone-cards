import "../styles/landing.css";
import TapStage from "../components/landing/TapStage";
import DesignPicker from "../components/landing/DesignPicker";
import { THEMES, demoCard } from "../lib/themes";

export const metadata = {
  title: "RAWONE Cards: digital visiting card with NFC and QR",
  description: "Make a digital visiting card in minutes. Share by NFC tap, QR or WhatsApp. One-tap Save contact, lead capture and simple stats.",
};

const PLANS = [
  { name: "Free", line: "Try it. No card needed.", items: ["1 card", "All designs", "Save contact and lead form", "30 days of stats"], cta: "Start free" },
  { name: "Pro", line: "For working professionals", items: ["3 cards", "No RAWONE footer", "Leads export (CSV)", "180 days of stats"], cta: "Start free, upgrade later", hot: true },
  { name: "Top", line: "For clinics, shops and teams", items: ["5 cards", "Everything in Pro", "360 days of stats", "Google review helper"], cta: "Start free, upgrade later" },
];

const FAQ = [
  ["Do I need an NFC card?", "No. The QR code and link work on every phone. An NFC card just makes sharing a single tap."],
  ["Does the other person need an app?", "No. Your card opens in their phone browser."],
  ["Can I write the NFC card myself?", "On Android Chrome you can write a tag straight from the editor. On iPhone, ask us or use any NFC writer app with your link."],
  ["Can I change my card later?", "Yes, any time. Your link and QR stay the same."],
  ["Who sees the numbers people leave?", "Only you. They are stored encrypted, and visitors must tick consent before sending."],
];

export default function Home() {
  const hero = demoCard(THEMES.find((t) => t.id === "clinic"));
  return (
    <div className="lp">
      <header className="lp-top">
        <a className="lp-brand" href="/">
          <span aria-hidden="true">R</span>
          RAWONE Cards
        </a>
        <nav aria-label="Main">
          <a href="#looks">Designs</a>
          <a href="#plans">Plans</a>
          <a href="#faq">Questions</a>
        </nav>
        <div className="lp-top-r">
          <a className="lp-link" href="/login">
            Log in
          </a>
          <a className="lp-btn" href="/signup">
            Create your card
          </a>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <h1>
            Tap once.
            <br />
            They have you saved.
          </h1>
          <p>
            A digital visiting card for doctors, jewellers, property agents and sales teams. Share it with an NFC tap, a QR or WhatsApp. People save your number
            and can leave theirs.
          </p>
          <div className="lp-cta">
            <a className="lp-btn lp-btn-lg" href="/signup">
              Create your card, free
            </a>
            <a className="lp-link" href="/showroom">
              See all designs
            </a>
          </div>
          <ul className="lp-proof">
            <li>Ready in 5 minutes</li>
            <li>Works on every phone</li>
            <li>Your data stays encrypted</li>
          </ul>
        </div>
        <TapStage card={hero} />
      </section>

      <section className="lp-looks" id="looks">
        <div className="lp-looks-copy">
          <h2>A look that fits your work</h2>
          <p>A clinic should feel calm. A jeweller should feel rich. Pick a design, add your logo and brand colour, and the text keeps itself readable.</p>
        </div>
        <DesignPicker />
      </section>

      <section className="lp-bento" aria-label="What the card does">
        <article className="b-save">
          <h3>One tap, saved in their contacts</h3>
          <p>Name, number, email, website and photo go straight into the phone book. No typing, no lost cards.</p>
          <div className="bv-contact" aria-hidden="true">
            <i>MS</i>
            <span>
              <b>Dr. Meera Shah</b>
              <small>+91 98250 00000</small>
            </span>
            <em>Saved</em>
          </div>
        </article>
        <article className="b-leads">
          <h3>Customers leave their number</h3>
          <p>A short form on your card. You see every lead in your dashboard, stored encrypted.</p>
          <ul className="bv-leads" aria-hidden="true">
            <li>
              <b>Rahul P.</b>
              <small>Call back today</small>
            </li>
            <li>
              <b>Neha S.</b>
              <small>Evening slot</small>
            </li>
          </ul>
        </article>
        <article className="b-edit">
          <h3>Change it once</h3>
          <p>New number or clinic timing? Update the card and every shared link shows it.</p>
        </article>
        <article className="b-stats">
          <h3>See what works</h3>
          <p>Taps, scans and button clicks over time.</p>
          <div className="bv-bars" aria-hidden="true">
            {[30, 46, 38, 62, 52, 78, 70].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </article>
        <article className="b-nfc">
          <h3>NFC, QR and WhatsApp</h3>
          <p>One link, three ways to share.</p>
        </article>
        <article className="b-soon">
          <h3>Services and products</h3>
          <p>Show what you offer with photos. Coming soon.</p>
        </article>
      </section>

      <section className="lp-steps" aria-label="How it works">
        <h2>From sign-up to your first tap</h2>
        <ol>
          <li>
            <b>Build</b>
            <span>Photo, logo, details, design.</span>
          </li>
          <li>
            <b>Publish</b>
            <span>Get your link and QR.</span>
          </li>
          <li>
            <b>Share</b>
            <span>Write an NFC card, print the QR, or send it on WhatsApp.</span>
          </li>
        </ol>
      </section>

      <section className="lp-plans" id="plans">
        <h2>Start free. Grow when you need to.</h2>
        <div className="lp-plan-row">
          {PLANS.map((p) => (
            <div className={`lp-plan${p.hot ? " is-hot" : ""}`} key={p.name}>
              <h3>{p.name}</h3>
              <p className="lp-plan-line">{p.line}</p>
              <ul>
                {p.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <a className={p.hot ? "lp-btn" : "lp-btn lp-btn-ghost"} href="/signup">
                {p.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="lp-fine">Paid plans are activated by our team. Write to support@rawone.in to upgrade.</p>
      </section>

      <section className="lp-faq" id="faq">
        <h2>Questions</h2>
        <div>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2>Your card, live in five minutes.</h2>
        <a className="lp-btn lp-btn-dark lp-btn-lg" href="/signup">
          Create your card, free
        </a>
      </section>

      <footer className="lp-foot">
        <span>RAWONE Cards</span>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="mailto:support@rawone.in">support@rawone.in</a>
      </footer>
    </div>
  );
}
