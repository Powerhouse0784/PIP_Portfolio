"use client";
import { useEffect, useRef, useState } from "react";

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // React Strict Mode runs effects twice in dev
    ran.current = true;
    let counted = false;
    try { counted = sessionStorage.getItem("pip-visit") === "1"; sessionStorage.setItem("pip-visit", "1"); } catch {}
    fetch("/api/visits", { method: counted ? "GET" : "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count?: number } | null) => d?.count != null && setCount(Number(d.count)))
      .catch(() => {});
  }, []);

  if (count === null) return null;
  return <p>Nursery visits: <strong>{count.toLocaleString()}</strong> (one per browsing session)</p>;
}
