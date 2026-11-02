"use client";
import { useState } from "react";

export default function ShowroomFilter({ groups }) {
  const [on, setOn] = useState("All");
  function pick(g) {
    setOn(g);
    document.querySelectorAll(".sr-item").forEach((el) => {
      el.hidden = g !== "All" && el.getAttribute("data-for") !== g;
    });
  }
  return (
    <div className="sr-filter" role="group" aria-label="Filter by business">
      {["All", ...groups].map((g) => (
        <button key={g} type="button" aria-pressed={on === g} onClick={() => pick(g)}>
          {g}
        </button>
      ))}
    </div>
  );
}
