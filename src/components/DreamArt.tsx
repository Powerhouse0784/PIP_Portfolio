"use client";
import { useMemo } from "react";
import { dreamArtSrc, type ArtFeel } from "@/lib/dreamArt";

/** A little night scene painted from the dream itself (same dream, same picture). Decorative: the words carry the meaning. */
export default function DreamArt({ seed, feeling, text, className = "" }: { seed: string; feeling: ArtFeel; text?: string; className?: string }) {
  const src = useMemo(() => dreamArtSrc(seed, feeling, text), [seed, feeling, text]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`dart ${className}`} src={src} alt="" width={400} height={300} draggable={false} />;
}
