import CardView from "../components/CardView";
import { Brand } from "../components/auth/AuthShell";
import { THEMES, demoCard } from "../lib/themes";

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
      <section className="ld-points">
        <div className="ui-panel ld-point">
          <h3>One tap to save</h3>
          <p>People save your number, email, website and photo straight into their contacts.</p>
        </div>
        <div className="ui-panel ld-point">
          <h3>Your brand, your colours</h3>
          <p>Pick a design, add your logo and brand colour. Text adjusts itself so it always reads well.</p>
        </div>
        <div className="ui-panel ld-point">
          <h3>Know what works</h3>
          <p>See NFC taps, QR scans and button clicks, and collect numbers from people who want a call back.</p>
        </div>
      </section>
      <footer className="ld-foot">
        RAWONE Cards · <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="mailto:support@rawone.in">support@rawone.in</a>
      </footer>
    </div>
  );
}
