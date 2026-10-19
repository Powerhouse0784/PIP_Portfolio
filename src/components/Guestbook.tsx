"use client";
import { useEffect, useState, type FormEvent } from "react";
import { say } from "@/lib/pipSay";
import { unlock } from "@/lib/progress";
import { feel, isFeel, type Feel } from "@/lib/feel";
import { dayPart, moonPhase } from "@/lib/sky";
import Reactions from "./Reactions";
import type { GbEntry } from "@/lib/guestbookTypes";

type Entry = GbEntry;
type Status = "idle" | "sending" | "ok" | "error";

const THANKS = (n: string) => [
  `Thank you, ${n}! I tucked your wish under my pillow.`,
  `${n}! That is going straight onto the nursery wall. *giggle*`,
  `Aww, ${n}. I read it twice and then a star read it too.`,
  `A wish from ${n}! I’ll hum it to the lanterns tonight.`,
];
const NAME_OK = /^[\p{L}][\p{L} '’-]{0,23}$/u;

/** Pip answers the note you just left, in his own voice (AI, with hand-written fallbacks). Not stored anywhere. */
async function pipReplyTo(name: string, message: string): Promise<{ text: string; mood: Feel }> {
  try {
    const ctx: Record<string, string> = { section: "guestbook", part: dayPart(), moon: moonPhase().name };
    if (NAME_OK.test(name.trim())) ctx.name = name.trim();
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: `I just left this wish in your guestbook: "${message.replace(/"/g, "'").slice(0, 200)}". Reply to my wish in one or two warm sentences.` }], ctx }),
    });
    const j = (await res.json().catch(() => ({}))) as { reply?: string; mood?: string };
    if (res.ok && j.reply) return { text: j.reply, mood: isFeel(j.mood) ? j.mood : "happy" };
  } catch { /* fall through to the hand-written lines */ }
  const lines = THANKS(name.trim() || "friend");
  return { text: lines[Math.floor(Math.random() * lines.length)], mood: "happy" };
}

export default function Guestbook() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");
  const [reply, setReply] = useState("");

  useEffect(() => {
    fetch("/api/guestbook")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { entries: Entry[]; unavailable?: boolean }) => { setEntries(d.entries); if (d.unavailable) setLoadError(true); })
      .catch(() => { setLoadError(true); setEntries([]); });
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus("sending");
    setMsg(""); setReply("");
    let res: Response;
    try {
      res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), message: fd.get("message"), website: fd.get("website") || undefined }),
      });
    } catch {
      setStatus("error"); setMsg("Pip couldn’t be reached. Check your connection and try again. Your note is still here.");
      return;
    }
    // A proxy or timeout can answer with plain text instead of JSON: never show a parser error to a visitor.
    const data = (await res.json().catch(() => ({}))) as { entry?: Entry; error?: string; pending?: boolean };
    if (!res.ok) {
      setStatus("error");
      setMsg(data.error ?? (res.status === 503 ? "The guestbook is sleeping right now. Please try again later." : "Something went wrong. Please try again."));
      return;
    }
    try {
      if (data.entry) {
        setEntries((cur) => [data.entry as Entry, ...(cur ?? [])]);
        window.dispatchEvent(new CustomEvent("pip:wish", { detail: data.entry })); // a new star floats up in the 3D wish wall
      }
      const sentName = String(fd.get("name") ?? ""), sentMsg = String(fd.get("message") ?? "");
      form.reset();
      unlock("guestbook");
      void pipReplyTo(sentName, sentMsg).then((r) => { setReply(r.text); feel(r.mood); });
      say(data.pending ? "A note! I’ll pin it up soon." : "A new note! Pinned it up.");
      setStatus("ok");
      setMsg(data.pending ? "Thank you! Pip will read your note and pin it up soon." : "Thank you! Pip tucked your note into the guestbook.");
    } catch {
      setStatus("error"); setMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <section id="guestbook">
      <div className="wrap">
        <p className="label">Leave a little note</p>
        <h2>Nursery guestbook</h2>
        <p className="small" style={{ marginBottom: 16 }}>Every kind note becomes a star in the <a href="#mobile3d">wish wall</a> of Pip’s 3D dream mobile. Send a star or a heart to the ones you like.</p>
        <div className="gb">
          <form onSubmit={submit} className="gform">
            <label htmlFor="gname">Your name</label>
            <input id="gname" name="name" maxLength={24} required autoComplete="nickname" />
            <label htmlFor="gmsg">A kind message</label>
            <textarea id="gmsg" name="message" maxLength={240} minLength={2} rows={4} required />
            <input className="sr" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <p className="small">Only your name and message are saved. Please don’t share personal details.</p>
            <button className="btn" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send to Pip"}</button>
            <p role="status" className={`small ${status === "error" ? "err" : ""}`}>{msg}</p>
            {reply && <p className="pipreply" role="status"><b>Pip says:</b> {reply}</p>}
          </form>
          <ul className="gl">
            {entries === null && <li>Loading notes…</li>}
            {entries?.length === 0 && <li>{loadError ? "The guestbook is sleeping right now. Try again later." : "No notes yet. Be the first!"}</li>}
            {entries?.map((en) => (
              <li key={en.id}><b>{en.display_name}</b><span>{en.message}</span><Reactions id={en.id} name={en.display_name} stars={en.stars} hearts={en.hearts} /></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
