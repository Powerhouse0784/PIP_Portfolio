"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** The story of the page as a night-sky rail: one star per chapter, the fill follows scroll progress (--sp from ScrollFX). */
const STOPS: [string, string][] = [
  ["about", "Meet Pip"], ["dream-corner", "Dream corner"], ["projects", "Projects"], ["mobile3d", "3D dream mobile"],
  ["daily", "Tonight’s dream"], ["dreammaker", "Make a dream"], ["story", "Origin story"], ["guestbook", "Guestbook"],
];

/** Sections above the target mount lazily and grow as the page scrolls, so a jump can land short. Re-aim a few times until the layout has settled. */
const settle = (id: string) => {
  for (const ms of [450, 1100, 2000]) {
    window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el && Math.abs(el.getBoundingClientRect().top) > 24) el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    }, ms);
  }
};

export default function ScrollRail() {
  const path = usePathname();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (path !== "/") return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const line = innerHeight * 0.4;
      let cur: string | null = null;
      for (const [id] of STOPS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) cur = id;
      }
      // At the very bottom the last chapter can never reach the trigger line, so it takes over there.
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 6) {
        const last = STOPS[STOPS.length - 1][0];
        if (document.getElementById(last)) cur = last;
      }
      setActive(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); };
  }, [path]);

  if (path !== "/") return null;
  return (
    <nav className="rail" aria-label="Page chapters">
      <ol>
        {STOPS.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} onClick={() => settle(id)} aria-label={label} aria-current={active === id ? "true" : undefined}>
              <span className="dot" aria-hidden="true" />
              <span className="tip" aria-hidden="true">{label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
