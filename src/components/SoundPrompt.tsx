"use client";
import { useEffect, useRef, useState } from "react";
import { useAudio } from "./Providers";
import { say } from "@/lib/pipSay";

const ASKED = "pip-sound-asked";

/**
 * "Welcome back, sound on?" Browsers never allow audio before a click, so a returning visitor who left sound on gets a
 * small, polite prompt instead. It waits for the opening scene to finish, asks once per tab, and never auto-plays.
 */
export default function SoundPrompt() {
  const { on, setOn, ensure, play } = useAudio();
  const onRef = useRef(on);
  onRef.current = on;
  const [show, setShow] = useState(false);

  useEffect(() => {
    let pref: string | null = null;
    try { pref = localStorage.getItem("pip-sound"); if (sessionStorage.getItem(ASKED)) return; } catch {}
    if (pref !== "on") return;
    let t = 0;
    const open = () => { t = window.setTimeout(() => { if (!onRef.current) setShow(true); }, 700); };
    const waiting = document.documentElement.dataset.intro === "on";
    if (waiting) addEventListener("pip:intro-done", open, { once: true }); else open();
    return () => { clearTimeout(t); removeEventListener("pip:intro-done", open); };
  }, []);

  const asked = () => { try { sessionStorage.setItem(ASKED, "1"); } catch {} setShow(false); };
  const yes = () => { asked(); if (ensure()) { setOn(true); play("chime"); say("Music! I missed it too."); } };
  const no = () => { asked(); try { localStorage.setItem("pip-sound", "off"); } catch {} say("Shhh… quiet it is."); };

  useEffect(() => {
    if (!show) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") asked(); };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [show]);

  if (!show) return null;
  return (
    <div className="soundask" role="group" aria-label="Welcome back">
      <p><b>Welcome back!</b> Last time the nursery had music. Sound on?</p>
      <div>
        <button type="button" className="btn" onClick={yes}>Yes, turn sound on ♪</button>
        <button type="button" className="chip" onClick={no}>Keep it quiet</button>
      </div>
    </div>
  );
}
