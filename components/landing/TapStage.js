"use client";
import { useState } from "react";
import CardView from "../CardView";

// The one big moment on the page: an NFC card taps a phone, the visiting card opens, the contact is saved.
export default function TapStage({ card }) {
  const [run, setRun] = useState(0);
  return (
    <div className="hx-stage" key={run}>
      <div className="hx-phone sr-phone" aria-hidden="true" inert>
        <div className="sr-screen">
          <CardView card={card} preview />
          <div className="hx-blank">
            <span className="hx-nfc-ic" />
            <small>Hold near the card</small>
          </div>
          <div className="hx-saved">
            <b>Contact saved</b>
            <span>Dr. Meera Shah is in your phone</span>
          </div>
        </div>
      </div>
      <div className="hx-ring r1" aria-hidden="true" />
      <div className="hx-ring r2" aria-hidden="true" />
      <div className="hx-tag" aria-hidden="true">
        <i className="hx-tag-mark">R</i>
        <span className="hx-tag-nfc" />
        <em>Dr. Meera Shah</em>
      </div>
      <button type="button" className="hx-replay" onClick={() => setRun((n) => n + 1)}>
        Replay the tap
      </button>
    </div>
  );
}
