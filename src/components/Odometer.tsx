"use client";
import { useEffect, useState } from "react";

/** Vintage rolling digits. Rolls from 0 to the value once mounted; reduced motion jumps straight there. */
export default function Odometer({ value, min = 4, label }: { value: number; min?: number; label: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(value)));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const digits = String(Math.max(0, Math.floor(value))).padStart(min, "0").split("");
  const cur = String(Math.max(0, Math.floor(shown))).padStart(digits.length, "0").split("");
  return (
    <span className="odo" role="img" aria-label={label}>
      {digits.map((_, i) => (
        <span className="od" key={i} aria-hidden="true">
          <span className="odc" style={{ ["--d" as string]: Number(cur[i] ?? 0), ["--i" as string]: i }}>
            {Array.from({ length: 10 }, (_, k) => <span key={k}>{k}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
}
