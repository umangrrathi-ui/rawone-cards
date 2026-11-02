"use client";
import { useState } from "react";
import CardView from "../CardView";
import { THEMES, demoCard } from "../../lib/themes";

export default function DesignPicker() {
  const [id, setId] = useState("clinic");
  const t = THEMES.find((x) => x.id === id);
  return (
    <div className="dp">
      <div className="dp-list" role="group" aria-label="Choose a design">
        {THEMES.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === id} onClick={() => setId(x.id)}>
            <span className="dp-sw" style={{ background: `linear-gradient(135deg, ${x.bg} 55%, ${x.accent} 55%)` }} />
            <span className="dp-t">
              <b>{x.name}</b>
              <small>{x.for}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="dp-view">
        <div className="sr-phone dp-phone" aria-hidden="true" inert>
          <div className="sr-screen" key={id}>
            <CardView card={demoCard(t)} preview />
          </div>
        </div>
      </div>
    </div>
  );
}
