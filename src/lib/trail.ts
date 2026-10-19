/**
 * Sparkle cursor trail: the particle maths, kept pure so it can be tested in Node.
 * The canvas drawing lives in components/SparkleTrail.tsx.
 */
export type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; rot: number; vr: number; color: string; kind: 0 | 1 | 2 };

export const MAX_SPARKS = 90;
export const PALETTE_DAY = ["#f2b84b", "#e56b9b", "#b58ae6", "#ff9e7a"];
export const PALETTE_NIGHT = ["#ffe6a8", "#f19abb", "#c9b2ff", "#fff1c4"];

/** How many sparks a pointer move of `distance` px releases. Slow drifts stay quiet; fast sweeps shower. */
export function sparksFor(distance: number, density = 1): number {
  if (distance < 5) return 0;
  return Math.min(5, Math.max(1, Math.round((1 + distance / 30) * density)));
}

/** Points along a move, at most `gap` px apart (and at most 10 of them), so a fast flick leaves no holes. */
export function interpolate(x0: number, y0: number, x1: number, y1: number, gap = 18): [number, number][] {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.min(10, Math.max(1, Math.ceil(d / gap)));
  return Array.from({ length: n }, (_, i) => [x0 + ((x1 - x0) * (i + 1)) / n, y0 + ((y1 - y0) * (i + 1)) / n]);
}

export function spawn(x: number, y: number, count: number, palette: readonly string[], rand: () => number = Math.random): Spark[] {
  return Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2, sp = 12 + rand() * 38;
    const roll = rand();
    return {
      x: x + (rand() - 0.5) * 6, y: y + (rand() - 0.5) * 6,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, // a little upward drift: they float, they don't fall
      age: 0, life: 0.55 + rand() * 0.6, size: 3 + rand() * 6, rot: rand() * Math.PI, vr: (rand() - 0.5) * 5,
      color: palette[Math.floor(rand() * palette.length)],
      kind: roll < 0.62 ? 0 : roll < 0.85 ? 1 : 2, // star, bubble, glitter dot
    };
  });
}

/** Advance every spark by dt seconds and drop the finished ones, in place. */
export function step(list: Spark[], dt: number): void {
  let w = 0;
  for (const s of list) {
    s.age += dt;
    if (s.age >= s.life) continue;
    s.x += s.vx * dt; s.y += s.vy * dt; s.vy -= 6 * dt; s.vx *= 1 - 1.4 * dt; s.rot += s.vr * dt;
    list[w++] = s;
  }
  list.length = w;
}

/** 1 -> 0 over a spark's life, easing out. */
export const fade = (s: Spark) => Math.max(0, 1 - s.age / s.life) ** 1.4;
