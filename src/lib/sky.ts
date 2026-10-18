/**
 * Tonight's real sky, computed locally (no API): moon phase from the mean synodic month, plus Pip's
 * time-of-day greeting. The mean-month method is accurate to roughly half a day, which is plenty for a cozy widget.
 */
const SYNODIC = 29.530588861;
const NEW_MOON_JD = 2451550.26; // 6 Jan 2000, 18:14 UTC

export type Moon = {
  /** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter */
  phase: number;
  /** 0..1 lit fraction */
  lit: number;
  name: string;
  /** "Full moon tonight" / "Full moon in 4 days" / "New moon in 12 days" */
  next: string;
};

const jd = (d: Date) => d.getTime() / 86_400_000 + 2440587.5;

export function moonPhase(date: Date = new Date()): Moon {
  const p = (((jd(date) - NEW_MOON_JD) / SYNODIC) % 1 + 1) % 1;
  const lit = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const name =
    p < 0.0339 ? "New Moon" : p < 0.2161 ? "Waxing Crescent" : p < 0.2839 ? "First Quarter" : p < 0.4661 ? "Waxing Gibbous" :
    p < 0.5339 ? "Full Moon" : p < 0.7161 ? "Waning Gibbous" : p < 0.7839 ? "Last Quarter" : p < 0.9661 ? "Waning Crescent" : "New Moon";
  const toFull = (((0.5 - p) % 1 + 1) % 1) * SYNODIC;
  const toNew = (((1 - p) % 1 + 1) % 1) * SYNODIC;
  const [label, days] = toFull <= toNew ? ["Full moon", toFull] : ["New moon", toNew];
  const n = Math.round(days);
  const next = days < 0.75 || n === 0 ? `${label} tonight` : `${label} in ${n} day${n === 1 ? "" : "s"}`;
  return { phase: p, lit, name, next };
}

/** SVG path for the lit part of the moon in a circle of radius r centred at (cx, cy). Northern-hemisphere view. */
export function litPath(phase: number, r: number, cx = 0, cy = 0): string {
  const k = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  if (k < 0.004) return "";
  if (k > 0.996) return `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx} ${cy + r}A${r} ${r} 0 1 1 ${cx} ${cy - r}Z`;
  const rx = r * Math.abs(1 - 2 * k);
  const waxing = phase < 0.5;
  const gibbous = k > 0.5;
  // limb: right semicircle when waxing, left when waning
  const limbSweep = waxing ? 1 : 0;
  // terminator: bulges away from the lit limb for gibbous, toward it for crescents
  const termSweep = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1);
  const [y0, y1] = waxing ? [cy - r, cy + r] : [cy - r, cy + r];
  return `M${cx} ${y0}A${r} ${r} 0 0 ${limbSweep} ${cx} ${y1}A${rx.toFixed(3)} ${r} 0 0 ${termSweep} ${cx} ${y0}Z`;
}

export type Part = "morning" | "afternoon" | "evening" | "night";
export function dayPart(date: Date = new Date()): Part {
  const h = date.getHours();
  return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 21 ? "evening" : "night";
}

const GREETINGS: Record<Part, string> = {
  morning: "Good morning, sleepyhead! *yawn* Pip has been up since moonset.",
  afternoon: "Good afternoon! Nap o’clock is getting closer.",
  evening: "Good evening! The lanterns are warming up.",
  night: "It’s the Midnight Nursery hour. Perfect for dreams.",
};
export const greeting = (date: Date = new Date()) => GREETINGS[dayPart(date)];

/** A gentle default feeling for the daily dream, from the moon. */
export function feelingForMoon(name: string): "cozy" | "brave" | "floaty" | "giggly" {
  if (/Waxing/.test(name)) return "brave";
  if (/Full|Gibbous/.test(name)) return "floaty";
  if (/Quarter/.test(name)) return "giggly";
  return "cozy";
}

/** Local calendar day, e.g. 2026-10-18. */
export const localDay = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
