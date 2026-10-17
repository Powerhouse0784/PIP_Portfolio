"use client";
import { useEffect, useState } from "react";
import { useAudio } from "./Providers";

export default function SiteHeader() {
  const { on, setOn, ensure } = useAudio();
  const [night, setNight] = useState(false);

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setNight(t ? t === "night" : matchMedia("(prefers-color-scheme:dark)").matches);
  }, []);

  const toggleTheme = () => {
    const next = !night;
    setNight(next);
    document.documentElement.dataset.theme = next ? "night" : "day";
    try { localStorage.setItem("pip-theme", next ? "night" : "day"); } catch {}
  };
  const toggleSound = () => {
    if (!on && !ensure()) return;
    setOn(!on);
  };

  return (
    <header>
      <div className="wrap">
        <nav aria-label="Main">
          <a className="brand" href="#top">pip ✦</a>
          <a className="l" href="#about">About</a>
          <a className="l" href="#projects">Projects</a>
          <a className="l" href="#story">My Story</a>
          <a className="l" href="#guestbook">Guestbook</a>
          <button className="ib kbd" aria-label="Open command menu (Ctrl or Command plus K)" onClick={() => window.dispatchEvent(new Event("pip:palette"))}>⌘K</button>
          <button className="ib" data-act="sound" aria-pressed={on} aria-label={on ? "Sound on. Mute" : "Sound off. Turn sound on"} onClick={toggleSound}>
            {on ? "♫" : "♪"}
          </button>
          <button className="ib" data-act="theme" aria-label={night ? "Switch to day mode" : "Switch to night mode"} onClick={toggleTheme}>
            {night ? "☀" : "☾"}
          </button>
        </nav>
      </div>
    </header>
  );
}
