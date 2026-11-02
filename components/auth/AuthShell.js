import CardView from "../CardView";
import { THEMES, demoCard } from "../../lib/themes";

export function Brand({ light }) {
  return (
    <a className="au-brand" href="/" style={light ? { color: "#fff" } : undefined}>
      <span className="au-mark" aria-hidden="true">
        R
      </span>
      RAWONE Cards
    </a>
  );
}

// Split screen: form on the right, a live card on the left.
export default function AuthShell({ children }) {
  return (
    <main className="au">
      <aside className="au-side">
        <Brand light />
        <p className="au-pitch">Your visiting card, on every phone, with one tap.</p>
        <div className="au-phone" aria-hidden="true" inert>
          <div className="sr-screen">
            <CardView card={demoCard(THEMES[0])} preview />
          </div>
        </div>
      </aside>
      <section className="au-main">
        <div className="au-box">{children}</div>
      </section>
    </main>
  );
}
