import { litPath } from "@/lib/sky";

/** The real moon for a given phase (0..1), drawn as SVG. Always on its own dark disc so it reads in day and night themes. */
export default function MoonPhase({ phase, size = 64, label }: { phase: number; size?: number; label?: string }) {
  const r = 20;
  const d = litPath(phase, r, 24, 24);
  return (
    <svg className="moonphase" width={size} height={size} viewBox="0 0 48 48" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <circle cx="24" cy="24" r="23" fill="#1d1730" stroke="rgba(255,226,160,.35)" />
      <circle cx="24" cy="24" r={r} fill="#3a2f55" />
      {d && <path d={d} fill="#f6d98a" style={{ filter: "drop-shadow(0 0 3px rgba(246,217,138,.8))" }} />}
    </svg>
  );
}
