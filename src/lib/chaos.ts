/**
 * Responsive Chaos Mode: how the nursery should misbehave on a screen of w x h pixels.
 * Pure so it can be tested in Node. components/ChaosToggle.tsx applies it live as the window changes.
 */
export type Tier = "pocket" | "phone" | "tablet" | "laptop" | "desktop" | "cinema";

export type Chaos = {
  tier: Tier;
  /** Friendly name shown in the on-screen readout. */
  label: string;
  /** Card tilt in degrees. Bigger screens have more room to be silly. */
  tilt: number;
  /** Alternating vertical offset of cards, in px. */
  shift: number;
  /** Columns for the little facts grid. */
  cols: number;
  /** Border personality of the cards (dotted for pocket-sized, groove for cinema-sized). */
  border: "dotted" | "dashed" | "double" | "groove";
  /** Floating stickers on screen: scales with the area, so a phone isn't buried and a TV isn't empty. */
  stickers: number;
  portrait: boolean;
};

export const STICKER_POOL = 34;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function tierFor(width: number): Tier {
  return width < 360 ? "pocket" : width < 600 ? "phone" : width < 900 ? "tablet" : width < 1280 ? "laptop" : width < 1700 ? "desktop" : "cinema";
}

const BASE: Record<Tier, Pick<Chaos, "tilt" | "shift" | "cols" | "border">> = {
  pocket: { tilt: 1.2, shift: 5, cols: 1, border: "dotted" },
  phone: { tilt: 1.8, shift: 8, cols: 1, border: "dotted" },
  tablet: { tilt: 2.2, shift: 14, cols: 2, border: "dashed" },
  laptop: { tilt: 2.6, shift: 20, cols: 3, border: "dashed" },
  desktop: { tilt: 3, shift: 26, cols: 3, border: "double" },
  cinema: { tilt: 3.4, shift: 32, cols: 3, border: "groove" },
};

export function chaosFor(width: number, height: number): Chaos {
  const tier = tierFor(width);
  const label = { pocket: "pocket", phone: "phone", tablet: "tablet", laptop: "laptop", desktop: "desktop", cinema: "cinema" }[tier];
  return { tier, label, ...BASE[tier], stickers: clamp(Math.round((width * height) / 45000), 6, STICKER_POOL), portrait: height > width };
}

/** Fixed pool of sticker positions (percent of the viewport), so resizing moves nothing around randomly. */
export function stickerAt(i: number): { x: number; y: number; size: number; delay: number; glyph: string } {
  const r = (n: number) => { const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return v - Math.floor(v); };
  return { x: 3 + r(1) * 92, y: 8 + r(2) * 86, size: 0.9 + r(3) * 1.5, delay: -r(4) * 9, glyph: ["✦", "✧", "★", "♥", "☾", "✿", "✺"][Math.floor(r(5) * 7)] };
}
