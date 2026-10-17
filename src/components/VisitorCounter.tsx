"use client";
import { useEffect, useRef, useState } from "react";
import Odometer from "./Odometer";

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // React Strict Mode runs effects twice in dev
    ran.current = true;
    let counted = false;
    try { counted = sessionStorage.getItem("pip-visit") === "1"; } catch {}
    fetch("/api/visits", { method: counted ? "GET" : "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count?: number | null } | null) => {
        if (d?.count == null) return;
        setCount(Number(d.count));
        // Only remember the visit once it was really counted, so a failed POST is retried next load.
        if (!counted) { try { sessionStorage.setItem("pip-visit", "1"); } catch {} }
      })
      .catch(() => {});
  }, []);

  if (count === null) return null;
  return (
    <div className="visits">
      <span className="small">Nursery visitors</span>
      <Odometer value={count} label={`Nursery visits: ${count.toLocaleString()}`} />
      <span className="small">one per browsing session</span>
    </div>
  );
}
