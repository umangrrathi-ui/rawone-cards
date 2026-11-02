import CardView from "../../components/CardView";
import ShowroomFilter from "../../components/ShowroomFilter";
import { THEMES, demoCard } from "../../lib/themes";

export const metadata = { title: "Card designs · RAWONE Cards" };

export default function Showroom() {
  return (
    <main className="sr">
      <header className="sr-head">
        <h1 className="sr-title">{THEMES.length} card designs</h1>
        <p className="sr-lede">
          Each card opens on the phone when someone taps the NFC card or scans the QR. Tap the dots button on any phone to see the
          details sheet.
        </p>
        <ShowroomFilter groups={[...new Set(THEMES.map((t) => t.for))]} />
      </header>
      <ol className="sr-grid">
        {THEMES.map((t) => (
          <li className="sr-item" key={t.id} data-for={t.for} id={t.id}>
            <div className="sr-phone">
              <div className="sr-screen">
                <CardView card={demoCard(t)} preview />
              </div>
            </div>
            <div className="sr-meta">
              <h2 className="sr-name">{t.name}</h2>
              <p className="sr-for">{t.for}</p>
              <p className="sr-note">{t.note}</p>
              <a className="sr-open" href={`/showroom/${t.id}`}>
                Open full screen
              </a>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
