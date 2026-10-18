"use client";
import { useEffect, useRef, useState } from "react";
import { say } from "@/lib/pipSay";

type Kind = "star" | "heart";
const KEY = "pip-reacts";
const read = (): string[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (v: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(v.slice(-400))); } catch {} };

/** A star and a heart for a guestbook note. One of each per visitor per note (checked on the server too). */
export default function Reactions({ id, name, stars = 0, hearts = 0 }: { id: number; name: string; stars?: number; hearts?: number }) {
  const [c, setC] = useState({ stars, hearts });
  const [mine, setMine] = useState<Kind[]>([]);
  const [msg, setMsg] = useState("");
  const busy = useRef(false);

  useEffect(() => setC({ stars, hearts }), [stars, hearts]);
  useEffect(() => { setMine(read().filter((k) => k.startsWith(`${id}:`)).map((k) => k.split(":")[1] as Kind)); }, [id]);

  const send = async (kind: Kind) => {
    if (busy.current || mine.includes(kind)) return;
    busy.current = true; setMsg("");
    const before = c;
    setC((x) => ({ ...x, [kind === "star" ? "stars" : "hearts"]: x[kind === "star" ? "stars" : "hearts"] + 1 }));
    setMine((m) => [...m, kind]);
    try {
      const res = await fetch("/api/guestbook/react", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind }) });
      const j = (await res.json().catch(() => ({}))) as { stars?: number; hearts?: number; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not send that just now.");
      setC({ stars: j.stars ?? before.stars + (kind === "star" ? 1 : 0), hearts: j.hearts ?? before.hearts + (kind === "heart" ? 1 : 0) });
      write([...read(), `${id}:${kind}`]);
      say(kind === "star" ? "A star for them! ✦" : "A heart! Aww.");
    } catch (e) {
      setC(before); setMine((m) => m.filter((k) => k !== kind));
      setMsg(e instanceof Error ? e.message : "Could not send that just now.");
    } finally { busy.current = false; }
  };

  return (
    <div className="reacts">
      <button type="button" className="react" aria-pressed={mine.includes("star")} onClick={() => void send("star")} aria-label={`Send a star to ${name}. ${c.stars} so far.`}>
        <span aria-hidden="true">✦</span> {c.stars}
      </button>
      <button type="button" className="react" aria-pressed={mine.includes("heart")} onClick={() => void send("heart")} aria-label={`Send a heart to ${name}. ${c.hearts} so far.`}>
        <span aria-hidden="true">♥</span> {c.hearts}
      </button>
      {msg && <span role="status" className="small err">{msg}</span>}
    </div>
  );
}
