"use client";
import { useRef, useState } from "react";
import { unlock } from "@/lib/progress";

const SECRETS = [
  ["☾", "Pip’s very first nightcap was a sock."],
  ["✦", "Wish #1: a lullaby for every window."],
  ["♪", "Hum in the dark and the dark hums back."],
  ["♡", "The smallest star in the hero loves attention."],
];

/** Flashlight / nightlight cursor: a CSS mask reveals the hidden layer around the pointer or finger. */
export default function DarkRoom() {
  const el = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);
  const aim = (cx: number, cy: number) => {
    unlock("darkroom");
    const n = el.current;
    if (!n) return;
    const r = n.getBoundingClientRect();
    n.style.setProperty("--x", `${cx - r.left}px`);
    n.style.setProperty("--y", `${cy - r.top}px`);
  };
  return (
    <section id="darkroom">
      <div className="wrap">
        <p className="label">Nightlight cursor</p>
        <h2>The Dark Room</h2>
        <p className="small" style={{ marginBottom: 16 }}>Move your pointer or drag a finger to shine Pip’s nightlight on his secrets.</p>
        <div ref={el} className={`dr${lit ? " lit" : ""}`} onPointerMove={(e) => aim(e.clientX, e.clientY)} onTouchMove={(e) => aim(e.touches[0].clientX, e.touches[0].clientY)}>
          <p className="dr-base" aria-hidden="true">shhh… it’s dark in here</p>
          <ul className="dr-lit">
            {SECRETS.map(([g, t]) => <li key={g}><span aria-hidden="true">{g}</span>{t}</li>)}
          </ul>
        </div>
        <button className="chip" aria-pressed={lit} onClick={() => setLit(!lit)} style={{ marginTop: 16 }}>{lit ? "Turn the room light off" : "Turn the room light on"}</button>
      </div>
    </section>
  );
}
