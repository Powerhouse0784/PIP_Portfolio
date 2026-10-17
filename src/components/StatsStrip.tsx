"use client";
import { useEffect, useRef, useState } from "react";

const BASE = 1248;
const KEY = "pip-delivered-extra";

const Star = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.5 2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.5 6 20.9l1.3-6.7-5-4.7 6.8-.8z" /></svg>;
const Heart = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-8-5.3-8-11a4.7 4.7 0 0 1 8-3.3A4.7 4.7 0 0 1 20 10c0 5.7-8 11-8 11Z" /></svg>;
const Moon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></svg>;

function useCount(target: number, start: boolean) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!start) return;
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) { setV(target); from.current = target; return; }
    const a = from.current, t0 = performance.now(), dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(a + (target - a) * e));
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start]);
  return v;
}

/** Pip's nursery stats. "Dreams delivered" grows every time you collect a dream delivery receipt (kept in this browser only). */
export default function StatsStrip() {
  const ref = useRef<HTMLDListElement>(null);
  const [seen, setSeen] = useState(false);
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    try { setExtra(Number(localStorage.getItem(KEY)) || 0); } catch {}
    const onDelivered = () => setExtra((n) => { const m = n + 1; try { localStorage.setItem(KEY, String(m)); } catch {} return m; });
    addEventListener("pip:delivered", onDelivered);
    return () => removeEventListener("pip:delivered", onDelivered);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const delivered = useCount(BASE + extra, seen);
  const creatures = useCount(982, seen);

  return (
    <dl className="stats" ref={ref}>
      <div className="stat"><i><Star /></i><div><dt>Dreams delivered</dt><dd>{delivered.toLocaleString()}+</dd></div></div>
      <div className="stat"><i><Heart /></i><div><dt>Happy creatures</dt><dd>{creatures.toLocaleString()}+</dd></div></div>
      <div className="stat"><i><Moon /></i><div><dt>Nights of magic</dt><dd><span className="sr">infinite</span><span aria-hidden="true">∞</span></dd></div></div>
    </dl>
  );
}
