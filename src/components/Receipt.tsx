"use client";
import { useEffect } from "react";
import type { R } from "@/lib/receipt";

/** The "dream delivery receipt" that appears after a project interaction. Each new receipt counts as a delivery. */
export default function Receipt({ r }: { r: R | null }) {
  const n = r?.n;
  useEffect(() => { if (n) window.dispatchEvent(new Event("pip:delivered")); }, [n]);
  if (!r) return null;
  return (
    <div className="receipt" key={r.n}>
      🧾 Dream delivery receipt #{String(r.n).padStart(3, "0")}
      <br />
      {r.text}
      <br />
      Signed, Pip ✦
    </div>
  );
}
