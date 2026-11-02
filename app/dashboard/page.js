import NewCard from "../../components/dash/NewCard";
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
  return (
    <main className="ui-page">
      <div className="ui-head">
        <div>
          <h1 className="ui-h1">Your cards</h1>
          <p className="ui-sub">
            {cards.length} of {lim.cards} on the {lim.label} plan
          </p>
        </div>
        {cards.length ? <NewCard disabled={full} reason={full ? "Card limit reached for your plan" : ""} /> : null}
      </div>
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
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
