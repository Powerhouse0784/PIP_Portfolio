"use client";
import { useRef, useState } from "react";
import { unlock } from "@/lib/progress";

import DreamArt from "./DreamArt";
import { FEELINGS, recipe, type Dream, type Feeling } from "@/lib/dreamRecipes";

export default function DreamMaker() {
  const [name, setName] = useState("");
  const [feeling, setFeeling] = useState<Feeling>("cozy");
  const [dream, setDream] = useState<Dream | null>(null);
  const [shownFeeling, setShownFeeling] = useState<Feeling>("cozy");
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
    setShownFeeling(feeling);
    setDream(out ?? recipe(who, feeling));
    unlock("dream");
    lock.current = false; setBusy(false);
  };

  const share = async () => {
    if (!dream) return;
    const text = `${dream.title}\n\n${dream.text}`;
    try {
      if (navigator.share) await navigator.share({ title: dream.title, text });
      else { await navigator.clipboard.writeText(text); setNote("Copied! Share it with someone sleepy."); }
      unlock("share");
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
                <DreamArt className="dart-ticket" seed={`${dream.title}|${dream.text}`} feeling={shownFeeling} text={dream.text} />
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
