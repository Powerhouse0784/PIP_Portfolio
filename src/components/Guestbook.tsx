"use client";
import { useEffect, useState, type FormEvent } from "react";

type Entry = { id: number; display_name: string; message: string; created_at: string };
type Status = "idle" | "sending" | "ok" | "error";

export default function Guestbook() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/guestbook")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { entries: Entry[] }) => setEntries(d.entries))
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
      const data = (await res.json()) as { entry?: Entry; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.entry) setEntries((cur) => [data.entry as Entry, ...(cur ?? [])]);
      form.reset();
      setStatus("ok");
      setMsg("Thank you! Pip tucked your note into the guestbook.");
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
              <li key={en.id}><b>{en.display_name}</b><span>{en.message}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
