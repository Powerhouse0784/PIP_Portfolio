"use client";
import { useEffect, useRef, useState } from "react";
import { useAudio } from "./Providers";
import { say } from "@/lib/pipSay";

const LINKS: [string, string][] = [
  ["about", "About"], ["projects", "Projects"], ["story", "My Story"], ["guestbook", "Guestbook"],
];
const MORE: [string, string][] = [
  ["storybook", "Bedtime storybook"], ["toys", "Rattle & block toys"], ["growth", "Growth chart"], ["catcher", "Catch the dreams"], ["dreammaker", "Make a dream"],
];

export default function SiteHeader() {
  const { on, setOn, ensure, play } = useAudio();
  const [night, setNight] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const menuBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setNight(t ? t === "night" : matchMedia("(prefers-color-scheme:dark)").matches);
  }, []);

  // Scroll-spy: highlight the nav link for the section being read.
  useEffect(() => {
    const ids = [...LINKS, ...MORE].map(([id]) => id);
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  // Mobile menu: close on Escape, outside click, resize to desktop; return focus to the button.
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); menuBtn.current?.focus(); } };
    const click = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !menuBtn.current?.contains(t)) setOpen(false);
    };
    const resize = () => { if (innerWidth >= 720) setOpen(false); };
    addEventListener("keydown", key); addEventListener("mousedown", click); addEventListener("resize", resize);
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => { removeEventListener("keydown", key); removeEventListener("mousedown", click); removeEventListener("resize", resize); };
  }, [open]);

  const toggleTheme = () => {
    const next = !night;
    setNight(next);
    document.documentElement.dataset.theme = next ? "night" : "day";
    try { localStorage.setItem("pip-theme", next ? "night" : "day"); } catch {}
    play("chime");
    say(next ? "Goodnight! Stars out, lanterns on." : "Good morning! *yawn* Is it breakfast yet?");
  };
  const toggleSound = () => {
    if (!on && !ensure()) return;
    setOn(!on);
    say(!on ? "Music! I’ll hum along ♪" : "Shhh… okay. (I hate silence, though.)");
  };

  return (
    <header>
      <div className="wrap">
        <nav aria-label="Main">
          <a className="brand" href="#top">pip ✦</a>
          {LINKS.map(([id, label]) => (
            <a key={id} className="l" href={`#${id}`} aria-current={active === id ? "true" : undefined}>{label}</a>
          ))}
          <button className="ib kbd" aria-label="Jump to a place on the site. Shortcut: press the slash key" onClick={() => window.dispatchEvent(new Event("pip:palette"))}>✦ Jump</button>
          <button className="ib" data-act="sound" aria-pressed={on} aria-label={on ? "Sound on. Mute" : "Sound off. Turn sound on"} onClick={toggleSound}>
            {on ? "♫" : "♪"}
          </button>
          <button className="ib" data-act="theme" aria-label={night ? "Switch to day mode" : "Switch to night mode"} onClick={toggleTheme}>
            {night ? "☀" : "☾"}
          </button>
          <button ref={menuBtn} className="ib menu" aria-expanded={open} aria-controls="mnav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              {open
                ? <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
            </svg>
          </button>
        </nav>
      </div>
      {open && (
        <div className="mnav" id="mnav" ref={panel}>
          <div className="wrap">
            <ul>
              {[...LINKS.slice(0, 2), ...MORE, ...LINKS.slice(2)].map(([id, label]) => (
                <li key={id}><a href={`#${id}`} aria-current={active === id ? "true" : undefined} onClick={() => setOpen(false)}>{label}</a></li>
              ))}
              <li><button onClick={() => { setOpen(false); window.dispatchEvent(new Event("pip:palette")); }}>Jump somewhere…</button></li>
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}
