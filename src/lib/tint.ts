/**
 * Mood-reactive scenery. Anything can tint the whole page: lanterns set a sticky "lantern" colour, the Lullaby Lab
 * sets a "music" colour while it plays (music wins). <Atmosphere /> resolves the layers and paints one soft wash;
 * the 3D dream mobile listens to the resolved colour too.
 */
export type TintLayer = "lantern" | "music";
export type TintDetail = { layer: TintLayer; color: string | null; hex: number | null };
export type TintFinal = { color: string | null; hex: number | null };

export const TINTS = {
  amber: { color: "rgba(255,190,100,.30)", hex: 0xffb85a },
  rose: { color: "rgba(255,130,165,.28)", hex: 0xff82a5 },
  moonlight: { color: "rgba(140,165,255,.28)", hex: 0x8ca5ff },
  sleepy: { color: "rgba(176,140,255,.28)", hex: 0xb08cff },
  brave: { color: "rgba(255,196,80,.30)", hex: 0xffc450 },
  cloudy: { color: "rgba(120,170,255,.28)", hex: 0x78aaff },
} as const;
export type TintName = keyof typeof TINTS;

export const tint = (layer: TintLayer, name: TintName | null) => {
  if (typeof window === "undefined") return;
  const t = name ? TINTS[name] : null;
  window.dispatchEvent(new CustomEvent<TintDetail>("pip:tint", { detail: { layer, color: t?.color ?? null, hex: t?.hex ?? null } }));
};

/** A lullaby note, so the page and the 3D scene can pulse in time. f = frequency in Hz, i = index in the melody. */
export type NoteDetail = { i: number; f: number; mood: string };
export const noteEvent = (d: NoteDetail) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<NoteDetail>("pip:note", { detail: d }));
};
