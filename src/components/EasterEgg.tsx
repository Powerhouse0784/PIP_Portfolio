"use client";
import { useEffect, useRef, useState } from "react";
import { Star } from "./Icons";
import { say } from "@/lib/pipSay";
import { useAudio } from "./Providers";
import { unlock, dayKey } from "@/lib/progress";
import { buzz } from "@/lib/haptics";

const IDLE = "psst… the smallest star is shy and hides somewhere new every day. Poke it five times.";
/** Spots inside the hero art that are never covered by the moon or the buttons. */
const SPOTS = [{ left: "2%", top: "46%" }, { left: "5%", top: "18%" }, { left: "88%", top: "72%" }, { left: "7%", top: "86%" }, { left: "50%", top: "94%" }];
const spotFor = (key: string) => { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0; return SPOTS[h % SPOTS.length]; };

export default function EasterEgg() {
  const { play } = useAudio();
  const [count, setCount] = useState(0);
  const [spot, setSpot] = useState(SPOTS[0]);
  useEffect(() => { setSpot(spotFor(dayKey())); }, []);
  const dlg = useRef<HTMLDialogElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  /** The star-sparkle from the audio pack, only if the visitor turned sound on. */
  const chime = () => play("sparkle");

  const confetti = () => {
    const c = cv.current;
    if (!c || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const x = c.getContext("2d");
    if (!x) return;
    c.width = innerWidth;
    c.height = innerHeight;
    const colors = ["#f2c56b", "#f19abb", "#d8c6ef", "#ffffff"];
    const ps = Array.from({ length: 90 }, () => ({
      x: innerWidth / 2, y: innerHeight / 2, vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 2,
      r: Math.random() * 5 + 3, c: colors[Math.floor(Math.random() * 4)],
    }));
    let k = 0;
    const frame = () => {
      x.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.35; x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill(); });
      if (++k < 110) requestAnimationFrame(frame); else x.clearRect(0, 0, c.width, c.height);
    };
    frame();
  };

  useEffect(() => {
    const h = () => { unlock("egg"); buzz([20, 40, 20]); confetti(); chime(); dlg.current?.showModal(); };
    addEventListener("pip:egg", h);
    return () => removeEventListener("pip:egg", h);
  });

  const poke = () => {
    const n = count + 1;
    if (n < 5) { say(["Hehe!", "That tickles!", "Almost… shh.", "One more poke!"][n - 1]); return setCount(n); }
    setCount(0);
    unlock("egg");
    buzz([20, 40, 20]);
    confetti();
    chime();
    dlg.current?.showModal();
  };

  return (
    <>
      <button className="tiny" style={{ left: spot.left, top: spot.top }} onClick={poke} aria-label="Tiny hidden star. Press five times for a surprise">
        <Star size={12} />
      </button>
      <p className="hint" aria-live="polite">{count ? `Giggle… ${count} of 5` : IDLE}</p>
      <dialog ref={dlg} aria-labelledby="wt">
        <h3 id="wt">You found my constellation!</h3>
        <svg viewBox="0 0 200 90" width={200} aria-hidden="true" style={{ margin: "8px auto", display: "block" }}>
          <polyline points="20,60 60,25 100,50 140,15 180,55" fill="none" stroke="#f2c56b" strokeWidth={2} strokeDasharray="4 4" />
          <g fill="#f2c56b">{[[20, 60], [60, 25], [100, 50], [140, 15], [180, 55]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r={5} />)}</g>
        </svg>
        <p>Pip’s secret wish: that every window on your street glows a little warmer tonight.</p>
        <p style={{ marginTop: 20 }}><button className="btn" onClick={() => dlg.current?.close()}>Goodnight, Pip</button></p>
      </dialog>
      <canvas ref={cv} id="cf" aria-hidden="true" />
    </>
  );
}
