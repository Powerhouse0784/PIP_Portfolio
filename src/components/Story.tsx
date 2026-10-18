"use client";
import { useEffect, useRef, useState } from "react";
import { Star } from "./Icons";

const SCENES = [
  { sky: "a", title: "A star fell into the nursery", text: "One quiet evening, a tiny star slipped through the clouds and landed beside my cradle. It hummed a melody I had never heard." },
  { sky: "b", title: "Every melody held a dream", text: "I learned the humming could help little creatures imagine places where they felt safe, brave and loved. The lanterns warmed up." },
  { sky: "c", title: "And so, I began to build", text: "Now I deliver tiny dreams across the rooftops. Every night another window glows, and another little creature sleeps peacefully." },
];

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const WINDOWS = [0, 1, 2, 3, 4, 5, 6];

/** A scroll-linked picture: dusk turns to night, the fallen star lands, then a delivery star lights the windows one by one. */
function StoryStage({ stage }: { stage: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="stg" ref={stage} role="img" aria-label="An animated picture that changes as you scroll: dusk turns to night, a star lands in the nursery, then rooftop windows light up one by one.">
      <svg viewBox="0 0 800 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="stg-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6b8a0" /><stop offset="1" stopColor="#d9b3e6" /></linearGradient>
          <linearGradient id="stg-n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#120f27" /><stop offset="1" stopColor="#4a3a78" /></linearGradient>
          <radialGradient id="stg-g"><stop offset="0" stopColor="#ffe6a8" stopOpacity=".9" /><stop offset="1" stopColor="#ffe6a8" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="800" height="340" fill="url(#stg-d)" />
        <rect className="stg-night" width="800" height="340" fill="url(#stg-n)" />
        <g className="stg-stars" fill="#ffe6a8">
          {Array.from({ length: 28 }, (_, i) => <circle key={i} cx={(i * 97 + 23) % 800} cy={(i * 53 + 17) % 190} r={i % 4 ? 1.3 : 2.1} />)}
        </g>
        <g className="stg-moon"><circle cx="650" cy="70" r="30" fill="#f2c56b" /><circle cx="664" cy="62" r="27" fill="#4a3a78" className="stg-bite" /></g>
        <path className="stg-far" d="M-60 260 C80 190 180 230 300 205 S520 170 640 215 S800 200 880 230 V340 H-60Z" fill="#6d5a96" opacity=".65" />
        <g className="stg-near">
          <path d="M-80 290 C60 250 160 280 300 262 S520 238 660 270 S820 262 900 280 V340 H-80Z" fill="#2b2142" />
          {WINDOWS.map((i) => {
            const x = 20 + i * 118, h = 46 + ((i * 19) % 30);
            return (
              <g key={i}>
                <path d={`M${x} 340 V${300 - h} L${x + 32} ${278 - h} L${x + 64} ${300 - h} V340Z`} fill="#1a1330" />
                <rect className="stg-win" style={{ ["--i" as string]: i }} x={x + 24} y={308 - h} width="16" height="16" rx="3" fill="#ffd88a" />
              </g>
            );
          })}
        </g>
        <g className="stg-fall"><circle r="26" fill="url(#stg-g)" /><path transform="translate(-9 -9) scale(.75)" fill="#ffe6a8" d="m12 1 3 8h8l-6.5 5 2.5 8-7-5-7 5 2.5-8L1 9h8z" /></g>
        <g className="stg-del"><circle r="30" fill="url(#stg-g)" /><path transform="translate(-10 -10) scale(.85)" fill="#fff1c4" d="m12 1 3 8h8l-6.5 5 2.5 8-7-5-7 5 2.5-8L1 9h8z" /></g>
      </svg>
    </div>
  );
}

export default function Story() {
  const [current, setCurrent] = useState(0);
  const [seen, setSeen] = useState<boolean[]>([false, false, false]);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  // Scroll-linked progress (0..1) for the picture. Reduced motion: it simply jumps between three still moments.
  useEffect(() => {
    const el = sec.current, st = stage.current;
    if (!el || !st) return;
    const set = (p: number) => {
      const q = clamp((p - 0.4) / 0.6);
      st.style.setProperty("--p", p.toFixed(3));
      st.style.setProperty("--fall", clamp(p / 0.35).toFixed(3));
      st.style.setProperty("--q", q.toFixed(3));
      st.style.setProperty("--qy", (Math.sin(q * Math.PI) * -46).toFixed(1));
    };
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      set(clamp((vh * 0.75 - r.top) / (r.height + vh * 0.25)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => {
    const st = stage.current;
    if (!st || !matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const p = [0.1, 0.55, 1][current];
    const q = clamp((p - 0.4) / 0.6);
    st.style.setProperty("--p", String(p)); st.style.setProperty("--fall", String(clamp(p / 0.35)));
    st.style.setProperty("--q", String(q)); st.style.setProperty("--qy", String(Math.sin(q * Math.PI) * -46));
  }, [current]);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = Number((e.target as HTMLElement).dataset.i);
      setSeen((s) => s.map((v, j) => v || j === i));
      setCurrent(i);
    }), { threshold: 0.35 });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="story" data-s={current} ref={sec}>
      <div className="wrap">
        <p className="label">Once upon a bedtime</p>
        <h2>How I became a dream engineer</h2>
        <StoryStage stage={stage} />
        <div className="scenes">
          {SCENES.map((s, i) => (
            <div key={s.title} data-i={i} ref={(el) => { refs.current[i] = el; }} className={`scene${seen[i] ? " in" : ""}`}>
              <div className={`sk ${s.sky}`}>
                {i === 0 && <Star className="fall" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i === 1 && <img src="/images/lamp.webp" alt="" loading="lazy" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i === 2 && <img src="/images/wave.webp" alt="" loading="lazy" style={{ objectPosition: "50% 25%" }} />}
              </div>
              <div className="tx">
                <span className="num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
