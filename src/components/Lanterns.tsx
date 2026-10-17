"use client";
import { useState } from "react";
import Receipt from "./Receipt";
import { nextReceipt, type R } from "@/lib/receipt";

const LAMPS = [
  { name: "Amber", glow: "rgba(255,200,120,.5)", cap: "Amber glow: for brave dreams." },
  { name: "Rose", glow: "rgba(255,140,170,.5)", cap: "Rose glow: for gentle dreams." },
  { name: "Moonlight", glow: "rgba(150,170,255,.5)", cap: "Moonlight glow: for floaty dreams." },
];

export default function Lanterns() {
  const [sel, setSel] = useState(0);
  const [rec, setRec] = useState<R | null>(null);
  return (
    <>
      <div>
        <span className="num">02</span>
        <h3 id="p2">Nightlight Collection</h3>
        <p>Warm little lights that make the dark feel friendly. Tap a lamp to change the glow of the room.</p>
        <p className="recipe" aria-live="polite">{LAMPS[sel].cap}</p>
        <Receipt r={rec} />
      </div>
      <div className="room" style={{ ["--rg" as string]: LAMPS[sel].glow }}>
        {LAMPS.map((l, i) => (
          <button
            key={l.name}
            className="lan"
            aria-pressed={sel === i}
            onClick={() => { setSel(i); setRec(nextReceipt(`Delivered: ${l.name.toLowerCase()} glow.`)); }}
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
