"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "./Providers";
import { unlock } from "@/lib/progress";
import { perform } from "@/lib/pipAct";
import { say } from "@/lib/pipSay";
import { buzz } from "@/lib/haptics";

const WORD = "goodnight";
const AUTO_WAKE_MS = 25_000;

/**
 * Secret #2: type "goodnight" anywhere (not inside a text box) and the whole nursery tucks itself in.
 * The lights dim, Pip falls asleep, the sleepy music-box motif plays if sound is on, and a tap, any key or Esc wakes him.
 * Also reachable from the Jump menu so keyboard and touch visitors can find it ("pip:goodnight").
 */
export default function Goodnight() {
  const { play, stop } = useAudio();
  const playRef = useRef(play), stopRef = useRef(stop);
  playRef.current = play; stopRef.current = stop;
  const [on, setOn] = useState(false);
  const onRef = useRef(false);
  const buf = useRef("");
  const wake = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const timer = useRef(0);

  const close = useCallback(() => {
    if (!onRef.current) return;
    onRef.current = false;
    clearTimeout(timer.current);
    setOn(false);
    stopRef.current("sleepy");
    say("*yawn* Oh! Good morning already? I was only resting my eyes.");
    perform("wave");
    back.current?.focus?.();
  }, []);

  const start = useCallback(() => {
    if (onRef.current) return;
    onRef.current = true;
    back.current = document.activeElement as HTMLElement | null;
    setOn(true);
    perform("sleep");
    playRef.current("sleepy");
    unlock("goodnight");
    buzz([30, 60, 30]);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(close, AUTO_WAKE_MS);
  }, [close]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (onRef.current) { if (e.key === "Escape") close(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || typeof e.key !== "string" || e.key.length !== 1) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) { buf.current = ""; return; }
      buf.current = (buf.current + e.key.toLowerCase()).replace(/[^a-z]/g, "").slice(-WORD.length);
      if (buf.current === WORD) { buf.current = ""; start(); }
    };
    addEventListener("keydown", key);
    addEventListener("pip:goodnight", start);
    return () => { removeEventListener("keydown", key); removeEventListener("pip:goodnight", start); clearTimeout(timer.current); };
  }, [start, close]);

  useEffect(() => { if (on) wake.current?.focus(); }, [on]);

  if (!on) return null;
  return (
    // Tapping anywhere wakes Pip. Keyboard users have Escape and the "Wake Pip up" button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div className="gn" role="dialog" aria-modal="true" aria-label="Goodnight. Pip is asleep" onClick={close}>
      <div className="gn-stars" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 90}%`, animationDelay: `${(i % 7) * 0.5}s` }} />)}</div>
      <div className="gn-card">
        <p className="gn-z" aria-hidden="true">z z z</p>
        <h2>Goodnight.</h2>
        <p>Pip fell asleep in the middle of a sentence. Shhh.</p>
        <button ref={wake} className="btn" onClick={(e) => { e.stopPropagation(); close(); }}>Wake Pip up</button>
        <p className="small">Or press Esc. He wakes up by himself in a little while.</p>
      </div>
    </div>
  );
}
