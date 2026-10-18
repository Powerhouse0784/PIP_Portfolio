"use client";
import { useState } from "react";
import { say } from "@/lib/pipSay";
import { unlock } from "@/lib/progress";

export default function ChaosToggle() {
  const [on, setOn] = useState(false);
  return (
    <button className="chip" data-act="chaos" aria-pressed={on} onClick={() => { const n = !on; setOn(n); document.documentElement.classList.toggle("chaos", n); if (n) unlock("chaos"); say(n ? "CHAOS! Pip regrets nothing." : "Phew. Calm. Back to cozy."); }}>
      {on ? "Calm things down" : "Chaos mode!"}
    </button>
  );
}
