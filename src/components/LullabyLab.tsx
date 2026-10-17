"use client";
import { useEffect, useRef, useState } from "react";
import { useAudio } from "./Providers";
import Receipt from "./Receipt";
import { nextReceipt, type R } from "@/lib/receipt";

const MOODS = {
  sleepy: { label: "Sleepy", f: [392, 330, 262, 330, 392, 294, 262], t: 0.62, w: "triangle" as OscillatorType },
  brave: { label: "Brave", f: [262, 392, 523, 392, 659, 523, 784], t: 0.34, w: "sine" as OscillatorType },
  cloudy: { label: "Cloudy", f: [294, 349, 440, 349, 262, 330, 294, 220], t: 0.5, w: "sine" as OscillatorType },
};
type Mood = keyof typeof MOODS;

export default function LullabyLab() {
  const { on, setOn, ensure } = useAudio();
  const [mood, setMood] = useState<Mood>("sleepy");
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [recipe, setRecipe] = useState("Dream recipe: choose a mood, then press play.");
  const [rec, setRec] = useState<R | null>(null);
  const timers = useRef<number[]>([]);
  const oscs = useRef<OscillatorNode[]>([]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    oscs.current.forEach((o) => { try { o.stop(); } catch {} });
    oscs.current = [];
    setPlaying(false);
    setIdx(-1);
  };
  useEffect(() => { if (!on) stop(); }, [on]);
  useEffect(() => stop, []);

  const play = () => {
    if (playing) return stop();
    const eng = ensure();
    if (!eng) return setRecipe("Your browser can’t play sound, but the rest of the lab still works!");
    const { ctx, gain } = eng;
    const m = MOODS[mood];
    setOn(true);
    setPlaying(true);
    const t0 = ctx.currentTime + 0.05;
    m.f.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const at = t0 + i * m.t;
      o.type = m.w;
      o.frequency.value = f;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.22, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, at + m.t * 2.2);
      o.connect(g);
      g.connect(gain);
      o.start(at);
      o.stop(at + m.t * 2.2 + 0.05);
      oscs.current.push(o);
      timers.current.push(window.setTimeout(() => setIdx(i), i * m.t * 1000));
    });
    const total = m.f.length * m.t;
    timers.current.push(window.setTimeout(stop, total * 1000 + 300));
    setRecipe(`Dream recipe: ${m.label} mood · ${m.f.length} notes · ${total.toFixed(1)} seconds`);
    setRec(nextReceipt(`Delivered: one ${m.label.toLowerCase()} lullaby, ${m.f.length} notes.`));
  };

  return (
    <>
      <div className="chips" role="group" aria-label="Lullaby mood">
        {(Object.keys(MOODS) as Mood[]).map((k) => (
          <button key={k} className="chip" aria-pressed={mood === k} onClick={() => { setMood(k); stop(); }}>
            {MOODS[k].label}
          </button>
        ))}
      </div>
      <button className="btn" onClick={play}>{playing ? "Stop" : "Play lullaby"}</button>
      <div className="bars" aria-hidden="true">
        {MOODS[mood].f.map((_, i) => <i key={i} className={i === idx ? "on" : ""} />)}
      </div>
      <p className="recipe" aria-live="polite">{recipe}</p>
      <Receipt r={rec} />
    </>
  );
}
