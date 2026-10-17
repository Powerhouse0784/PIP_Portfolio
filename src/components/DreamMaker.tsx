"use client";
import { useRef, useState } from "react";

const FEELINGS = {
  cozy: { label: "Cozy", adj: "snuggly", places: ["a blanket fort built from warm clouds", "a tiny cabin where the fireplace hums"], gift: "a cup of warm moonmilk", end: "wrapped up as snug as a sleeping kitten" },
  brave: { label: "Brave", adj: "bold", places: ["the tallest rooftop in Midnight Nursery", "a bridge made of rainbows"], gift: "a lantern that never goes out", end: "standing tall, with nothing left to fear" },
  floaty: { label: "Floaty", adj: "drifting", places: ["a cloud that drifts above the sleepy sea", "a sky full of slow, kind balloons"], gift: "a pair of feather-light slippers", end: "floating gently toward the morning" },
  giggly: { label: "Giggly", adj: "giggly", places: ["a meadow where the flowers tell jokes", "a playground made entirely of pillows"], gift: "a jar of sparkling giggles", end: "giggling softly in their sleep" },
} as const;
type Feeling = keyof typeof FEELINGS;
type Dream = { title: string; text: string; ai: boolean };

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

/** Pip's recipe book: always works, even offline or with no API key. */
function recipe(name: string, f: Feeling): Dream {
  const d = FEELINGS[f];
  return {
    ai: false,
    title: `${name}’s ${d.adj} dream`,
    text: `Tonight, ${name} drifts away to ${pick(d.places)}. A tiny star waves hello and hands over ${d.gift}. By the time the moon gives a big yawn, ${name} is ${d.end}. Sweet dreams. — Pip ✦`,
  };
}

export default function DreamMaker() {
  const [name, setName] = useState("");
  const [feeling, setFeeling] = useState<Feeling>("cozy");
  const [dream, setDream] = useState<Dream | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const generate = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNote("");
    const who = name.trim().slice(0, 24) || "Little One";
    let out: Dream | null = null;
    try {
      const res = await fetch("/api/dream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: who, feeling }),
      });
      const j = (await res.json().catch(() => ({}))) as { title?: string; text?: string; error?: string };
      if (res.ok && j.title && j.text) out = { title: j.title, text: j.text, ai: true };
      else if (res.status === 429 && j.error) setNote(j.error);
    } catch { /* offline: use the recipe book */ }
    setDream(out ?? recipe(who, feeling));
    lock.current = false; setBusy(false);
  };

  const share = async () => {
    if (!dream) return;
    const text = `${dream.title}\n\n${dream.text}`;
    try {
      if (navigator.share) await navigator.share({ title: dream.title, text });
      else { await navigator.clipboard.writeText(text); setNote("Copied! Share it with someone sleepy."); }
    } catch { setNote("Couldn’t share just now. Try selecting the text."); }
  };

  return (
    <section id="dreammaker">
      <div className="wrap">
        <p className="label">Pip’s special order</p>
        <h2>Make a dream, just for you</h2>
        <div className="dm">
          <div className="gform">
            <label htmlFor="dname">Who is dreaming tonight?</label>
            <input id="dname" value={name} maxLength={24} placeholder="A name, or a sleepy creature" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void generate()} />
            <div className="chips" role="group" aria-label="How should the dream feel?">
              {(Object.keys(FEELINGS) as Feeling[]).map((k) => (
                <button key={k} className="chip" aria-pressed={feeling === k} onClick={() => setFeeling(k)}>{FEELINGS[k].label}</button>
              ))}
            </div>
            <button className="btn" onClick={() => void generate()} disabled={busy}>{busy ? "Pip is stitching…" : dream ? "Dream another one ✦" : "Build my dream ✦"}</button>
          </div>
          <div className="ticket" aria-live="polite">
            {dream ? (
              <>
                <p className="label">Dream order · delivered</p>
                <h3>{dream.title}</h3>
                <p>{dream.text}</p>
                <p className="small">{dream.ai ? "Freshly stitched by Pip’s dream-writing AI." : "Made from Pip’s recipe book."}</p>
                <button className="chip" onClick={share}>Share this dream</button>
                {note && <p className="small">{note}</p>}
              </>
            ) : (
              <p className="small">Tell Pip who is dreaming and how it should feel. He’ll build one just for them.{note ? ` ${note}` : ""}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
