"use client";
import { useEffect, useRef } from "react";

/** Hero art that leans slightly toward the pointer. Fine pointers only, never with reduced motion. */
export default function TiltImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches || !matchMedia("(pointer:fine)").matches) return;
    const move = (e: PointerEvent) => ref.current?.style.setProperty("--tilt", `${(e.clientX / innerWidth - 0.5) * 4}deg`);
    addEventListener("pointermove", move, { passive: true });
    return () => removeEventListener("pointermove", move);
  }, []);
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} width={620} height={931} />;
}
