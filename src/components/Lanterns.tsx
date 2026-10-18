"use client";
import { useState } from "react";
import { useAudio } from "./Providers";
import Receipt from "./Receipt";
import { nextReceipt, type R } from "@/lib/receipt";
import { tint, type TintName } from "@/lib/tint";

const LAMPS: { name: string; glow: string; cap: string; tint: TintName }[] = [
  { name: "Amber", glow: "rgba(255,200,120,.5)", cap: "Amber glow: for brave dreams.", tint: "amber" },
  { name: "Rose", glow: "rgba(255,140,170,.5)", cap: "Rose glow: for gentle dreams.", tint: "rose" },
  { name: "Moonlight", glow: "rgba(150,170,255,.5)", cap: "Moonlight glow: for floaty dreams.", tint: "moonlight" },
];

export default function Lanterns() {
  const { play } = useAudio();
  const [sel, setSel] = useState(0);
  const [rec, setRec] = useState<R | null>(null);
  return (
    <>
      <div>
        <span className="num">02</span>
        <h3 id="p2">Nightlight Collection</h3>
        <p>Warm little lights that make the dark feel friendly. Tap a lamp to change the glow of the room.</p>
        <p className="recipe" aria-live="polite">{LAMPS[sel].cap}</p>
        <p className="small">The lamp you pick tints the whole nursery, and the 3D dream mobile too.</p>
        <Receipt r={rec} />
      </div>
      <div className="room" style={{ ["--rg" as string]: LAMPS[sel].glow }}>
        {LAMPS.map((l, i) => (
          <button
            key={l.name}
            className="lan"
            aria-pressed={sel === i}
            onClick={() => { setSel(i); play("chime"); tint("lantern", l.tint); setRec(nextReceipt(`Delivered: ${l.name.toLowerCase()} glow.`)); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/lamp.webp" alt="" loading="lazy" />
            <span>{l.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}
