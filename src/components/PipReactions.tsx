"use client";
import { useEffect, useRef, useState } from "react";
import { useAudio } from "./Providers";

const IDLE_MS = 45_000;

/**
 * Pip's little speech bubble. Other components call say() from "@/lib/pipSay".
 * Extras: Pip dozes off when you go quiet, and the tab title waits for you while you're away.
 */
export default function PipReactions() {
  const { play, stop } = useAudio();
  const audioRef = useRef({ play, stop });
  audioRef.current = { play, stop };
  const [text, setText] = useState("");
  const [n, setN] = useState(0);
  const hide = useRef<number>(0);

  useEffect(() => {
    const show = (t: string, ms = 3800) => {
      setText(t); setN((k) => k + 1);
      clearTimeout(hide.current);
      hide.current = window.setTimeout(() => setText(""), ms);
    };
    const onSay = (e: Event) => show(String((e as CustomEvent).detail ?? "").slice(0, 90));

    let idle = 0, asleep = false;
    const arm = () => {
      clearTimeout(idle);
      if (asleep) { asleep = false; audioRef.current.stop("sleepy"); show("*yawn* Oh! You’re back. I wasn’t sleeping. Much."); }
      idle = window.setTimeout(() => { asleep = true; audioRef.current.play("sleepy"); show("zzz… Pip dozed off. Poke me?", 6500); }, IDLE_MS);
    };

    let orig = document.title, hiddenAt = 0;
    const vis = () => {
      if (document.hidden) { orig = document.title; hiddenAt = Date.now(); document.title = "Pip is waiting… 💤"; }
      else { document.title = orig; if (Date.now() - hiddenAt > 8000) show("Welcome back! I saved your pillow."); }
    };

    addEventListener("pip:say", onSay);
    document.addEventListener("visibilitychange", vis);
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((ev) => addEventListener(ev, arm, { passive: true }));
    idle = window.setTimeout(() => { asleep = true; audioRef.current.play("sleepy"); show("zzz… Pip dozed off. Poke me?", 6500); }, IDLE_MS);
    return () => {
      removeEventListener("pip:say", onSay);
      document.removeEventListener("visibilitychange", vis);
      events.forEach((ev) => removeEventListener(ev, arm));
      clearTimeout(idle); clearTimeout(hide.current);
      if (document.hidden) document.title = orig;
    };
  }, []);

  return (
    <div className="pipsay" role="status" aria-live="polite">
      {text && <p key={n}><b>Pip:</b> {text}</p>}
    </div>
  );
}
