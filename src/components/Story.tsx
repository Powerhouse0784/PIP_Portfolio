"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useAudio } from "./Providers";
import { say, pick } from "@/lib/pipSay";

const CHAPTERS = [
  { tag: "Chapter one", title: "A star fell into the nursery", text: "One quiet evening, a tiny star slipped through the clouds and landed beside my cradle. It hummed a melody I had never heard." },
  { tag: "Chapter two", title: "Every melody held a dream", text: "I learned the humming could help little creatures imagine places where they felt safe, brave and loved. The lanterns warmed up." },
  { tag: "Chapter three", title: "And so, I began to build", text: "Now I deliver tiny dreams across the rooftops. Every night another window glows, and another little creature sleeps peacefully." },
];

/** Seven rooftops. The star lights the plain ones as it passes; the sleepy ones wait for a visitor to tap them awake. */
const HOUSES = [
  { h: 58 }, { h: 76, sleepy: true }, { h: 50 }, { h: 84, sleepy: true }, { h: 62 }, { h: 72, sleepy: true }, { h: 54 },
] as const;
const SLEEPY = HOUSES.flatMap((h, i) => ("sleepy" in h ? [i] : []));

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (x: number, a: number, b: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const STICKY_TOP = 72;
const MID = [0.17, 0.5, 0.85];

const STAR_D = "m12 1 3 8h8l-6.5 5 2.5 8-7-5-7 5 2.5-8L1 9h8z";
const layer = (z: number, k: number, s: number) => ({ "--z": z, "--k": k, "--s": s }) as CSSProperties;

/**
 * "How I became a dream engineer" as a small 3D flight. A sticky diorama (CSS 3D, real depth layers) moves the camera
 * forward as you scroll: dusk turns to night, the fallen star lands, the lantern drifts in, and a delivery star lights
 * the rooftops. The pointer tilts the world, and the sleepy houses can be tapped awake. Reduced motion, short screens
 * and no-script all get the same story as a calm, stacked scene.
 */
export default function Story() {
  const { blip } = useAudio();
  const [live, setLive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [woke, setWoke] = useState<boolean[]>(() => HOUSES.map(() => false));
  const [twinkle, setTwinkle] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const vp = useRef<HTMLDivElement>(null);
  const told = useRef(false);

  useEffect(() => {
    const tr = track.current, st = sticky.current, v = vp.current;
    if (!tr || !st || !v) return;
    // Reduced motion or a very short screen: no flight. The CSS defaults already show the finished night scene with all three chapters stacked.
    if (matchMedia("(prefers-reduced-motion:reduce), (max-height:520px)").matches) return;
    setLive(true);

    const set = (p: number) => {
      const q = clamp((p - 0.4) / 0.6);
      v.style.setProperty("--p", p.toFixed(3));
      v.style.setProperty("--fall", clamp(p / 0.34).toFixed(3));
      v.style.setProperty("--q", q.toFixed(3));
      v.style.setProperty("--qy", (Math.sin(q * Math.PI) * -9).toFixed(2));
      v.style.setProperty("--c1", (smooth(p, 0.3, 0.42) * (1 - smooth(p, 0.62, 0.74))).toFixed(3));
      v.style.setProperty("--c2", smooth(p, 0.66, 0.78).toFixed(3));
      setIdx(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
    };
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = tr.getBoundingClientRect();
      const span = Math.max(1, r.height - st.offsetHeight);
      set(clamp((STICKY_TOP - r.top) / span));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);

    // Pointer parallax: the whole diorama leans toward the pointer and settles back smoothly.
    const cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
    let praf = 0;
    const ease = () => {
      praf = 0;
      cur.x += (tgt.x - cur.x) * 0.12; cur.y += (tgt.y - cur.y) * 0.12;
      v.style.setProperty("--mx", cur.x.toFixed(3)); v.style.setProperty("--my", cur.y.toFixed(3));
      if (Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) > 0.004) praf = requestAnimationFrame(ease);
    };
    const move = (e: PointerEvent) => {
      const b = v.getBoundingClientRect();
      tgt.x = ((e.clientX - b.left) / b.width - 0.5) * 2; tgt.y = ((e.clientY - b.top) / b.height - 0.5) * 2;
      if (!praf) praf = requestAnimationFrame(ease);
    };
    const leave = () => { tgt.x = 0; tgt.y = 0; if (!praf) praf = requestAnimationFrame(ease); };
    v.addEventListener("pointermove", move);
    v.addEventListener("pointerleave", leave);
    return () => {
      removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll);
      v.removeEventListener("pointermove", move); v.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf); cancelAnimationFrame(praf);
    };
  }, []);

  const go = useCallback((i: number) => {
    const tr = track.current, st = sticky.current;
    if (!tr || !st) return;
    const span = tr.offsetHeight - st.offsetHeight;
    const y = tr.getBoundingClientRect().top + scrollY - STICKY_TOP + span * MID[i];
    scrollTo({ top: y, behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" });
  }, []);

  const wake = (i: number) => {
    const n = [...woke]; n[i] = !n[i];
    setWoke(n);
    if (n[i]) blip(520 + SLEEPY.indexOf(i) * 130);
    if (SLEEPY.every((j) => n[j]) && !told.current) {
      told.current = true;
      [660, 784, 988].forEach((f, k) => window.setTimeout(() => blip(f), k * 140));
      say("Every window on the street is glowing. Goodnight, little street!");
    }
  };
  const star = () => {
    setTwinkle(true); blip(880);
    say(pick(["Make a wish. Quietly, so the star can hear.", "That’s the star that hummed me my first song.", "It tickles when you tap it. Don’t tell anyone."]));
    window.setTimeout(() => setTwinkle(false), 1400);
  };
  const lit = SLEEPY.filter((i) => woke[i]).length;

  return (
    <section id="story" data-s={idx} className={live ? "live" : undefined}>
      <div className="wrap">
        <p className="label">Once upon a bedtime</p>
        <h2>How I became a dream engineer</h2>
        <p className="small st-hint">Scroll to fly through the nursery. Tap the sleepy houses to wake their windows.</p>
      </div>

      <div className="st-track" ref={track}>
        <div className="st-sticky" ref={sticky}>
          <div className={`st-vp${twinkle ? " twinkle" : ""}${lit === SLEEPY.length ? " all" : ""}`} ref={vp}>
            <div className="st-sky" aria-hidden="true" />
            <div className="st-night" aria-hidden="true" />

            <div className="st-world">
              <div className="ly" style={layer(-900, 90, 1.95)} aria-hidden="true">
                <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="st-stars">
                  {Array.from({ length: 46 }, (_, i) => <circle key={i} cx={(i * 97 + 23) % 800} cy={(i * 53 + 17) % 300} r={i % 4 ? 1.3 : 2.2} fill="#ffe6a8" />)}
                </svg>
              </div>
              <div className="ly" style={layer(-800, 60, 1.8)} aria-hidden="true"><span className="st-moon" /></div>
              <div className="ly ly-bottom" style={layer(-600, 220, 1.6)} aria-hidden="true">
                <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="st-hill far"><path d="M0 120 C120 40 220 110 340 80 S560 20 680 70 S900 100 1000 60 V200 H0Z" /></svg>
              </div>
              <div className="ly ly-bottom" style={layer(-350, 330, 1.35)} aria-hidden="true">
                <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="st-hill mid"><path d="M0 100 C150 150 260 50 420 90 S700 150 820 80 S960 70 1000 100 V200 H0Z" /></svg>
              </div>

              <div className="ly ly-vil" style={layer(-150, 470, 1.15)}>
                <div className="st-row">
                  {HOUSES.map((h, i) => {
                    const st = { "--h": `${h.h}%`, "--i": i } as CSSProperties;
                    return "sleepy" in h ? (
                      <button key={i} type="button" className={`hs sl${woke[i] ? " on" : ""}`} style={st} aria-pressed={woke[i]}
                        aria-label={`Sleepy house ${SLEEPY.indexOf(i) + 1} of ${SLEEPY.length}: ${woke[i] ? "window glowing, tap to put it back to sleep" : "tap to light its window"}`} onClick={() => wake(i)}><i /></button>
                    ) : (
                      <div key={i} className="hs" style={st} aria-hidden="true"><i /></div>
                    );
                  })}
                </div>
                <div className="st-ground" aria-hidden="true" />
              </div>

              <div className="ly" style={layer(30, 70, 1)}>
                <div className="prop prop-lamp" aria-hidden="true">
                  <div className="frame">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/images/lamp.webp" alt="" loading="lazy" width={320} height={320} draggable={false} /></div>
                </div>
                <div className="prop prop-pip" aria-hidden="true">
                  <div className="frame">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/images/wave.webp" alt="" loading="lazy" width={300} height={365} draggable={false} /></div>
                </div>
                <button type="button" className="st-fall" onClick={star} aria-label="Pip’s fallen star. Tap to make it twinkle">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR_D} /></svg>
                </button>
                <span className="st-del" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={STAR_D} /></svg></span>
              </div>

              <div className="ly" style={layer(220, 520, 1)} aria-hidden="true">
                <span className="st-cloud c1" /><span className="st-cloud c2" />
              </div>
            </div>

            <div className="st-floor" aria-hidden="true" />
            <div className="st-hud">
                <span className="st-chip" role="status">{lit === SLEEPY.length ? "Every window is glowing ✦" : `Sleepy windows lit: ${lit} of ${SLEEPY.length}`}</span>
                <span className="st-dots" aria-hidden="true">{CHAPTERS.map((_, i) => <i key={i} className={i <= idx ? "on" : ""} />)}</span>
              </div>
          </div>
          <div className="st-cards">
                <div className="st-stack">
                {CHAPTERS.map((c, i) => (
                  <article key={c.title} className="st-card" data-on={!live || idx === i ? "true" : "false"} aria-hidden={live && idx !== i ? true : undefined}>
                    <span className="num">{c.tag}</span>
                    <h3>{c.title}</h3>
                    <p>{c.text}</p>
                  </article>
                ))}
                </div>
                <div className="st-nav">
                  <button type="button" className="chip" onClick={() => go(Math.max(0, idx - 1))} disabled={idx === 0}><span aria-hidden="true">←</span> Back</button>
                  <button type="button" className="chip" onClick={() => go(Math.min(2, idx + 1))} disabled={idx === 2}>Next <span aria-hidden="true">→</span></button>
                </div>
              </div>
        </div>
      </div>
      {live && <p className="sr">{CHAPTERS.map((c) => `${c.title}. ${c.text}`).join(" ")}</p>}
    </section>
  );
}
