"use client";
import { useEffect, useState } from "react";

/** Draws the visitor's real weather over the nursery (CSS only, no flashing). Switched on by SkyWeather; hidden for reduced motion. */
export default function WeatherFX() {
  const [kind, setKind] = useState<string | null>(null);
  useEffect(() => {
    const h = (e: Event) => setKind(((e as CustomEvent).detail as string | null) ?? null);
    addEventListener("pip:weather", h);
    return () => removeEventListener("pip:weather", h);
  }, []);
  if (!kind || !["drizzle", "rain", "snow", "storm", "fog"].includes(kind)) return null;
  return <div className={`wx wx-${kind}`} data-weather={kind} aria-hidden="true" />;
}
