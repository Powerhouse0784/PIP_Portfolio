"use client";
import { useEffect, useRef, useState } from "react";
import { fade, interpolate, MAX_SPARKS, PALETTE_DAY, PALETTE_NIGHT, spawn, sparksFor, step, type Spark } from "@/lib/trail";
import { say } from "@/lib/pipSay";

const KEY = "pip-trail";
const pref = () => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } };
const canTrail = () => matchMedia("(pointer:fine) and (hover:hover)").matches && !matchMedia("(prefers-reduced-motion:reduce)").matches;

/** Flip the saved preference (used by the footer button and the Jump menu). */
export function toggleTrail() {
  if (!matchMedia("(pointer:fine) and (hover:hover)").matches) { say("The sparkle trail needs a mouse. Touchscreens get the real sparkles instead."); return; }
  const next = !pref();
  try { localStorage.setItem(KEY, next ? "on" : "off"); } catch {}
  window.dispatchEvent(new CustomEvent("pip:trail-state", { detail: { on: next } }));
  say(next ? "Sparkles on!" : "Sparkles off. Very serious now.");
}

/** The footer switch. Hidden on touch screens, where there is no pointer to follow. */
export function TrailToggle() {
  const [on, setOn] = useState(true), [able, setAble] = useState(false);
  useEffect(() => {
    setOn(pref()); setAble(matchMedia("(pointer:fine) and (hover:hover)").matches);
    const h = (e: Event) => setOn((e as CustomEvent<{ on: boolean }>).detail.on);
    addEventListener("pip:trail-state", h);
    return () => removeEventListener("pip:trail-state", h);
  }, []);
  if (!able) return null;
  return <button type="button" className="chip" data-act="trail" aria-pressed={on} onClick={toggleTrail}>{on ? "Sparkle trail: on" : "Sparkle trail: off"}</button>;
}

/**
 * Retro sparkle cursor trail (Early-Web side quest): stars, bubbles and glitter follow the mouse and fade out.
 * One transparent canvas that never takes clicks; it only runs while sparks are alive. Off for touch screens and reduced motion.
 */
export default function SparkleTrail() {
  const [on, setOn] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const sync = () => setOn(pref() && canTrail());
    sync();
    const rm = matchMedia("(prefers-reduced-motion:reduce)");
    addEventListener("pip:trail-state", sync);
    rm.addEventListener("change", sync);
    return () => { removeEventListener("pip:trail-state", sync); rm.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("trail-on", on);
    const canvas = cv.current;
    if (!on || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, raf = 0, last = 0, px = -1, py = -1;
    const sparks: Spark[] = [];

    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const star = (r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    };
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      step(sparks, dt);
      ctx.clearRect(0, 0, w, h);
      for (const s of sparks) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.globalAlpha = fade(s); ctx.fillStyle = s.color; ctx.strokeStyle = s.color;
        ctx.shadowColor = s.color; ctx.shadowBlur = 8;
        if (s.kind === 0) { ctx.rotate(s.rot); star(s.size); }
        else if (s.kind === 1) { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, s.size * 0.8, 0, 7); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(0, 0, s.size * 0.32, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      raf = sparks.length ? requestAnimationFrame(frame) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || document.hidden) return;
      const x = e.clientX, y = e.clientY;
      if (px >= 0) {
        const d = Math.hypot(x - px, y - py);
        const night = document.documentElement.dataset.theme === "night" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme:dark)").matches);
        const density = document.documentElement.classList.contains("chaos") ? 2 : 1; // chaos mode: twice the glitter
        const per = sparksFor(d, density);
        if (per) for (const [qx, qy] of interpolate(px, py, x, y)) sparks.push(...spawn(qx, qy, per, night ? PALETTE_NIGHT : PALETTE_DAY));
        if (sparks.length > MAX_SPARKS) sparks.splice(0, sparks.length - MAX_SPARKS);
        if (sparks.length && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      }
      px = x; py = y;
    };
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget) px = -1; };

    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize); removeEventListener("pointermove", onMove); document.removeEventListener("mouseout", onOut);
      document.documentElement.classList.remove("trail-on");
    };
  }, [on]);

  return on ? <canvas ref={cv} className="trail-canvas" aria-hidden="true" /> : null;
}
