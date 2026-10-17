"use client";
import { useState } from "react";

export default function ChaosToggle() {
  const [on, setOn] = useState(false);
  return (
    <button className="chip" data-act="chaos" aria-pressed={on} onClick={() => { const n = !on; setOn(n); document.documentElement.classList.toggle("chaos", n); }}>
      {on ? "Calm things down" : "Chaos mode!"}
    </button>
  );
}
