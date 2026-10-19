"use client";
import { useEffect, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { say } from "@/lib/pipSay";

type Card = { id: string; tier: 1 | 2 | 3; icon: string; title: string; text: string; cta: string; sticker?: string; run: () => void };

const reduced = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
const go = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
const press = (sel: string) => () => document.querySelector<HTMLElement>(sel)?.click();
const openChat = () => { const b = document.querySelector<HTMLButtonElement>(".chat-fab"); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); };

const CARDS: Card[] = [
  // Tier 1
  { id: "eyes", tier: 1, icon: "👀", title: "Pip watches you", text: "Move your pointer and his eyes follow. Poke him!", cta: "Say hi", sticker: "giggle", run: go("top") },
  { id: "daynight", tier: 1, icon: "🌗", title: "Day and night mood", text: "Flip the theme. At night Pip falls asleep.", cta: "Switch it", sticker: "night", run: press('[data-act="theme"]') },
  { id: "story", tier: 1, icon: "📜", title: "A story that scrolls", text: "Scenes advance as you scroll, from falling star to first delivery.", cta: "Read it", run: go("story") },
  { id: "egg", tier: 1, icon: "✨", title: "A shy hidden star", text: "A shy star hides near Pip and moves daily. Poke it five times.", cta: "Hint me", sticker: "egg", run: () => { go("top")(); say("Look around my picture for a tiny shy star. Poke it five times!"); } },
  // Tier 2
  { id: "lullaby", tier: 2, icon: "🎵", title: "Lullaby Lab", text: "Pick a mood, press play. Sound is opt-in; ♪ mutes it.", cta: "Play one", sticker: "lullaby", run: go("projects") },
  { id: "flashlight", tier: 2, icon: "🔦", title: "Nightlight flashlight", text: "Shine a light to uncover hidden dream layers.", cta: "Grab the light", sticker: "darkroom", run: go("darkroom") },
  { id: "route", tier: 2, icon: "🏠", title: "Dream Delivery map", text: "A star glides the rooftop route as you scroll.", cta: "Follow it", sticker: "route", run: go("routes") },
  { id: "storybook", tier: 2, icon: "📖", title: "Page-turn storybook", text: "Flip pages by swipe, buttons or arrow keys.", cta: "Open the book", sticker: "storybook", run: go("storybook") },
  { id: "toys", tier: 2, icon: "🧱", title: "Block tower and rattle", text: "Stack blocks till the tower wobbles. Shake the rattle.", cta: "Play", sticker: "tower", run: go("toys") },
  { id: "catcher", tier: 2, icon: "⭐", title: "Catch the falling dreams", text: "Catch stars; hearts are worth triple.", cta: "Start catching", sticker: "catcher", run: go("catcher") },
  // Tier 3
  { id: "pip3d", tier: 3, icon: "🧊", title: "Pip in real 3D", text: "A real WebGL Pip: drag, poke, wave, tuck him in.", cta: "Meet 3D Pip", sticker: "pip3d", run: go("pip3d") },
  { id: "mobile3d", tier: 3, icon: "🔔", title: "The 3D dream mobile", text: "Nine stars ring a scale; guestbook wishes float in.", cta: "Ring a star", sticker: "mobile3d", run: go("mobile3d") },
  { id: "guestbook", tier: 3, icon: "✍️", title: "Live dream guestbook", text: "Leave a wish on a real backend. Star or heart others’.", cta: "Leave a wish", sticker: "guestbook", run: go("guestbook") },
  { id: "memory", tier: 3, icon: "🧠", title: "Pip remembers you", text: "He counts your visits and keeps your streak, in your browser only.", cta: "See my stickers", run: () => window.dispatchEvent(new Event("pip:stickers")) },
  { id: "chat", tier: 3, icon: "💬", title: "Chat or talk to Pip", text: "Chat or talk to Pip: AI, with a rule-based fallback.", cta: "Open the chat", sticker: "chat", run: openChat },
];

const TIERS: { n: 1 | 2 | 3; tag: string; title: string; sub: string }[] = [
  { n: 1, tag: "Baseline", title: "Meet Pip", sub: "The complete portfolio: a character that reacts to you." },
  { n: 2, tag: "Hard", title: "Play in the workshop", sub: "Memorable things to touch, hear and play with." },
  { n: 3, tag: "Boss", title: "Go deeper", sub: "3D, a live guestbook, memory and a character that talks back." },
];

const KEY = "pip-tour-v1";

/**
 * "Everything Pip can do": every feature of the site in one visible place, grouped by tier, each with a Try-it button.
 * A card shows a check once you have done it (from your sticker book, or from pressing its button).
 */
export default function FeatureTour() {
  const p = useProgress();
  const [clicked, setClicked] = useState<string[]>([]);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); if (Array.isArray(v)) setClicked(v.filter((x) => typeof x === "string")); } catch {} }, []);

  const done = (c: Card) => (c.sticker ? Boolean(p.stickers[c.sticker]) : clicked.includes(c.id));
  const total = CARDS.length, n = CARDS.filter(done).length;
  const press_ = (c: Card) => {
    c.run();
    if (!c.sticker && !clicked.includes(c.id)) {
      const next = [...clicked, c.id]; setClicked(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    }
  };

  return (
    <section id="tour" aria-labelledby="tour-h">
      <div className="wrap">
        <p className="label">Try everything</p>
        <h2 id="tour-h">Everything Pip can do</h2>
        <p className="lede tour-lede">Fifteen things to touch, hear, play with and talk to. Press any button to jump straight to it. A ✓ means you’ve tried it.</p>
        <div className="tour-prog" role="progressbar" aria-label="Features tried" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n}>
          <i style={{ width: `${(n / total) * 100}%` }} /><span>{n} of {total} tried</span>
        </div>
        {TIERS.map((t) => (
          <div key={t.n} className={`tour-tier t${t.n}`}>
            <div className="tour-head"><span className="tour-tag">Tier {t.n} · {t.tag}</span><h3>{t.title}</h3><p className="small">{t.sub}</p></div>
            <ul className="tour-grid">
              {CARDS.filter((c) => c.tier === t.n).map((c) => (
                <li key={c.id} className={`tcard${done(c) ? " done" : ""}`}>
                  <span className="ticon" aria-hidden="true">{c.icon}</span>
                  <div>
                    <h4>{c.title}{done(c) && <span className="tick"> ✓<span className="sr"> tried</span></span>}</h4>
                    <p>{c.text}</p>
                  </div>
                  <button className="chip" onClick={() => press_(c)}>{c.cta} →</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="small tour-foot">Tip: press <kbd>/</kbd> any time for the Jump menu, or open the ★ sticker book to see everything you’ve found.</p>
      </div>
    </section>
  );
}
