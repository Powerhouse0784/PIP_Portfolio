"use client";
import { useEffect, useRef, useState } from "react";
import MoonPhase from "./MoonPhase";
import { feelingForMoon, localDay, moonPhase, type Moon } from "@/lib/sky";
import { recipe, type Dream } from "@/lib/dreamRecipes";
import { shareDreamCard } from "@/lib/shareCard";
import { say } from "@/lib/pipSay";
import DreamArt from "./DreamArt";

type Saved = Dream & { day: string; moon: string; name: string };
const CARD = "pip-daily", NAMES = "pip-name", LOG = "pip-daily-log";

const get = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } };
const put = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/**
 * One dream per visitor per day, written by Pip's AI (or his recipe book when offline) around tonight's real moon.
 * The card is remembered in this browser until midnight, so a refresh never spends another one. Shareable as a picture.
 */
export default function DailyDream() {
  const [moon, setMoon] = useState<Moon | null>(null);
  const [card, setCard] = useState<Saved | null>(null);
  const [nights, setNights] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    setMoon(moonPhase());
    setName(get<string>(NAMES) ?? "");
    const saved = get<Saved>(CARD);
    if (saved && saved.day === localDay()) setCard(saved);
    setNights((get<string[]>(LOG) ?? []).length);
  }, []);

  const reveal = async () => {
    if (lock.current || !moon) return;
    lock.current = true; setBusy(true); setNote("");
    const who = name.trim().slice(0, 24) || "Little One";
    put(NAMES, name.trim().slice(0, 24));
    const day = localDay(), feeling = feelingForMoon(moon.name);
    let dream: Dream | null = null;
    try {
      const res = await fetch("/api/dream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: who, feeling, daily: true, moon: moon.name }),
      });
      const j = (await res.json().catch(() => ({}))) as { title?: string; text?: string; error?: string };
      if (res.ok && j.title && j.text) dream = { title: j.title, text: j.text, ai: true };
      else if (res.status === 429 && j.error) setNote(j.error);
    } catch { /* offline: recipe book */ }
    const out = dream ?? recipe(who, feeling, day);
    const saved: Saved = { ...out, day, moon: moon.name, name: who };
    put(CARD, saved);
    const log = Array.from(new Set([...(get<string[]>(LOG) ?? []), day])).slice(-400);
    put(LOG, log);
    setNights(log.length); setCard(saved);
    window.dispatchEvent(new Event("pip:delivered"));
    say("Your dream for tonight is ready!");
    lock.current = false; setBusy(false);
  };

  const share = async () => {
    if (!card || !moon) return;
    setBusy(true); setNote("");
    try {
      const d = new Date();
      const r = await shareDreamCard({
        dateLabel: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
        moonName: card.moon, phase: moon.phase, title: card.title, text: card.text, nights,
        art: { seed: `${card.title}|${card.text}`, feeling: feelingForMoon(card.moon), text: card.text },
        filename: `pip-dream-${card.day}.png`, shareText: `${card.title}: my dream card from Pip’s Dream Workshop ✦`,
      });
      if (r === "downloaded") { setNote("Saved as a picture. Sweet dreams!"); say("A keepsake! I’m blushing."); }
      else if (r === "shared") setNote("Shared. Pip is delighted.");
    } catch { setNote("Pip couldn’t draw the card this time. Try again?"); }
    setBusy(false);
  };

  return (
    <section id="daily">
      <div className="wrap">
        <p className="label">One a day · just for you</p>
        <h2>Tonight’s dream card</h2>
        <div className="daily">
          <div className="dcard" aria-live="polite">
            {moon && <MoonPhase phase={moon.phase} size={72} label={`${moon.name}, ${Math.round(moon.lit * 100)} percent lit`} />}
            {card ? (
              <>
                <p className="label">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} · {card.moon}</p>
                <DreamArt className="dart-daily" seed={`${card.title}|${card.text}`} feeling={feelingForMoon(card.moon)} text={card.text} />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <p className="small">{card.ai ? "Stitched tonight by Pip’s dream-writing AI." : "Made from Pip’s recipe book."} {nights > 1 ? `Night ${nights} of your dream diary.` : "The first page of your dream diary."}</p>
                <div className="gactions">
                  <button className="btn" onClick={() => void share()} disabled={busy}>{busy ? "Drawing…" : "Save or share as a picture ✦"}</button>
                </div>
                <p className="small">Come back tomorrow for a brand new dream.</p>
              </>
            ) : (
              <>
                <p className="label">{moon ? `${moon.name} tonight` : "Tonight"}</p>
                <p>Pip writes one dream a day for every visitor, shaped by the real moon above you. Tell him who is dreaming, then open tonight’s card.</p>
                <div className="gform">
                  <label htmlFor="dailyname">Who is dreaming? (optional)</label>
                  <input id="dailyname" value={name} maxLength={24} placeholder="A name, or a sleepy creature" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void reveal()} />
                  <button className="btn" onClick={() => void reveal()} disabled={busy || !moon}>{busy ? "Pip is stitching…" : "Open tonight’s dream ✦"}</button>
                </div>
              </>
            )}
            {note && <p className="small" role="status">{note}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
