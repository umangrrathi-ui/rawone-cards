import NewCard from "../../components/dash/NewCard";
import CardView from "../../components/CardView";
import { currentUser } from "../../lib/auth";
import { listMyCards } from "../../lib/cards";
import { limitsOf } from "../../lib/plans";
import { baseUrl } from "../../lib/api";

const STATUS = { draft: "Draft", live: "Live", off: "Unpublished", blocked: "Blocked by RAWONE" };

export default async function Dashboard() {
  const user = await currentUser();
  const cards = await listMyCards(user.id);
  const lim = limitsOf(user);
  const full = cards.length >= lim.cards;
  const host = baseUrl().replace(/^https?:\/\//, "");
  const views = cards.reduce((n, c) => n + Number(c.views30), 0);
  const leads = cards.reduce((n, c) => n + Number(c.leads), 0);
  const first = String(user.name || "").trim().split(/\s+/)[0];
  return (
    <main className="ui-page">
      <section className="dh">
        <div className="dh-copy">
          <h1 className="dh-h">{first ? `Welcome back, ${first}` : "Welcome back"}</h1>
          <p>
            {cards.length} of {lim.cards} cards on the {lim.label} plan
          </p>
          {cards.length ? <NewCard disabled={full} reason={full ? "Card limit reached for your plan" : ""} /> : null}
        </div>
        <dl className="dh-stats">
          <div>
            <dt>Views, 30 days</dt>
            <dd>{views}</dd>
          </div>
          <div>
            <dt>Leads</dt>
            <dd>{leads}</dd>
          </div>
          <div>
            <dt>Live cards</dt>
            <dd>{cards.filter((c) => c.status === "live").length}</dd>
          </div>
        </dl>
      </section>
      {cards.length === 0 ? (
        <div className="ui-empty">
          <h2 className="ui-h2" style={{ margin: 0 }}>
            Make your first card
          </h2>
          <p className="ui-note">Pick a design, add your details and photo, then share it with a link, QR code or NFC card.</p>
          <NewCard label="Create my card" />
        </div>
      ) : (
        <div className="ui-cards">
          {cards.map((c) => (
            <a className="ui-card" key={c.id} href={`/dashboard/cards/${c.id}`}>
              <div className="ui-thumb" aria-hidden="true" inert>
                <div className="ui-thumb-screen">
                  <div className="ui-thumb-inner sr-screen">
                    <CardView card={{ slug: c.slug, code: c.code, theme: c.theme, ...c.data, ...c.style, photo: c.photo, logo: c.logo }} preview />
                  </div>
                </div>
              </div>
              <div className="ui-card-body">
                <span className="ui-status" data-s={c.status}>
                  {STATUS[c.status]}
                </span>
                <div>
                  <p className="ui-card-name">{c.data?.name || "Untitled card"}</p>
                  <p className="ui-card-link">
                    {host}/{c.slug}
                  </p>
                </div>
                <div className="ui-card-nums">
                  <span>
                    <b>{Number(c.views30)}</b>views, 30 days
                  </span>
                  <span>
                    <b>{Number(c.leads)}</b>leads
                  </span>
                </div>
                <span className="ui-card-go">Edit card</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
