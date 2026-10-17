"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts children only when the placeholder is within `margin` of the viewport.
 * The placeholder keeps its id and a min-height, so #anchors, scroll-spy and the command palette still land correctly,
 * and below-the-fold toys stay out of the initial hydration work.
 */
export default function LazyMount({ children, minHeight = 480, id, margin = "700px" }: { children: ReactNode; minHeight?: number; id?: string; margin?: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setShow(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setShow(true); io.disconnect(); } }, { rootMargin: `${margin} 0px` });
    io.observe(el);
    // Deep links (#toys) and the command palette: mount as soon as the hash targets this block.
    const onHash = () => { if (id && location.hash === `#${id}`) setShow(true); };
    onHash(); addEventListener("hashchange", onHash);
    return () => { io.disconnect(); removeEventListener("hashchange", onHash); };
  }, [id, margin]);

  if (show) return <>{children}</>;
  return <div ref={ref} id={id} style={{ minHeight }} aria-hidden="true" />;
}
