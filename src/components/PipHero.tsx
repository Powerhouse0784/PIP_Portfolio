"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAudio } from "./Providers";
import { pick, say } from "@/lib/pipSay";

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
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      el.style.setProperty("--ex", String(x * 0.65));
      el.style.setProperty("--ey", String(y * 0.5));
      el.style.setProperty("--tilt", `${x * 2}deg`);
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
      role="button" tabIndex={0} data-sleep={asleep}
      aria-label={asleep ? "Pip is sleeping. Press to wake him." : "Pip. Press to make him giggle."}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={620} height={931} />
      {EYES.map((e, i) => <span key={i} className="glint" aria-hidden="true" style={{ left: `${e.x}%`, top: `${e.y}%` }} />)}
      {asleep && <span className="zzz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>}
    </div>
  );
}
