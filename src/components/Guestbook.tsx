"use client";
import { useEffect, useState, type FormEvent } from "react";
import { say } from "@/lib/pipSay";
import Reactions from "./Reactions";
import type { GbEntry } from "@/lib/guestbookTypes";

type Entry = GbEntry;
type Status = "idle" | "sending" | "ok" | "error";

export default function Guestbook() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

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
    setMsg("");
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), message: fd.get("message"), website: fd.get("website") || undefined }),
      });
      const data = (await res.json()) as { entry?: Entry; error?: string; pending?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.entry) {
        setEntries((cur) => [data.entry as Entry, ...(cur ?? [])]);
        window.dispatchEvent(new CustomEvent("pip:wish", { detail: data.entry })); // a new star floats up in the 3D wish wall
      }
      form.reset();
      say(data.pending ? "A note! I’ll pin it up soon." : "A new note! Pinned it up.");
      setStatus("ok");
      setMsg(data.pending ? "Thank you! Pip will read your note and pin it up soon." : "Thank you! Pip tucked your note into the guestbook.");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
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
