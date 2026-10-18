"use client";
import { useEffect, useRef, useState } from "react";
import { useAudio } from "./Providers";
import Receipt from "./Receipt";
import { nextReceipt, type R } from "@/lib/receipt";
import { noteEvent, tint, type TintName } from "@/lib/tint";

/** "Sleepy" plays the music-box melody from the official audio pack; Brave and Cloudy are synthesized live with Web Audio. */
const SAMPLE_SECONDS = 6.4;
const MOODS = {
  sleepy: { label: "Sleepy", f: [392, 330, 262, 330, 392, 294, 262], t: SAMPLE_SECONDS / 7, w: "triangle" as OscillatorType, sample: true },
  brave: { label: "Brave", f: [262, 392, 523, 392, 659, 523, 784], t: 0.34, w: "sine" as OscillatorType, sample: false },
  cloudy: { label: "Cloudy", f: [294, 349, 440, 349, 262, 330, 294, 220], t: 0.5, w: "sine" as OscillatorType, sample: false },
};
type Mood = keyof typeof MOODS;

export default function LullabyLab() {
  const { on, setOn, ensure, play: playSound, stop: stopSound } = useAudio();
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
    stopSound("lullaby");
    tint("music", null);
    setPlaying(false);
    setIdx(-1);
  };
  useEffect(() => { if (!on) stop(); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  const play = () => {
    if (playing) return stop();
    const m = MOODS[mood];
    const total = m.f.length * m.t;
    if (!on) setOn(true); // pressing play is an explicit opt-in; runs inside the click so the browser allows it
    setPlaying(true);
    tint("music", mood as TintName); // the whole page glows in the lullaby's mood while it plays

    if (m.sample) {
      playSound("lullaby");
    } else {
      const eng = ensure();
      if (!eng) { setPlaying(false); return setRecipe("Your browser can’t play sound, but the rest of the lab still works!"); }
      const { ctx, gain } = eng;
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
      });
    }
    // Each note also pulses the page wash and the 3D stars (see Atmosphere and DreamMobile).
    m.f.forEach((f, i) => timers.current.push(window.setTimeout(() => { setIdx(i); noteEvent({ i, f, mood }); }, i * m.t * 1000)));
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
