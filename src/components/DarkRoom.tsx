"use client";
import { useRef, useState } from "react";
import { unlock } from "@/lib/progress";

const SECRETS = [
  ["☾", "Pip’s very first nightcap was a sock."],
  ["✦", "Wish #1: a lullaby for every window."],
  ["♪", "Hum in the dark and the dark hums back."],
  ["♡", "The smallest star in the hero loves attention."],
];

/** The lit state deliberately uses a separate markup branch, so flashlight masks can never hide it. */
export default function DarkRoom() {
  const el = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);
  const aim = (cx: number, cy: number) => {
    unlock("darkroom");
    if (lit) return;
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
        <p className="small" style={{ marginBottom: 16 }}>Move your pointer, or tap and drag a finger, to shine Pip’s nightlight on his secrets. Or switch the room light on.</p>
        {lit ? (
          <div
            className="dr-room-lit-v3"
            role="region"
            aria-label="The Dark Room with the light on"
            style={{
              display: "block", position: "relative", width: "100%", minHeight: 340,
              boxSizing: "border-box", padding: "clamp(22px, 3vw, 40px)",
              borderRadius: 28, overflow: "visible", opacity: 1, visibility: "visible",
              color: "#fff1d2", background: "radial-gradient(ellipse at 50% 15%, #796394 0%, #403153 56%, #29203d 100%)",
              boxShadow: "inset 0 0 80px rgba(244,212,157,.09)", isolation: "isolate",
            }}
          >
            <p style={{ margin: "0 0 24px", textAlign: "center", color: "#fff1d2", font: "italic 700 clamp(1.35rem, 2.6vw, 2rem) var(--serif)" }}>
              The whole room is glowing ✨
            </p>
            <ul className="dr-room-lit-secrets-v3" style={{
              display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18,
              position: "relative", width: "100%", margin: 0, padding: 0, listStyle: "none",
              opacity: 1, visibility: "visible", transform: "none", clipPath: "none",
              WebkitMaskImage: "none", maskImage: "none", background: "transparent",
            }}>
              {SECRETS.map(([g, t], i) => (
                <li key={g} style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10,
                  minWidth: 0, minHeight: 125, boxSizing: "border-box", padding: 20,
                  border: "1px solid rgba(255,225,166,.34)", borderRadius: 18,
                  background: "rgba(255,239,204,.12)", color: "#fff1d2", opacity: 1, visibility: "visible",
                  gridColumn: i === 3 ? "2" : undefined,
                }}>
                  <span aria-hidden="true" style={{ color: "#f2c56b", fontSize: "2.2rem", lineHeight: 1 }}>{g}</span>
                  <p style={{ margin: 0, color: "#fff1d2", font: "500 1.05rem/1.55 var(--ui)" }}>{t}</p>
                </li>
              ))}
            </ul>
            <style jsx>{`
              @media (max-width: 900px) {
                .dr-room-lit-secrets-v3 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                .dr-room-lit-secrets-v3 li { grid-column: auto !important; }
              }
              @media (max-width: 560px) {
                .dr-room-lit-v3 { min-height: 0 !important; padding: 18px !important; }
                .dr-room-lit-secrets-v3 { grid-template-columns: minmax(0, 1fr) !important; gap: 12px !important; }
              }
            `}</style>
          </div>
        ) : (
          <div ref={el} className="dr" onPointerDown={(e) => aim(e.clientX, e.clientY)} onPointerMove={(e) => aim(e.clientX, e.clientY)} onTouchMove={(e) => { const t = e.touches[0]; if (t) aim(t.clientX, t.clientY); }}>
            <p className="dr-base" aria-hidden="true">shhh… it’s dark in here<br /><span>Move your pointer to find the secrets</span></p>
            <ul className="dr-lit">
              {SECRETS.map(([g, t]) => <li key={g}><span aria-hidden="true">{g}</span>{t}</li>)}
            </ul>
          </div>
        )}
        <button type="button" className="chip dr-switch" aria-pressed={lit} onClick={() => { unlock("darkroom"); setLit(v => !v); }}>{lit ? "Turn the room light off" : "Turn the room light on"}</button>
      </div>
    </section>
  );
}
