"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAudio } from "./Providers";
import { pick, say } from "@/lib/pipSay";
import { FEELS, isFeel, type Feel } from "@/lib/feel";

/** Glint centres in the 620x931 hero art, as % of its width/height. The art itself has no eye lights. */
const EYES = [{ x: 41.9, y: 43.4 }, { x: 64.4, y: 39.1 }];

const isNight = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "night" : matchMedia("(prefers-color-scheme:dark)").matches;
};

/**
 * Pip's eyes follow the pointer or finger and drift around on their own when you go idle.
 * Clicking Pip makes him giggle. At night Pip falls asleep (dim eyes, breathing, floating z's):
 * tap him to wake him for a few seconds. With reduced motion everything stays still.
 */
export default function PipHero({ src, alt }: { src: string; alt: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const nap = useRef<number>(0);
  const { blip } = useAudio();
  const [night, setNight] = useState(false);
  const [awake, setAwake] = useState(false);
  const asleep = night && !awake;
  // Expressions from the chat: eyes, blush and sparkles react for a few seconds. The official art itself is never altered.
  const [feel, setFeel] = useState<Feel | null>(null);
  const [fx, setFx] = useState<{ id: number; ch: string; x: number; y: number; dx: number }[]>([]);
  const feelRef = useRef<Feel | null>(null);
  const feelT = useRef(0);
  const fxId = useRef(0);

  useEffect(() => {
    const onFeel = (e: Event) => {
      const mood = (e as CustomEvent<{ mood: unknown }>).detail?.mood;
      if (!isFeel(mood)) return;
      feelRef.current = mood; setFeel(mood);
      if (!matchMedia("(prefers-reduced-motion:reduce)").matches) {
        const sparks = FEELS[mood].sparks;
        const burst = Array.from({ length: 7 }, (_, i) => ({ id: ++fxId.current, ch: sparks[i % sparks.length], x: 28 + Math.random() * 48, y: 14 + Math.random() * 30, dx: Math.round((Math.random() - 0.5) * 60) }));
        setFx((cur) => [...cur, ...burst]);
        window.setTimeout(() => setFx((cur) => cur.filter((p) => !burst.some((b) => b.id === p.id))), 2400);
      }
      clearTimeout(feelT.current);
      feelT.current = window.setTimeout(() => { feelRef.current = null; setFeel(null); }, 4200);
    };
    addEventListener("pip:feel", onFeel);
    return () => { removeEventListener("pip:feel", onFeel); clearTimeout(feelT.current); };
  }, []);

  useEffect(() => {
    const sync = () => { const n = isNight(); setNight(n); if (!n) { setAwake(false); clearTimeout(nap.current); } };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = matchMedia("(prefers-color-scheme:dark)");
    mq.addEventListener("change", sync);
    return () => { mo.disconnect(); mq.removeEventListener("change", sync); clearTimeout(nap.current); };
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, lastInput = performance.now(), lastIdle = 0;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const aim = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      tx = clamp((cx - (r.left + r.width * 0.53)) / (innerWidth * 0.4));
      ty = clamp((cy - (r.top + r.height * 0.41)) / (innerHeight * 0.4));
      lastInput = performance.now();
    };
    const onMove = (e: PointerEvent) => aim(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => aim(e.touches[0].clientX, e.touches[0].clientY);
    const frame = (t: number) => {
      if (t - lastInput > 3000 && t - lastIdle > 1800) { lastIdle = t; tx = Math.random() * 2 - 1; ty = Math.random() * 1.2 - 0.6; }
      const f = feelRef.current; // shy looks away, curious looks up and tilts
      if (f === "shy") { tx = 0.55; ty = 0.7; } else if (f === "curious") { tx = -0.6; ty = -0.55; } else if (f === "proud") { tx = 0; ty = -0.1; }
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      el.style.setProperty("--ex", String(x * 0.65));
      el.style.setProperty("--ey", String(y * 0.5));
      el.style.setProperty("--tilt", `${x * 2 + (f === "curious" ? 4 : f === "shy" ? -3 : 0)}deg`);
      raf = requestAnimationFrame(frame);
    };
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("touchmove", onTouch, { passive: true });
    addEventListener("touchstart", onTouch, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("touchmove", onTouch);
      removeEventListener("touchstart", onTouch);
    };
  }, []);

  const poke = () => {
    const el = stage.current;
    if (!el) return;
    el.classList.remove("giggle");
    void el.offsetWidth;
    el.classList.add("giggle");
    blip(784);
    if (asleep) {
      setAwake(true);
      say("*yawn* I’m up! I’m up!");
      clearTimeout(nap.current);
      nap.current = window.setTimeout(() => { setAwake(false); say("zzz… back to sleep."); }, 9000);
    } else {
      say(pick(["*giggle*", "Hehe, hi!", "Boop received.", "My nightcap is crooked, isn’t it?"]));
    }
  };
  const key = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); poke(); } };

  return (
    <div
      className="stage" ref={stage} onClick={poke} onKeyDown={key}
      role="button" tabIndex={0} data-sleep={asleep} data-feel={feel ?? undefined}
      aria-label={asleep ? "Pip is sleeping. Press to wake him." : "Pip. Press to make him giggle."}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={620} height={931} />
      {EYES.map((e, i) => <span key={i} className="glint" aria-hidden="true" style={{ left: `${e.x}%`, top: `${e.y}%` }} />)}
      <span className="blush" aria-hidden="true" style={{ left: "36.5%", top: "48.5%" }} />
      <span className="blush" aria-hidden="true" style={{ left: "69.4%", top: "43.5%" }} />
      {fx.map((p) => <span key={p.id} className="fx" aria-hidden="true" style={{ left: `${p.x}%`, top: `${p.y}%`, ["--dx" as string]: `${p.dx}px` }}>{p.ch}</span>)}
      {(asleep || feel === "sleepy") && <span className="zzz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>}
    </div>
  );
}
