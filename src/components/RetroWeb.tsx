"use client";
import { useState } from "react";
import { unlock } from "@/lib/progress";
import { say } from "@/lib/pipSay";

/** Real pages from the haX.baby event, so every ring link goes somewhere real. */
const RING = [
  { name: "haX.baby home", href: "https://hax.baby/" },
  { name: "Baby’s First Website: event hub", href: "https://hax.baby/first-website" },
  { name: "The official brief", href: "https://hax.baby/baby-problem" },
] as const;

/** 88x31 badges, the classic size. Pure CSS pixels: no images to load, no tracking. */
const BADGES: { top: string; bottom: string; tone: string; href?: string }[] = [
  { top: "MADE WITH", bottom: "MOONLIGHT", tone: "b1" },
  { top: "POWERED BY", bottom: "LULLABIES", tone: "b2" },
  { top: "PIP", bottom: "APPROVED ✓", tone: "b3" },
  { top: "0% SCARY", bottom: "100% COZY", tone: "b4" },
  { top: "NO", bottom: "COOKIES", tone: "b5" },
  { top: "BEST IN", bottom: "DREAMLAND", tone: "b6" },
  { top: "HAX.BABY", bottom: "TRACK 1", tone: "b7", href: "https://hax.baby/first-website" },
  { top: "ANY", bottom: "BROWSER OK", tone: "b8" },
];

/**
 * The early-web footer: an "under construction" banner, a wall of 88x31 badges and a tiny webring.
 */
export default function RetroWeb() {
  const [at, setAt] = useState(0);
  const [rnd, setRnd] = useState(1); // the "random" link's target is fixed per render so its href matches what a click records
  const hop = (to: number) => {
    setAt(to);
    setRnd((to + 1 + Math.floor(Math.random() * (RING.length - 1))) % RING.length);
    unlock("webring");
    say("Webring! Remember those? Pip loves them.");
  };
  const prev = (at + RING.length - 1) % RING.length;
  const next = (at + 1) % RING.length;

  return (
    <div className="retro">
      <p className="uc" role="note"><span aria-hidden="true">🚧</span> This corner of the nursery is still being stitched. Please excuse the mess. <span aria-hidden="true">🚧</span></p>

      <ul className="b88" aria-label="Web badges">
        {BADGES.map((b) => (
          <li key={b.bottom}>
            {b.href ? (
              <a className={`b ${b.tone}`} href={b.href} target="_blank" rel="noopener noreferrer" aria-label={`${b.top} ${b.bottom}: opens the haX.baby event page in a new tab`}>
                <i>{b.top}</i><b>{b.bottom}</b>
              </a>
            ) : (
              <span className={`b ${b.tone}`} role="img" aria-label={`${b.top} ${b.bottom}`}><i>{b.top}</i><b>{b.bottom}</b></span>
            )}
          </li>
        ))}
      </ul>

      <nav className="ring" aria-label="Baby webring">
        <p>✦ the haX.baby baby webring ✦</p>
        <div>
          <a href={RING[prev].href} target="_blank" rel="noopener noreferrer" onClick={() => hop(prev)} aria-label={`Previous ring site: ${RING[prev].name} (opens in a new tab)`}>← prev</a>
          <a href={RING[rnd].href} target="_blank" rel="noopener noreferrer" onClick={() => hop(rnd)} aria-label="Random ring site (opens in a new tab)">random</a>
          <a href={RING[next].href} target="_blank" rel="noopener noreferrer" onClick={() => hop(next)} aria-label={`Next ring site: ${RING[next].name} (opens in a new tab)`}>next →</a>
        </div>
        <p className="small">site {at + 1} of {RING.length}: {RING[at].name}</p>
      </nav>
    </div>
  );
}
