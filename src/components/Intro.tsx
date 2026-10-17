"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "./Providers";
import { say } from "@/lib/pipSay";

/**
 * Cinematic opening: a short starry-sky scene where Pip rises gently into an arched window.
 *
 * How it stays fast and flash-free:
 *  - A tiny inline script in <head> (layout.tsx) sets <html data-intro="on"> before first paint on a visitor's first
 *    visit in this tab (no saved flag, no #deep-link, no ?intro=0). CSS shows the overlay only in that state.
 *  - The scene is pure CSS (gradients, SVG, transforms, opacity). No canvas, no new images (it reuses hero.webp, which the
 *    hero needs anyway) and no new libraries.
 *  - Sound stays off. "Enter with sound" is an explicit opt-in click, so the browser allows the audio to start.
 *
 * Accessibility: role="dialog", focus moves in and is trapped, the page behind is inert, Esc or "Skip intro" leaves
 * at once, and with prefers-reduced-motion the scene is a calm still frame with the button ready immediately.
 */

const KEY = "pip-intro-seen";
/** Glint centres in the 620x931 hero art, as % of its width/height (same as PipHero). */
const EYES = [{ x: 41.9, y: 43.4 }, { x: 64.4, y: 39.1 }];
const REVEAL_MS = 2600; // Pip is up and the button fades in
const LEAVE_MS = 850;
const SKIP_MS = 300;

const Cloud = ({ className }: { className: string }) => (
  <svg className={`i-cl ${className}`} viewBox="0 -6 200 86" aria-hidden="true">
    <g fill="currentColor"><rect x="20" y="40" width="160" height="30" rx="15" /><circle cx="70" cy="40" r="28" /><circle cx="110" cy="32" r="34" /><circle cx="150" cy="46" r="22" /></g>
  </svg>
);

type Leave = "" | "enter" | "skip";

export default function Intro() {
  const { ensure, setOn, play } = useAudio();
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const enterBtn = useRef<HTMLButtonElement>(null);
  const locked = useRef<HTMLElement[]>([]);
  const leaving = useRef(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [leave, setLeave] = useState<Leave>("");

  const unlock = useCallback(() => {
    locked.current.forEach((n) => n.removeAttribute("inert"));
    locked.current = [];
  }, []);

  const close = useCallback(() => {
    unlock();
    delete document.documentElement.dataset.intro;
    setOpen(false);
    setLeave("");
    setReady(false);
    const main = document.querySelector<HTMLElement>("main");
    if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
    say("Welcome to the workshop, sleepyhead!");
  }, [unlock]);

  const finish = useCallback((how: Exclude<Leave, "">, withSound = false) => {
    if (leaving.current) return;
    leaving.current = true;
    try { sessionStorage.setItem(KEY, "1"); } catch {}
    // Must happen inside the click so the browser lets the ambience start.
    if (withSound && ensure()) { setOn(true); play("chime"); }
    const rm = matchMedia("(prefers-reduced-motion:reduce)").matches;
    setLeave(how);
    window.setTimeout(close, rm ? 0 : how === "skip" ? SKIP_MS : LEAVE_MS);
  }, [close, ensure, setOn, play]);

  // Boot: open if the head script flagged a first visit, and allow replay from the footer.
  useEffect(() => {
    const start = () => { leaving.current = false; setLeave(""); setReady(false); setOpen(true); };
    if (document.documentElement.dataset.intro === "on") start();
    const replay = () => { window.scrollTo(0, 0); document.documentElement.dataset.intro = "on"; start(); };
    addEventListener("pip:intro", replay);
    return () => removeEventListener("pip:intro", replay);
  }, []);

  // While open: lock the page behind, parallax + eye tracking, keyboard, reveal timer.
  useEffect(() => {
    if (!open) return;
    const el = root.current;
    if (!el) return;
    const rm = matchMedia("(prefers-reduced-motion:reduce)").matches;

    locked.current = Array.from(document.querySelectorAll<HTMLElement>("header, main, .chat"));
    locked.current.forEach((n) => n.setAttribute("inert", ""));
    el.focus({ preventScroll: true });

    const reveal = window.setTimeout(() => setReady(true), rm ? 0 : REVEAL_MS);

    let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    const onMove = (e: PointerEvent) => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; };
    const frame = () => {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
      stage.current?.style.setProperty("--ex", String(x * 0.65));
      stage.current?.style.setProperty("--ey", String(y * 0.5));
      raf = requestAnimationFrame(frame);
    };
    if (!rm) { addEventListener("pointermove", onMove, { passive: true }); raf = requestAnimationFrame(frame); }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); finish("skip"); return; }
      // Keep the Jump menu shortcuts from opening a menu behind the intro.
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (e.key !== "Tab") return;
      const items = Array.from(el.querySelectorAll<HTMLElement>("button")).filter((b) => getComputedStyle(b).visibility !== "hidden");
      if (!items.length) { e.preventDefault(); el.focus(); return; }
      const first = items[0], last = items[items.length - 1], at = document.activeElement;
      if (e.shiftKey && (at === first || at === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    };
    addEventListener("keydown", onKey, true);

    return () => {
      clearTimeout(reveal);
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("keydown", onKey, true);
      unlock();
    };
  }, [open, finish, unlock]);

  // Once the copy fades in, move focus to the main button (unless the visitor already tabbed somewhere).
  useEffect(() => {
    if (!open || !ready) return;
    const at = document.activeElement;
    if (!at || at === document.body || at === root.current) enterBtn.current?.focus({ preventScroll: true });
  }, [open, ready]);

  return (
    <div
      ref={root}
      className={`intro${ready ? " ready" : ""}${leave ? ` leaving ${leave}` : ""}`}
      role="dialog" aria-modal="true" aria-labelledby="intro-title" aria-describedby="intro-desc" tabIndex={-1}
    >
      <div className="i-sky" aria-hidden="true">
        <div className="i-layer" style={{ ["--k" as string]: -6 }}><div className="i-stars s1" /></div>
        <div className="i-layer" style={{ ["--k" as string]: -14 }}><div className="i-stars s2" /></div>
        <div className="i-layer" style={{ ["--k" as string]: -26 }}><div className="i-stars s3" /></div>
        <span className="i-shoot" />
        <div className="i-layer" style={{ ["--k" as string]: -18 }}>
          <svg className="i-moon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></svg>
        </div>
        <div className="i-layer i-back" style={{ ["--k" as string]: -10 }}>
          <Cloud className="c1" /><Cloud className="c2" /><Cloud className="c3" />
        </div>
        <div className="i-layer" style={{ ["--k" as string]: -34 }}>
          <div className="i-lantern">
            <svg viewBox="0 0 80 190" aria-hidden="true">
              <defs>
                <radialGradient id="i-lg" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffd98a" stopOpacity=".75" /><stop offset=".45" stopColor="#ffb85a" stopOpacity=".22" /><stop offset="1" stopColor="#ffb85a" stopOpacity="0" /></radialGradient>
                <linearGradient id="i-lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset="1" stopColor="#ffc766" /></linearGradient>
              </defs>
              <circle className="i-lpulse" cx="40" cy="104" r="64" fill="url(#i-lg)" />
              <line x1="40" y1="0" x2="40" y2="50" stroke="#d9b98f" strokeWidth="2" />
              <circle cx="40" cy="54" r="5" fill="none" stroke="#c79a57" strokeWidth="3" />
              <path d="M26 74 L34 62 H46 L54 74 Z" fill="#c79a57" />
              <rect x="27" y="74" width="26" height="54" rx="5" fill="url(#i-lb)" stroke="#c79a57" strokeWidth="3" />
              <path d="M40 74 V128 M27 101 H53" stroke="#c79a57" strokeWidth="2" opacity=".7" />
              <path d="M40 90 l2.4 5 5.4.6-4 3.7 1.1 5.3L40 102l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" fill="#fff6d8" opacity=".9" />
              <path d="M28 128 H52 L48 138 H32 Z" fill="#c79a57" />
            </svg>
          </div>
        </div>
      </div>

      <div className="i-front" aria-hidden="true">
        <Cloud className="fa" /><Cloud className="fb" /><Cloud className="fc" />
      </div>

      <div className="i-content">
        <div className="i-arch">
          <div className="i-stage" ref={stage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero.webp" width={620} height={931} alt="" decoding="async" fetchPriority="high" />
            <span className="i-lamp" aria-hidden="true" />
            {EYES.map((e, i) => <span key={i} className="glint" aria-hidden="true" style={{ left: `${e.x}%`, top: `${e.y}%` }} />)}
          </div>
        </div>

        <div className="i-copy">
          <p className="i-cap" aria-hidden="true">It’s very quiet in the nursery…</p>
          <p className="label i-label i-reveal" style={{ ["--rd" as string]: "0s" }}>Midnight Nursery · Dream Department</p>
          <p id="intro-title" className="i-title i-reveal" style={{ ["--rd" as string]: ".1s" }}>Shh… Pip is tucking in the <em>stars</em>.</p>
          <p id="intro-desc" className="i-sub i-reveal" style={{ ["--rd" as string]: ".2s" }}>A tiny dream engineer is just waking up. Come in quietly.</p>
          <div className="i-actions i-reveal" style={{ ["--rd" as string]: ".3s" }}>
            <button ref={enterBtn} type="button" className="btn i-enter" onClick={() => finish("enter")}>Enter the Dream Workshop <span aria-hidden="true">✦</span></button>
            <button type="button" className="i-sound" onClick={() => finish("enter", true)}>Enter with sound ♪</button>
          </div>
        </div>
      </div>

      <button type="button" className="i-skip" onClick={() => finish("skip")}>Skip intro</button>
    </div>
  );
}

/** Footer button: watch the opening again. */
export function ReplayIntro() {
  return <button type="button" className="chip" onClick={() => window.dispatchEvent(new Event("pip:intro"))}>Replay the intro ✦</button>;
}
