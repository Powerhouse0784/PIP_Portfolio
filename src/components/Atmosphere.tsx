"use client";
import { useEffect, useRef } from "react";
import type { TintDetail, TintFinal } from "@/lib/tint";

declare global { interface Window { __pipTint?: TintFinal } }

/**
 * One soft, fixed colour wash behind the whole page. Lanterns set a sticky colour, the Lullaby Lab overrides it while a
 * lullaby plays (and pulses it in time with the notes). The resolved colour is also broadcast as "pip:tint-final" so the
 * 3D dream mobile can light itself the same way. With reduced motion the wash still tints, but never pulses.
 */
export default function Atmosphere() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const layers: Record<string, TintDetail | null> = { lantern: null, music: null };
    let beat = 0;

    const onTint = (e: Event) => {
      const d = (e as CustomEvent<TintDetail>).detail;
      layers[d.layer] = d.color ? d : null;
      const top = layers.music ?? layers.lantern;
      const final: TintFinal = { color: top?.color ?? null, hex: top?.hex ?? null };
      window.__pipTint = final;
      node.style.setProperty("--mood-c", final.color ?? "transparent");
      window.dispatchEvent(new CustomEvent<TintFinal>("pip:tint-final", { detail: final }));
    };
    const onNote = () => {
      if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
      node.classList.add("beat");
      clearTimeout(beat);
      beat = window.setTimeout(() => node.classList.remove("beat"), 140);
    };
    addEventListener("pip:tint", onTint);
    addEventListener("pip:note", onNote);
    return () => { removeEventListener("pip:tint", onTint); removeEventListener("pip:note", onNote); clearTimeout(beat); };
  }, []);

  return <div className="mood" ref={el} aria-hidden="true" />;
}
