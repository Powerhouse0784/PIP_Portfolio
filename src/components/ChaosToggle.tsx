"use client";
import { useState } from "react";
import { say } from "@/lib/pipSay";

export default function ChaosToggle() {
  const [on, setOn] = useState(false);
  return (
    <button className="chip" data-act="chaos" aria-pressed={on} onClick={() => { const n = !on; setOn(n); document.documentElement.classList.toggle("chaos", n); say(n ? "CHAOS! Pip regrets nothing." : "Phew. Calm. Back to cozy."); }}>
      {on ? "Calm things down" : "Chaos mode!"}
    </button>
  );
}
